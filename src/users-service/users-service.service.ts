import { BadRequestException, Body, Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/UserSchema';
import { Code, CodeDocument } from 'src/CodeSchema';
import { TestingUser, TestingUserDocument } from 'src/TestingUserSchema';
import { EnterCode, EnterCodeDocument } from 'src/EnterCodeSchema';
import { SocketGateway } from 'src/socket-getaway';
import EmailAndTrueParamEmail from 'src/emailInterface';
import { MailerService } from '@nestjs-modules/mailer';
import { NewUserDto } from 'src/NewUserDto';
import { CreateUser } from 'src/CreateUser';
import { specialSymbols, lowercaseLetters } from 'src/PassSymbols';
import * as argon2 from 'argon2';
import * as sharp from 'sharp';
import { JwtService } from '@nestjs/jwt';
import * as CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { emailAndMessIdAndTrueParamEmail } from 'src/messIdInter';
import { Video, VideoDocument } from 'src/VideoSchema';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as archiver from 'archiver';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PhotoHigh, PhotoHighDocument } from 'src/PhotoHighSchema';
import { Ava, AvaDocument } from 'src/AvaSchema';
import EncryptMess from 'src/MessEncryptInterface';
import { PlanMess, PlanMessDocument } from 'src/PlanMessSchema';
import { NewTestingUser, NewTestingUserDocument, NewTestingUserSchema } from 'src/NewTestingUserShema';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { REDIS_CLIENT } from '../redis.module'
import Redis from 'ioredis';
import { Photo, PhotoDocument } from 'src/PhotoSchema';
import { PhotosService } from 'src/photos/photos.service';
import { Chat, ChatDocument } from 'src/ChatSchema';

@Injectable()
export class UsersServiceService {

    private bucket: GridFSBucket;

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, @InjectConnection() private readonly connection: Connection, private readonly socketGateway: SocketGateway, private readonly mailerService: MailerService, @InjectModel(Code.name) private codeModel: Model<CodeDocument>, @InjectModel(EnterCode.name) private enterCodeModel: Model<EnterCodeDocument>, private jwtService: JwtService, @InjectModel(TestingUser.name) private readonly refreshTokensModel: Model<TestingUserDocument>, @InjectModel(Video.name) private VideoModel: Model<VideoDocument>, @InjectModel(PhotoHigh.name) private photoHighModel: Model<PhotoHighDocument>, @InjectModel(Ava.name) private avaModel: Model<AvaDocument>, @InjectModel(PlanMess.name) private PlanMessModel: Model<PlanMessDocument>, @InjectModel(NewTestingUser.name) private readonly newTestingUserModel: Model<NewTestingUserDocument>, @InjectQueue('test-queue') private testQueue: Queue, @Inject(REDIS_CLIENT) private redis: Redis, @InjectModel(NewTestingUser.name) private readonly testUserModel: Model<NewTestingUserDocument>, @InjectModel(Photo.name) private photoModel: Model<PhotoDocument>, @Inject(forwardRef(() => PhotosService)) private readonly photoService: PhotosService, @InjectModel(Chat.name) private chatModel: Model<ChatDocument>) {}
    
    onModuleInit() {
        if (!this.connection.db) {
            throw new Error('MongoDB database connection is not established');
        }
        
        this.bucket = new GridFSBucket(this.connection.db, {
            bucketName: 'photosss',
        });
    }

    async deleteChatUser(user: any, deleteId: string[]) {
        let chatsUserNew: string[] = []
        for (let chat of user.messages) {
            if (!deleteId.includes(chat)) {
                chatsUserNew = [...chatsUserNew, chat]
            }
        }
        return chatsUserNew
    }

    async chatFindEmail(email: string, trueParamEmail: string) {
        let findChat = await this.chatModel.aggregate([
            {$addFields: {
                isUsersChat: {
                    $and: [
                        { $in: [email, "$users"] },
                        { $in: [trueParamEmail, "$users"] }
                    ]
                }
            }},
            {$match: {'isUsersChat': true}},
            {$project: {isUsersChat: 0}},
        ])
        return findChat
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async handleEvery30Seconds() {
        const date = new Date(); 
        const day = date.getDate()
        const month = String(date.getMonth() + 1).padStart(2, '0'); 
        const result = `${day}.${month}`;
        const allActiveSockets = await this.socketGateway.getAllActiveSockets()
        const allUsers = await this.getAllUsers()
        const inactiveSockets = allUsers.filter(el => !allActiveSockets.includes(el.socket)).map(el => el.socket)
        for (let inactiveSocket of inactiveSockets) {
            await this.userModel.findOneAndUpdate({socket: inactiveSocket}, {onlineStatus: {status: result, plat: ''}})
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async checkPlanMess() {
        const allPlanMess = await this.PlanMessModel.find().lean()
        for (let planMessage of allPlanMess) {
            const date = new Date()
            const nowTime = date.getTime()
            if (nowTime >= planMessage.time) {
                const findChat = await this.chatFindEmail(planMessage.sender, planMessage.targetUser)
                const resultChat = findChat[0]
                if (resultChat) {
                    const newMessage = [...resultChat.message, planMessage.message]
                    const messCountFriend = resultChat.messCount.map(el => {
                        if (el.user === planMessage.targetUser) {
                            return {
                                user: el.user,
                                countMess: el.countMess + 1,
                            }
                        } else {
                            return el
                        }
                    })
                    await this.chatModel.findOneAndUpdate({id: resultChat.id}, {messages: newMessage, messCount: messCountFriend}, {new: true})
                }
                const findUser = await this.userModel.findOne({email: planMessage.targetUser})
                if (findUser) {
                    const userSockets = findUser.socket
                    for (let socket of userSockets) {
                        if (typeof planMessage.message.text === 'string') {
                            this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: planMessage.sender, text: planMessage.message.text, photos: planMessage.message.photos, id: planMessage.message, ans: planMessage.message.ans, socketId: '', typeMess: planMessage.message.typeMess, per: planMessage.message.per, pin: false}})
                        } else {
                            const userMessage = planMessage.message.text.find(el => el.user === planMessage.targetUser)
                            if (userMessage) {
                                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: planMessage.sender, text: userMessage.message, photos: planMessage.message.photos, id: planMessage.message, ans: planMessage.message.ans, socketId: '', typeMess: planMessage.message.typeMess, per: planMessage.message.per, pin: false}})
                            }
                        }
                    }
                    await this.PlanMessModel.findOneAndDelete({id: planMessage.id})
                }
            }
        }
    }

    async getVideo(videoMessId: string): Promise<{buffer: Buffer, filename: string}> {
        const gridfsFile = await this.bucket
        .find({ 'metadata.id': videoMessId})
        .next();
        if (!gridfsFile) {
            throw new Error('Video not found in GridFS');
        }
        return new Promise((resolve, reject) => {
            const gridfsId = gridfsFile._id;
            const fileStream = this.bucket.openDownloadStream(gridfsId);
            const chunks: Buffer[] = [];
            fileStream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });
            fileStream.on('error', (error) => {
                reject(new Error(`Stream error: ${error.message}`));
            });
            fileStream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({filename: gridfsFile.filename, buffer: buffer});
            });
        });
    }

    async saveVideoFile(buffer: Buffer, messText: string, videoId: string) {
        new Promise((resolve, reject) => {
            const uploadStream = this.bucket.openUploadStream(messText, {
                metadata: {
                  id: videoId,
                },
            });
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        readableStream
          .pipe(uploadStream)
          .on('error', reject)
          .on('finish', () => {
            resolve(uploadStream.id);
          });
        });
    }

    pinMessage(user: any, messId: string, pin: boolean, email: string) {
        const newChats = user?.messages.map(el => {
            if (el.user === email) {
                const newMess = el.messages.map(element => {
                    if (element.id === messId) {
                        return {
                            ...element,
                            pin: pin,
                        }
                    } else {
                        return element
                    }
                })
                return {
                    ...el,
                    messages: newMess,
                }
            } else {
                return el
            }
        })
        return newChats 
    }

    isBufferPhoto(photo: any): photo is { buffer: any } {
        return photo && typeof photo === 'object' && 'buffer' in photo;
    }

    async generateTokens(email: string) {
        const refreshToken = uuidv4()
        const resultRefreshToken = await argon2.hash(refreshToken)
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            const token = this.jwtService.sign({email: email, version: findUser.versionToken})
            const date = new Date()
            const time = date.getTime()
            const newRefreshToken = new this.refreshTokensModel({token: resultRefreshToken, email: email, timeStamp: time})
            await newRefreshToken.save()
            return {
                accessToken: token,
                refreshToken: refreshToken,
            }
        } else {
            return {
                accesToken : '',
                refreshToken: '',
            }
        }
    }

    async addUser(email: string, publicKeys: string[], name: string, plat: string, pass?: string) {
        if (pass) {
            const myUser = new this.userModel({
                email: email,
                password: pass,
                name: name,    
                subscribes: 0,
                notifs: [],
                socket: '',
                visits: [],
                reports: [],
                avatar: '',
                open: true,
                permUsers: [],
                messages: [],
                permMess: 'Все',
                birthday: '',
                savePosts: [],
                peerId: '',
                botMess: [],
                onlineStatus: {status: 'Online', plat: plat},
                publicKeys: publicKeys,
                versionToken: 1,
                userNotifs: [],
                keyWords: [],
            })
            await myUser.save()
        } else {
            const myUser = new this.userModel({
                email: email,
                name: name,    
                subscribes: 0,
                notifs: [],
                socket: '',
                visits: [],
                reports: [],
                avatar: '',
                open: true,
                permUsers: [],
                messages: [],
                permMess: 'Все',
                birthday: '',
                savePosts: [],
                peerId: '',
                botMess: [],
                onlineStatus: {status: 'Online', plat: plat},
                publicKeys: publicKeys,
                versionToken: 1,
            })
            await myUser.save() 
        }
    }
    
    async enter(body: {login: string, password: string, mobile?: string}, response: any) {
        const findUser = await this.userModel.findOne({email: body.login.trim()})
        if (findUser && findUser.password) {
            const checkPass = await argon2.verify(findUser.password, body.password.trim())
            if (checkPass === true) {
                const tokens = await this.generateTokens(body.login)
                if (!body.mobile) {
                    response.cookie('accessToken', tokens.accessToken, {
                        httpOnly: true,
                        sameSite: 'strict',
                        maxAge: 60 * 60 * 1000, 
                    });
                    return {
                        refreshToken: tokens.refreshToken,
                    }
                } else {
                    return {
                        access: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                    }
                }
            } else {
                throw new BadRequestException()
            }
        } else {
            throw new BadRequestException()
        }
    }

    async checkFindUser(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser !== null) {
            return 'OK'
        } else {
            return 'undefined'
        }
    } 

    async getSubs(email: string) {
        const findThisUser = await this.userModel.findOne({email: email})
        const subsAndCountryData = {
            subscribes: findThisUser?.subscribes,
        }
        return subsAndCountryData
    }

    async unSub(body: {targetEmail: string, resultEmail: string}) {
        const arrFromEmail = body.targetEmail.split('')
        const newArrFromEmail = arrFromEmail.map(el => {
            if (el === '%') {
                return '@'
            } else if (el === '4') {
                return ''
            } else if (el === '0') {
                return ''
            } else {
                return el
            }
        })
        const resultArr = newArrFromEmail.filter(el => el !== '')
        const resultEmail = resultArr.join('')
        const findUser = await this.userModel.findOne({email: body.resultEmail})
        if (findUser) {
            const findTargetUser = await this.userModel.findOne({email: resultEmail})
            const targetSubs = findTargetUser?.subscribes
            if (targetSubs) {
                const filteredSubs = targetSubs.filter((el: string) => el !== findUser.email)
                await this.userModel.findOneAndUpdate({email: resultEmail}, {subscribes: filteredSubs}, {new: true})
            }
        }
    }   

    async sub(body: {targetEmail: string, resultEmail: string}) {
        const arrFromEmail = body.targetEmail.split('')
        const newArrFromEmail = arrFromEmail.map(el => {
            if (el === '%') {
                return '@'
            } else if (el === '4') {
                return ''
            } else if (el === '0') {
                return ''
            } else {
                return el
            }
        })
        const resultArr = newArrFromEmail.filter(el => el !== '')
        const resultEmail = resultArr.join('')
        const findUser = await this.userModel.findOne({email: body.resultEmail})
        if (findUser) {
            const findTargetUser = await this.userModel.findOne({email: resultEmail})
            const targetSubs = findTargetUser?.subscribes
            if (targetSubs) {
                const newSubList = [...targetSubs, findUser.email]
                await this.userModel.findOneAndUpdate({email: resultEmail}, {subscribes: newSubList}, {new: true})
            }
        }
    }

    async addSocket(body: {email: string, socketId: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const allActiveSockets = await this.socketGateway.getAllActiveSockets()
        if (findUser) {
            const userSockets = findUser.socket.map(socket => {
                if (!allActiveSockets.includes(socket)) {
                    return false
                } else {
                    return socket
                }
            })
            const resultUserSockets = [...userSockets.filter(el => el !== false), body.socketId]
            await this.userModel.findOneAndUpdate({email: body.email}, {socket: resultUserSockets}, {new: true})
        }
    }

    async clearSocket(body: {email: string}) {
        await this.userModel.findOneAndUpdate({email: body.email}, {socket: ''}, {new: true})
    }

    async getNotifs(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser?.notifs.length === 0) {
            return []
        } else {
            return findUser?.notifs
        }
    }

    async newNotif(body: {resultEmail: string, userEmail: string, photoId?: string, type: string}) {
        const findUser = await this.userModel.findOne({email: body.userEmail})
        const currentNotifs = findUser?.notifs || [];
        let resultNotifs: any = []
        if (body.type === 'photo') {
            resultNotifs = [...currentNotifs, {type: 'photo', user: body.resultEmail, photoId: body.photoId}]
        } else if (body.type === 'comment') {
            resultNotifs = [...currentNotifs, {type: body.type, user: body.resultEmail, photoId: body.photoId}]
        } else {
            resultNotifs = [...currentNotifs, {type: body.type, user: body.resultEmail}]
        }
        await this.userModel.findOneAndUpdate({email: body.userEmail}, {notifs: resultNotifs}, {new: true})
        const userSockets = findUser?.socket
        if (userSockets) {
            for (let socket of userSockets) {
                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'notif', typeNotif: body.type, user: body.resultEmail}})
            }
        }
    }

    async clearNotifs(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        const userNotifs = findUser?.notifs
        if (userNotifs) {
            const resultNotifs = userNotifs.filter(el => el.type === 'perm')
            await this.userModel.findOneAndUpdate({email: email}, {notifs: resultNotifs}, {new: true})
            return resultNotifs
        }
    }

    async getBannedUsers(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.usersBan
    }

    async addBannedUser(body: {userEmail: string, email: string}) {
        const findUser = await this.userModel.findOne({code: body.email})
        if (findUser?.usersBan !== undefined) {
            const resultBannedList = [...findUser.usersBan, body.userEmail]
            await this.userModel.findOneAndUpdate({code: body.email}, {usersBan: resultBannedList}, {new: true})
        }
    }

    async updateVisits(body: {email: string, targetEmail: string}) {
        const findUser = await this.userModel.findOne({email: body.targetEmail})
        const findMe = await this.userModel.findOne({email: body.email})
        if (findUser && findMe) {
            const newVisits = [...findUser.visits, findMe.email]
            await this.userModel.findOneAndUpdate({email: body.targetEmail}, {visits: newVisits}, {new: true})
            return 'OK'
        }
    }

    async checkReport(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.reports
    }

    async newReport(body: {targetEmail: string, email: string}) {
        const findUser = await this.userModel.findOne({email: body.targetEmail})
        if (findUser?.reports) {
            const resultReports = [...findUser.reports, body.email]
            await this.userModel.findOneAndUpdate({email: body.targetEmail}, {reports: resultReports}, {new: true})
        }
    }

    async checkDelete(email: string) {
        const findUser = await this.userModel.findOne({code: email})
        if (findUser) {
            return 'find'
        } else {
            return 'undefined'
        }
    }

    async addVideo(body: {email: string, video: string}) {
        await this.userModel.findOneAndUpdate({email: body.email}, {video: body.video}, {new: true})
    }

    async getName(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.name
    }

    async getAva(email: string) {
        const findAva = await this.avaModel.findOne({email: email})
        if (findAva) {
            return findAva.avatar
        } else {
            return ''
        }
    }

    async newAvatar(body: {targetEmail: string, newAva: string}) {
        const findAva = await this.avaModel.findOne({email: body.targetEmail}) 
        if (findAva) {
            await this.avaModel.findOneAndUpdate({email: body.targetEmail}, {avatar: body.newAva}, {new: true})
            await this.userModel.findOneAndUpdate({email: body.targetEmail}, {avatar: ''}, {new: true})
        } else {
            const ava = new this.avaModel({email: body.targetEmail, avatar: body.newAva})
            await ava.save()
        }
    }

    async getAllUsers() {
        const resultUsers = await this.userModel.aggregate([
            {$project: {messages: 0, password: 0, botMess: 0, _id: 0}},
            {$lookup: {
                from: 'avas',
                localField: 'email',
                foreignField: 'email',
                as: 'resultAva',
            }},
            {$addFields: {
                avatar: {
                    $ifNull: [
                        {$arrayElemAt: ['$resultAva.avatar', 0]},
                        '',
                    ]
                }
            }},
            {$project: {resultAva: 0}},
        ])
        return resultUsers
    }

    async checkOpen(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.open
    }

    async closeAcc(email: string) {
        await this.userModel.findOneAndUpdate({email: email}, {open: false}, {new: true})
        return 'OK'
    }

    async openAcc(email: string) {
        await this.userModel.findOneAndUpdate({email: email}, {open: true}, {new: true})
        return 'OK'
    }

    async checkPerm(body: {trueParamEmail: string, email: string}) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        const permUsers = findUser?.permUsers
        if (permUsers) {
            if (permUsers.includes(body.email) || findUser.open === true) {
                return 'OK'
            } else {
                const notifs = findUser.notifs
                const onlyPerms = notifs.filter(el => el.type === 'perm')
                console.log(onlyPerms)
                console.log(body.email)
                const findThisUser = onlyPerms.find(el => el.user === body.email)
                if (findThisUser === undefined) {
                    return 'unsend'
                } else {
                    return 'send'
                }
            }
        }
    }

    async newPermUser(body: {newUserEmail: string, email: string}) {
        const findMe = await this.userModel.findOne({email: body.email})
        if (findMe?.permUsers) {
            const resultPermArr = [...findMe.permUsers, body.newUserEmail]
            await this.userModel.findOneAndUpdate({email: body.email}, {permUsers: resultPermArr}, {new: true})
        }
    }

    async deletePerm(body: {user: string, email: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const userNotifs = findUser?.notifs
        if (userNotifs) {
            const resultNotifs = userNotifs.map(el => {
                if (el.type === 'perm' && el.user === body.user) {
                    return false
                } else {
                    return el
                }
            })
            const result = resultNotifs.filter(el => el !== false)
            await this.userModel.findOneAndUpdate({email: body.email}, {notifs: result}, {new: true})
            return result
        }
    }

    async getCloseUsers() {
        const allCloseUsers = await this.userModel.find({open: false})
        const onlyCloseEmail = allCloseUsers.map(el => el.email)
        return onlyCloseEmail
    }

    async getUserData(email: string) {
        const findUser = await this.userModel.findOne({email: email}, {code: 0, messages: 0, password: 0}).lean()
        if (findUser) {
            const userAvatar = await this.avaModel.findOne({email: findUser.email})
            if (userAvatar) {
                const resultUser = {...findUser, avatar: userAvatar.avatar}
                return resultUser
            } else {
                return findUser
            }
        } else {
            return false
        }
    }

    async getChats(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            const userChats = await this.chatModel.aggregate([
                {$addFields: 
                    {
                        isChatUser: {
                            $in: ["$id", findUser.messages],
                        }
                    }
                },
                {$match: {isChatUser: true}},
                {$project: {isChatUser: 0}},
            ])
            let resultChats: any = []
            for (let chat of userChats) {
                const friendEmail = chat.users.filter(el => el !== email)[0]
                const userChat = await this.userModel.findOne({email: friendEmail})
                if (userChat) {
                    const findPinStatus = chat.pin.find(el => el.user === email)
                    const findMessCount = chat.messCount.find(el => el.user === email)
                    const findMessNotifs = chat.notifs.find(el => el.user === email)
                    const resultMessages = chat.messages.map(el => {
                        if (el.typeMess === 'text') {
                            const findMyMessText = el.text.find(element => element.user === email)
                                return {
                                    ...el,
                                    text: findMyMessText.message,
                                }
                        } else {
                            return {
                                ...el,
                                text: el.text,
                            }
                        }
                    })
                    resultChats = [...resultChats, {...chat, messages: resultMessages, onlineStatus: userChat.onlineStatus, user: friendEmail, pin: findPinStatus.pin, messCount: findMessCount.countMess, notifs: findMessNotifs.notifs}]
                }
            }
            let resultChatsUser: any[] = []
            resultChats = resultChats.reverse()
            for (let item of resultChats) {
                const findThisUserChat = resultChatsUser.find(el => el.user === item.user)
                if (!findThisUserChat) {
                    resultChatsUser = [...resultChatsUser, item]
                }
            }
            resultChatsUser = resultChatsUser.reverse()
            return resultChatsUser
        }
    }

    async getMess(body: EmailAndTrueParamEmail) {
        let findChat: any = await this.chatFindEmail(body.email, body.trueParamEmail)
        const findUser = await this.userModel.findOne({email: body.email})
        let chatsUser: any[] = []
        if (findUser) {
            for (let item of findChat) {
                if (findUser.messages.includes(item.id)) {
                    chatsUser = [...chatsUser, item]
                }
            }
        }
        let resultChat: any = ''
        if (chatsUser.length > 1) {
            const resultMessages = [...chatsUser[0], chatsUser[1]]
            resultChat = {
                ...chatsUser[0],
                messages: resultMessages,
            }
        } else {
            resultChat = chatsUser[0]
        }
        if (resultChat) {
            const resultMessages = resultChat.messages.map(el => {
                let resultText: any = ''
                if (process.env.ENCRYPTION_KEY && el.text !== '') {
                    if ((el.typeMess === 'video' && typeof el.text === 'string') || (el.typeMess === 'voice' && typeof el.text === 'string')) {
                        resultText = el.text
                    } else {
                        resultText = el.text
                    }
                } else {
                    resultText = ''
                }
                if (el.typeMess === 'text') {
                    const findUserMess = el.text.find(element => element.user === body.email)
                    return {
                        ...el,
                        text: findUserMess.message,
                    }
                } else {
                    return {
                        ...el,
                        text: el.text,
                    }
                }
            })
            findChat = {
                ...findChat[0],
                messages: resultMessages,
            }
            if (findChat === undefined) {
                return []
            } else {
                const resultMessages = await Promise.all(findChat.messages.map(async message => {
                    if (message.photos.length !== 0) {
                        if (message.typeMess === 'text') {
                            let resultText: any = ''
                            if (process.env.ENCRYPTION_KEY) {
                                resultText = message.text
                            }
                            return {
                                ...message,
                                text: message.text,
                            }
                        } else {
                            return {...message, photos: []}
                        }
                    } else {
                        return message
                    }
                }))
                return resultMessages
            }
        } else {
            return []
        }
    }

    async newMess(resultData: {user: string, text: EncryptMess[] | string, date: string, id: string, ans: string, per: string, type: string, email: string, trueParamEmail: string, origUser: string, origId: string, origChatId: string, files: any, videoId?: string, myText?: EncryptMess[], dateSend?: string, hour?: string, minute?: string, previewVideo?: string}) {
        const findFriend = await this.userModel.findOne({email: resultData.trueParamEmail})
        const findMe = await this.userModel.findOne({email: resultData.email})
        const videoId: string = uuidv4()
        let previewId: string = uuidv4()
        let resultFiles: any[] = []
        if (resultData.per !== '') {
            const findOrigChat = await this.chatModel.findOne({id: resultData.origChatId})
            if (findOrigChat) {
                const findMess = findOrigChat.messages.find(el => el.id === resultData.origId)
                if (findMess) {
                    if (findMess.typeMess !== 'video') {
                        if (findMess.typeMess === 'text') {
                            const resultPhotoFiles = await Promise.all(
                                findMess.photos.map(async(el) => {
                                    const findHighPhoto = await this.photoHighModel.findOne({id: el.id})
                                    if (findHighPhoto) {
                                        const photoHighId = uuidv4()
                                        const photoHigh = new this.photoHighModel({photo: findHighPhoto.photo, id: photoHighId})
                                        await photoHigh.save()
                                        return {
                                            base64: el.base64,
                                            id: photoHighId,
                                        }
                                    }
                                })
                            )
                            resultFiles = resultPhotoFiles
                        } else {
                            resultFiles = findMess.photos
                        }
                    } else if (findMess.typeMess === 'video' && typeof findMess.text ==='string') {
                        const resultVideo = await this.getVideo(findMess.text) 
                        await this.saveVideoFile(resultVideo.buffer, resultVideo.filename, videoId)
                    }
                }
            }
        } else {
            if (resultData.type !== 'video') {
                if (resultData.type === 'file') {
                    resultFiles = resultData.files.map(el => el.buffer)
                } else if (resultData.type === 'text') {
                    const resultPhotoFiles = await Promise.all(
                        resultData.files.map(async(el) => {
                            const resultBuffer = await sharp(el.buffer)
                            .resize(200, 200)
                            .jpeg({quality: 70})
                            .toBuffer()
                            const base64 = `data:image/jpeg;base64,${resultBuffer.toString('base64')}`
                            const photoHighId = uuidv4()
                            const photoHigh = new this.photoHighModel({id: photoHighId, photo: el.buffer})
                            await photoHigh.save()
                            return {
                                base64: base64,
                                id: photoHighId,
                            }
                        })
                    );
                    resultFiles = resultPhotoFiles
                }
            }
        }
        if (resultData.type === 'video' && typeof resultData.text === 'string' && resultData.per === '') {
            if (resultData.per === '') {
                if (resultData.videoId) {
                    await this.saveVideoFile(resultData.files[0].buffer, resultData.text, resultData.videoId)
                }
            } else {
                const getThisVideo = await this.getVideo(resultData.text)
                await this.saveVideoFile(getThisVideo.buffer, getThisVideo.filename, videoId)
            }
        }
        const findChat = await this.chatFindEmail(resultData.email, resultData.trueParamEmail)
        let resultChat: any = ''
        if (findMe && findFriend) {
            resultChat = findChat.find(el => findMe.messages.includes(el.id) && findFriend.messages.includes(el.id))
        }
        console.log(resultChat)
        let resultMessage: any = ''
        if (resultChat) {
            if (resultData.type !== 'video' && resultData.type !== 'voice') {
                resultMessage = [...resultChat.messages, {user: resultData.user, text: [{user: resultData.trueParamEmail, message: resultData.text}, {user: resultData.email, message: resultData.myText}], date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]
            } else if (resultData.type === 'video') {
                if (resultData.videoId && resultData.per === '') {
                    if (resultData.email !== resultData.trueParamEmail) {
                        resultMessage = [...resultChat.messages, {user: resultData.user, text: resultData.videoId, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]
                    } else {
                        resultMessage = [...resultChat.messages, {user: resultData.user, text: resultData.videoId, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]
                    }
                } else {
                    if (resultData.email !== resultData.trueParamEmail) {
                        resultMessage = [...resultChat.messages, {user: resultData.user, text: videoId, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]
                    } else {
                        resultMessage = [...resultChat.messages, {user: resultData.user, text: videoId, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]                            
                    }
                }
            } else if (resultData.type === 'voice') {
                resultMessage = [...resultChat.messages, {user: resultData.user, text: resultData.text, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]
            }
            if (resultData.email !== resultData.trueParamEmail) {
                if (!resultData.dateSend && !resultData.hour && !resultData.minute) {
                    const messCountFriend = resultChat.messCount.map(el => {
                        if (el.user === resultData.trueParamEmail) {
                            return {
                                user: el.user,
                                countMess: el.countMess + 1,
                            }
                        } else {
                            return el
                        }
                    })
                    await this.chatModel.findOneAndUpdate({id: resultChat.id}, {messages: resultMessage, messCount: messCountFriend}, {new: true})
                }
            }
        } else {
            if (findFriend) {
                const date = new Date(); 
                const day = date.getDate().toString().padStart(2, '0'); 
                const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
                const year = date.getFullYear().toString().slice(-2);
                const formattedDate = `${day}.${month}.${year}`
                const id = date.getTime().toString()
                const newFriendChats = [...findFriend.messages, {user: resultData.email, messages: [{user: resultData.email, text: resultData.text, photos: resultData.files, date: formattedDate, id: id, ans: '', edit: false, typeMess: resultData.type, per: '', pin: false}], messCount: 1, pin: false, notifs: true}]
                await this.userModel.findOneAndUpdate({email: resultData.trueParamEmail}, {messages: newFriendChats}, {new: true})
            }
        }
        let resultPhotos: any = []
        if (resultData.type === 'text') {
            resultPhotos = resultFiles
        } 
        if (findFriend?.socket) {
            if (findFriend?.socket !== undefined && resultData.email !== resultData.trueParamEmail && !resultData.dateSend && !resultData.hour && !resultData.minute) {
                if (resultData.type === 'video') {
                    if (resultData.videoId) {
                        for (let socket of findFriend.socket) {
                            this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: findMe?.email, text: resultData.videoId, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                        }
                    } else {
                        for (let socket of findFriend.socket) {
                            this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: findMe?.email, text: videoId, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                        }
                    }
                } else {
                    for (let socket of findFriend.socket) {
                        this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: findMe?.email, text: resultData.text, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                    }
                }
            }
        }
        return {
            status: 'OK',
            photos: resultFiles,
        }
    }

    async newChat(resultData: {user: string, text: EncryptMess[] | string, date: string, id: string, ans: string, per: string, type: string, email: string, trueParamEmail: string, origUser: string, origId: string, files: Express.Multer.File[], videoId?: string, myText?: EncryptMess[]}) {
        const findFriend = await this.userModel.findOne({email: resultData.trueParamEmail})
        const findMe = await this.userModel.findOne({email: resultData.email})
        const videoId: string = uuidv4()
        let resultFiles: any[] = []
            if (resultData.type !== 'video') {
                if (resultData.type === 'file') {
                    resultFiles = resultData.files.map(el => el.buffer)
                } else if (resultData.type === 'text') {
                    const resultPhotoFiles = await Promise.all(
                        resultData.files.map(async(el) => {
                            const resultBuffer = await sharp(el.buffer)
                            .resize(200, 200)
                            .jpeg({quality: 70})
                            .toBuffer()
                            const base64 = `data:image/jpeg;base64,${resultBuffer.toString('base64')}`
                            const photoHighId = uuidv4()
                            const photoHigh = new this.photoHighModel({id: photoHighId, photo: el.buffer})
                            await photoHigh.save()
                            return {
                                base64: base64,
                                id: photoHighId,
                            }
                        })
                    );
                    resultFiles = resultPhotoFiles
                }
            }
        if (resultData.type === 'video' && typeof resultData.text === 'string') {
            if (resultData.per === '') {
                if (resultData.videoId) {
                    await this.saveVideoFile(resultData.files[0].buffer, resultData.text, resultData.videoId)
                }
            } else {
                const getThisVideo = await this.getVideo(resultData.text)
                await this.saveVideoFile(getThisVideo.buffer, getThisVideo.filename, videoId)
            }
        }
        let messNew: any = []
        if (findFriend && findMe) {
            if (resultData.type !== 'video') {
                messNew = [{user: resultData.user, text: [{user: resultData.trueParamEmail, message: resultData.text}, {user: resultData.email, message: resultData.myText}], date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]
            } else {
                if (resultData.videoId) {
                    messNew = [{user: resultData.user, text: resultData.videoId, date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]
                } else {
                    messNew = [{user: resultData.user, text: videoId, date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}]
                }
            }
        }
        const chatId = uuidv4()
        const chat = new this.chatModel({id: chatId, users: [resultData.user, resultData.trueParamEmail], messages: messNew, messCount: [{user: resultData.user, countMess: 0}, {user: resultData.trueParamEmail, countMess: 1}], notifs: [{user: resultData.email, notifs: true}, {user: resultData.trueParamEmail, notifs: true}], pin: [{user: resultData.email, pin: false}, {user: resultData.trueParamEmail, pin: false}]})
        await chat.save()
        if (findMe && findFriend) {
            const myChatsNew = [...findMe.messages, chatId]
            const userChatsNew = [...findFriend.messages, chatId]
            await this.userModel.findOneAndUpdate({email: resultData.user}, {messages: myChatsNew}, {new: true})
            await this.userModel.findOneAndUpdate({email: resultData.trueParamEmail}, {messages: userChatsNew}, {new: true})
        }
        let resultPhotos: any = []
        if (resultData.type === 'text') {
            resultPhotos = resultFiles
        } 
        if (findFriend?.socket) {
            if (findFriend?.socket !== undefined && resultData.email !== resultData.trueParamEmail) {
                if (resultData.type === 'video') {
                    if (resultData.videoId) {
                        for (let socket of findFriend.socket) {
                            this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: findMe?.email, text: resultData.videoId, photos: resultPhotos, id: resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                        }
                    } else {
                        for (let socket of findFriend.socket) {
                            this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: findMe?.email, text: videoId, photos: resultPhotos, id: resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                        }
                    }
                } else {
                    for (let socket of findFriend.socket) {
                        this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: findMe?.email, text: resultData.text, photos: resultPhotos, id: resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                    }
                }
            }
        }
        return {
            status: 'OK',
            photos: resultFiles,
        }
    }   

    async zeroMess(body: EmailAndTrueParamEmail) {
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        const resultChat = findChat[0]
        if (resultChat) {
            const messCountNew = resultChat.messCount.map(el => {
                if (el.user === body.email) {
                    return {
                        user: el.user,
                        countMess: 0,
                    }
                } else {
                    return el
                }
            })
            const chatId = resultChat.id
            await this.chatModel.findOneAndUpdate({id: chatId}, {messCount: messCountNew}, {new: true})
        }
    }

    async typingUser(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        const findSocket = findUser?.socket
        if (findSocket) {
            for (let socket of findSocket) {
                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'typing', user: body.email, text: '', photos: []}})
            }
        }
    }

    async getBanMess(trueParamEmail: string) {
        const findUser = await this.userModel.findOne({email: trueParamEmail})
        return findUser?.banMess
    }

    async getMyBanMess(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.banMess
    }
    
    async banUser(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.email})
        const prevBanUsers = findUser?.banMess
        if (prevBanUsers && body.email !== body.trueParamEmail) {
            if (body.banStatus === true) {
                await this.userModel.findOneAndUpdate({email: body.email}, {banMess: [...prevBanUsers, body.trueParamEmail]}, {new: true})
            } else {
                const filteredUsersBan = prevBanUsers.filter(el => el !== body.trueParamEmail)
                await this.userModel.findOneAndUpdate({email: body.email}, {banMess: filteredUsersBan}, {new: true})
            }
        }
    }

    async deleteMess(body: {email: string, trueParamEmail: string, messId: string[], unreadCount: number}) {
        let newMess: any = []
        let deleteVideoId: string[] = []
        let deletePhotoId: any[] = []
        const findMe = await this.userModel.findOne({email: body.email})
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        let resultChat: any = ''
        for (let item of findChat) {
            const findMess = item.messages.find(el => el.id === body.messId[0])
            if (findMess) {
                resultChat = item
                break
            }
        }
        if (resultChat) {
            newMess = resultChat.messages.filter(el => el.id !== body.messId[0])
            await this.chatModel.findOneAndUpdate({id: resultChat.id}, {messages: newMess}, {new: true})
        }
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})

        console.log('PhotoId: ')
        console.log(deletePhotoId)

        if (deletePhotoId.length !== 0) {
            for (let item of deletePhotoId) {
                await this.photoHighModel.findOneAndDelete({id: item})
            }
        }

        if (findFriend?.socket !== undefined) {
            console.log('MessId: ')
            console.log(body.messId)
            for (let socket of findFriend.socket) {
                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'delete', user: body.email, text: '', photos: [], id: body.messId, ans: '', readStatus: body.unreadCount}})
            }
        }

        if (newMess.length === 0) {
            if (resultChat) {
                const newMyChats = findMe?.messages.filter(el => el !== resultChat.id)
                const newFriendChats = findFriend?.messages.filter(el => el !== resultChat.id)
                await this.userModel.findOneAndUpdate({email: body.email}, {messages: newMyChats}, {new: true})
                await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newFriendChats}, {new: true})
                await this.chatModel.findOneAndDelete({id: resultChat.id})
            }
        }

        if (deleteVideoId.length !== 0) {
            for (let item of deleteVideoId) {
                const gridfsFile = await this.bucket
                    .find({ 'metadata.id': item })
                    .next();

                if (gridfsFile) {
                    await this.bucket.delete(gridfsFile._id);
                }
            }
        }
        
        return 'OK'
    }

    async messCount(body: EmailAndTrueParamEmail) {
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        const resultChat = findChat[0]
        if (resultChat) {
            return resultChat.messCount.find(el => el.user === body.email).countMess
        } else {
            return 0
        }
    }

    async editMess(body: {email: string, trueParamEmail: string, editMess: string, inputMess: string, per: string, text: EncryptMess[], myText: EncryptMess[]}) {
        const findMe = await this.userModel.findOne({email: body.email})
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        const resultChat = findChat[0]
        if (resultChat) {
            const messNew = resultChat.messages.map(el => {
                if (body.editMess === el.id) {
                    return {
                        ...el,
                        text: [{user: body.email, message: body.myText}, {user: body.trueParamEmail, message: body.text}],
                        edit: true,
                    }
                } else {
                    return el
                }
            })
            await this.chatModel.findOneAndUpdate({id: resultChat.id}, {messages: messNew}, {new: true})
        }
        if (findFriend?.socket && findMe) {
            const findNewMe = await this.userModel.findOne({email: body.email})
            if (findNewMe) {
                if (findFriend.socket) {
                    const userMess = await this.getMess({email: body.trueParamEmail, trueParamEmail: body.email})
                    for (let socket of findFriend.socket) {
                        this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'editMess', user: findMe.email, text: '', photos: [], mess: userMess}})
                    }
                }
            }
        }
    }

    async getPerm(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.permMess
    }

    async newMessPerm(body: {email: string, changePerm: string}) {
        await this.userModel.findOneAndUpdate({email: body.email}, {permMess: body.changePerm}, {new: true})
    }

    async getPermData(body: EmailAndTrueParamEmail) {
        const findMe = await this.userModel.findOne({email: body.email})
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        return {
            mySubs: findMe?.subscribes,
            friendSubs: findFriend?.subscribes,
            friendPermMess: findFriend?.permMess,
        }
    }

    async startVoice(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        const userSocket = findUser?.socket
        if (userSocket) {
            for (let socket of userSocket) {
                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'startVoice', user: body.email, text: '', photos: [], mess: []}})
            }
        }
    }

    async stopVoice(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        const userSocket = findUser?.socket
        if (userSocket) {
            for (let socket of userSocket) {
                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'stopVoice', user: body.email, text: '', photos: [], mess: []}})
            }
        }
    }

    async pinChat(body: {user: string, pin: boolean, email: string}) {
        const findFriend = await this.userModel.findOne({email: body.user})
        const findMe = await this.userModel.findOne({email: body.email})
        const findChat = await this.chatFindEmail(body.email, body.user)
        let resultChat: any = ''
        if (findMe && findFriend) {
            resultChat = findChat.find(el => findMe.messages.includes(el.id) && findFriend.messages.includes(el.id))
        }
        if (resultChat) {
            const pinChatNew = resultChat.pin.map(el => {
                if (el.user === body.email) {
                    return {
                        user: body.email,
                        pin: body.pin,
                    }
                } else {
                    return el
                }
            })
            await this.chatModel.findOneAndUpdate({id: resultChat.id}, {pin: pinChatNew}, {new: true})
        }
    }

    async pinMess(body: {email: string, trueParamEmail: string, messId: string, pin: boolean}) {
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        let resultChat: any = ''
        for (let item of findChat) {
            const findMess = item.messages.find(el => el.id === body.messId[0])
            if (findMess) {
                resultChat = item
                break
            }
        }
        if (resultChat) {
            const newMess = resultChat.messages.map(el => {
                if (el.id === body.messId) {
                    return {
                        ...el,
                        pin: body.pin,
                    }
                } else {
                    return el
                }
            })
            await this.chatModel.findOneAndUpdate({id: resultChat.id}, {messages: newMess}, {new: true})
            return 'OK'
        }
    }

    async getSavePosts(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.savePosts
    }

    async saveUnsavePost(body: {email: string, postId: string, type: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const userSavePosts = findUser?.savePosts
        let newSavePosts: string[] = []
        if (userSavePosts) {
            if (body.type === 'save') {
                const newSaveArr = [...userSavePosts, body.postId]
                newSavePosts = newSaveArr
            } else {
                const newSaveArr = userSavePosts.filter(el => el !== body.postId)
                newSavePosts = newSaveArr
            }
        }
        await this.userModel.findOneAndUpdate({email: body.email}, {savePosts: newSavePosts}, {new: true})
        return newSavePosts
    }

    async changeCode(body: {email: string, newCode: string}) {
        await this.userModel.findOneAndUpdate({code: body.email}, {code: body.newCode}, {new: true})
    }

    async getMessCount(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.messages
    }

    async changeNofifs(body: {notifs: boolean, trueEmail: string, user: string}) {
        const findChat = await this.chatFindEmail(body.trueEmail, body.user)
        const resultChat = findChat[0]
        if (resultChat) {
            const notifsChatNew = resultChat.notifs.map(el => {
                if (body.trueEmail === el.user) {
                    return {
                        user: el.user,
                        notifs: body.notifs,
                    }
                } else {
                    return el
                }
            })
            await this.chatModel.findOneAndUpdate({id: resultChat.id}, {notifs: notifsChatNew}, {new: true})
        }
    }

    async getMyVisits(email: string) {
        const findUser = await this.userModel.findOne({code: email})
        const visitsArr = findUser?.visits
        if (visitsArr) {
            return visitsArr.length
        }
    }

    generateCode() {
        let resultArr: string[] = []
        for (let i=0; i<5; i++) {
            const randomNum = Math.floor(Math.random() * 10)
            resultArr.push(randomNum.toString())
        }
        return resultArr.join('')
    }

    async sendCode(body: NewUserDto) {
        const findThisLogin = await this.userModel.findOne({email: body.login})
        if (!findThisLogin) {
            if (body.firstPass === body.secondPass) {
                let firstCountCheck = 0
                for (let item of specialSymbols) {
                    if (body.firstPass.includes(item)) {
                        firstCountCheck+=1
                    }
                }
                if (firstCountCheck !== 0) {
                    let secondCountCheck = 0
                    for (let item of lowercaseLetters) {
                        if (body.firstPass.includes(item)) {
                            secondCountCheck+=1
                        }
                    }
                    if (secondCountCheck !== 0) {
                        const to = body.login
                        const subject = 'Code for Photogram'
                        const text = this.generateCode()
                        await this.mailerService.sendMail({ to, subject, text })
                        const newCode = new this.codeModel({email: body.login, code: text})
                        await newCode.save()
                        return 'OK'
                    } else {
                        return 'PASS_ERR'
                    }
                } else {
                    return 'PASS_ERR'
                }
            } else {
                return 'SAME_PASS'
            }
        } else {
            return 'LOG_OCCUPIED'
        }
    }

    async regUser(body: CreateUser, response: any) {
        const findThisLogin = await this.userModel.findOne({email: body.login})
        if (!findThisLogin) {
            if (body.firstPass === body.secondPass) {
                const findCode = await this.codeModel.findOne({email: body.login})
                console.log(body.code)
                console.log(findCode)
                if (findCode) {
                    if (body.code === findCode.code) {
                        const resultPass = await argon2.hash(body.firstPass)
                        await this.addUser(body.login, [body.publicKey], body.name, body.plat, resultPass)
                        await this.codeModel.findOneAndDelete({email: body.login})
                        const tokens = await this.generateTokens(body.login)
                        if (!body.mobile) {
                            response.cookie('accessToken', tokens.accessToken, {
                                httpOnly: true,
                                sameSite: 'strict',
                                maxAge: 60 * 60 * 1000, 
                            });
                            return {
                                refreshToken: tokens.refreshToken,
                            }
                        } else {
                            return {
                                accessToken: tokens.accessToken,
                                refreshToken: tokens.refreshToken,
                            }
                        }
                    } else {
                        throw new BadRequestException('Неверный код')   
                    }
                }
            } else {
                throw new BadRequestException('Пароли должны совпадать')
            }
        } else {
            throw new BadRequestException('Вы не можете создать аккаунт с таким логином')
        }
    }

    async sendEnterCode(email: string) {
        const findThisUser = await this.userModel.findOne({email: email})
        if (findThisUser) {
            const to = email
            const subject = 'Code for Photogram'
            const text = this.generateCode()
            await this.mailerService.sendMail({ to, subject, text })
            const newCode = new this.enterCodeModel({email: email, code: text})
            await newCode.save()
            return 'OK'
        } else {
            return 'ERR'
        }
    }

    async emailEnter(body: {email: string, code: string}) {
        const findThisEmail = await this.enterCodeModel.findOne({email: body.email})
        if (findThisEmail) {
            if (findThisEmail.code == body.code) {
                const findThisUser = await this.userModel.findOne({email: body.email})
                await this.enterCodeModel.findOneAndDelete({email: body.email})
                if (findThisUser) {
                    const refreshToken = uuidv4()
                    const resultRefreshToken = await argon2.hash(refreshToken)
                    const date = new Date()
                    const time = date.getTime()
                    const newRefreshToken = new this.refreshTokensModel({token: resultRefreshToken, email: body.email, timeStamp: time})
                    await newRefreshToken.save()
                    const token = this.jwtService.sign({email: findThisUser.email})
                    return {
                        token: token,
                        refreshToken: refreshToken,
                    }
                }
            } else {
                throw new BadRequestException()
            }
        }
    }

    async addPeer(body: {email: string, peerId: string}) {
        await this.userModel.findOneAndUpdate({email: body.email}, {peerId: body.peerId}, {new: true})
    }

    async dataForCall(body: {email: string, trueParamEmail: string}) {
        const findMe = await this.userModel.findOne({email: body.email})
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        return {name: findMe?.name, friendPeer: findFriend?.peerId}
    }

    async getNewToken(body: {refreshToken: string, token?: string}, response: any) {
        const allRefreshTokens = await this.refreshTokensModel.find().lean()
        let resultRefreshToken: any = null
        for (let item of allRefreshTokens) {
            const checkToken = await argon2.verify(item.token, body.refreshToken)
            if (checkToken) {
                resultRefreshToken = item
                break
            }
        }
        if (resultRefreshToken) {
            const date = new Date()
            const nowTime = date.getTime()
            if (nowTime - resultRefreshToken.timeStamp < 86400000) {
                const tokens = await this.generateTokens(resultRefreshToken.email)
                if (!body.token) {
                        response.cookie('accessToken', tokens.accessToken, {
                        httpOnly: true,
                        sameSite: 'strict',
                        maxAge: 60 * 60 * 1000, 
                    });
                    return {
                        refreshToken: tokens.refreshToken,
                    }
                } else {
                    return {
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                    }
                }
            } else {
                await this.refreshTokensModel.findOneAndDelete({token: resultRefreshToken.token})
                throw new BadRequestException('time')
            }
        } else {
            throw new BadRequestException('undefined')
        }
    }

    async deleteAvatar(email: string) {
        await this.avaModel.findOneAndDelete({email: email})
    }

    async googleEnter(userEmail: string, name: string) {
        const findUser = await this.userModel.findOne({email: userEmail})
        if (!findUser) {
            const plat = 'desktop'
            await this.addUser(userEmail, [], name, plat)
        }
        const tokens = await this.generateTokens(userEmail)
        if (!findUser) {
            return {
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                reg: true,
                email: userEmail,
            }
        } else {
            return {
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                reg: false,
                email: userEmail,
            }  
        }
    }

    async deleteChat(body: {email: string, friendEmail: string, friendDel: boolean}) {
        const findChat = await this.chatFindEmail(body.email, body.friendEmail)
        let deleteId: string[] = []
        for (let item of findChat) {
            deleteId = [...deleteId, item.id]
        }
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const chatsUserNew = await this.deleteChatUser(findUser, deleteId)
            await this.userModel.findOneAndUpdate({email: body.email}, {messages: chatsUserNew}, {new: true})
            if (body.friendDel) {
                for (let chat of findChat) {
                    await this.chatModel.findOneAndDelete({id: chat.id})
                }
                const findFriend = await this.userModel.findOne({email: body.friendEmail})
                if (findFriend) {
                    const chatsFriendNew = await this.deleteChatUser(findFriend, deleteId)
                    await this.userModel.findOneAndUpdate({email: body.friendEmail}, {messages: chatsFriendNew}, {new: true})
                }
            }
        }
        return 'OK'
    }

    async getBotMess(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.botMess
    }

    async checkUser(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            'OK'
        } else {
            return 'undefined'
        }
    }

    async closeUser(email: string) {
        const date = new Date(); 
        const day = date.getDate()
        const month = String(date.getMonth() + 1).padStart(2, '0'); 
        const result = `${day}.${month}`;
        await this.userModel.findOneAndUpdate({email: email}, {onlineStatus: {status: result, plat: ''}}, {new: true})
    }

    async onlineStatus(body: {email: string, plat: string}) {
        await this.userModel.findOneAndUpdate({email: body.email}, {onlineStatus: {status: 'Online', plat: body.plat}}, {new: true})
    }

    async getStatusOnline(trueParamEmail: string) {
        const findUser = await this.userModel.findOne({email: trueParamEmail})
        return findUser?.onlineStatus
    }

    async getVideoMess(body: {email: string, videoMessId: string, trueParamEmail: string}) {
        const videoBuffer = await this.getVideo(body.videoMessId)
        const archive = archiver('zip')
        archive.append(videoBuffer.buffer, {name: `${videoBuffer.filename}`})
        archive.finalize()
        return archive
    }

    async getFriendMessCount(body: {email: string, trueParamEmail: string}) {
        const messCountFriend = await this.messCount({email: body.trueParamEmail, trueParamEmail: body.email})
        return messCountFriend
    }

    async readMess(body: {targetEmail: string}) {
        const findFriend = await this.userModel.findOne({email: body.targetEmail})
        if (findFriend) {
            for (let socket of findFriend.socket) {
                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'readMess', user: '', text: '', photos: [], id:  '', ans: '', socketId: '', typeMess: '', per: '', pin: false}})
            }
        }
    }

    async openChat(body: {email: string, trueParamEmail: string}) {
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        if (findFriend) {
            for (let socket of findFriend.socket) {
                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'openChat', user: body.email, text: '', photos: [], id:  '', ans: '', socketId: '', typeMess: '', per: '', pin: false}})
            }
        }
    }

    async getFile(body: emailAndMessIdAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
            const resultChat = findChat[0]
            if (resultChat) {
                const findThisMess = resultChat.messages.find(el => el.id === body.messId)
                if (findThisMess) {
                    if (this.isBufferPhoto(findThisMess.photos[0])) {
                        const fileBuffer = Buffer.from(findThisMess.photos[0].buffer)
                        const { fileTypeFromBuffer } = await import('file-type');
                        const fileType = await fileTypeFromBuffer(fileBuffer)
                        return {
                            file: fileBuffer,
                            type: fileType?.mime,
                        }
                    }
                }
            }
        }
    }

    async getBigPhotos(body: {messId: string, email: string, trueParamEmail: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
            const resultChat = findChat[0]
            if (resultChat) {
                const findMess = resultChat.messages.find(el => el.id === body.messId)
                if (findMess) {
                    const archive = archiver('zip')
                    const bigPhotosId = findMess.photos.map(photo => photo.id)
                    let bigPhotoBuffers: Buffer[] = []
                    for (let item of bigPhotosId) {
                        const findBuffer = await this.photoHighModel.findOne({id: item})
                        if (findBuffer) {
                            bigPhotoBuffers = [...bigPhotoBuffers, findBuffer.photo]
                        }
                    }
                    bigPhotoBuffers.forEach((bigPhoto, index) => {
                        archive.append(bigPhoto, {name: `${index}`})
                    })
                    archive.finalize()
                    return archive
                }
            }
        }
    }

    async findUser(user: string) {
        const userFind = await this.userModel.findOne({email: user})
        if (userFind) {
            return 'OK'
        } else {
            return 'NO'
        }
    }

    async getUserInfo(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        const userAvatar = await this.avaModel.findOne({email: email})
        if (findUser) {
            if (userAvatar) {
                return {
                    avatar: userAvatar.avatar,
                    name: findUser.name,
                }
            } else {
                return {
                    avatar: '',
                    name: findUser.name,
                }
            }
        }
    }

    async newName(body: {email: string, name: string}) {
        await this.userModel.findOneAndUpdate({email: body.email}, {name: body.name}, {new: true})
        return 'OK'
    }

    async getPublicKeys(body: {email: string, trueParamEmail: string}) {
        const findMe = await this.userModel.findOne({email: body.email})
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        if (findMe && findUser) {
            return {
                myPublicKeys: findMe.publicKeys,
                userPublicKeys: findUser.publicKeys,
            }
        }
    }

    async addPublicKey(body: {email: string, publicKey: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const newPublicKeys = [...findUser.publicKeys, body.publicKey]
            await this.userModel.findOneAndUpdate({email: body.email}, {publicKeys: newPublicKeys}, {new: true})
            return 'OK'
        }
    }

    async messLength(body: {email: string, trueParamEmail: string}) {
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        const resultChat = findChat[0]
        if (resultChat) {
            return resultChat.messages.length
        } else {
            return 0
        }
    }

    async getBigPhoto(body: {email: string, trueParamEmail: string, messId: string, photoId: string}) {
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        const resultChat = findChat[0]
        if (resultChat) {
            const message = resultChat.messages.find(el => el.id === body.messId)
            if (message) {
                const photos = message.photos.map(el => {
                    if (el.id) {
                        return el
                    } else {
                        return false
                    }
                }).filter(el => el !== false)
                const resultPhoto = photos.find(el => el.id === body.photoId)
                const findHighPhoto = await this.photoHighModel.findOne({id: resultPhoto.id})
                return findHighPhoto?.photo
            }
        }
    }

    async changeToken(email: string, response: any) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            await this.userModel.findOneAndUpdate({email: email}, {versionToken: findUser.versionToken + 1}, {new: true})
            const tokens = await this.generateTokens(email)
            response.cookie('accessToken', tokens.accessToken, {
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 60 * 60 * 1000, 
            });
            return 'OK'
        }
    }

    async addTestUsers() {
        const names: string[] = ['Danya', 'Alice', 'Dima', 'John', 'Bob', 'Mike', 'Margo']
        const statuses: string[] = ['Online', 'Offline'] 
        const types: string[] = ['like', 'sub', 'comment']
        for (let name of names) {
            let resultSubs: string[] = []
            const randomNum = Math.floor(Math.random() * 10)
            for (let i=0; i<randomNum; i++) {
                resultSubs = [...resultSubs, i.toString()]
            }
            let resultNotifs: {name: string, type: string}[] = []
            const randomStatus = statuses[Math.floor(Math.random() * 2)]
            let sexUser: string = ''
            if (name === 'Danya' || name === 'Dima' || name === 'John' || name === 'Bob' || name === 'Mike') {
                sexUser = 'male'
            } else {
                sexUser = 'female'
            }
            for (let i=0; i<3; i++) {
                const randomName = names[Math.floor(Math.random() * names.length)]
                const randomType = types[Math.floor(Math.random() * 3)]
                resultNotifs = [...resultNotifs, {name: randomName, type: randomType}]
            }
            const randomAge = Math.floor(Math.random() * 19)
            const user = new this.newTestingUserModel({name: name, age: randomAge, subs: resultSubs, statusOnline: randomStatus, sex: sexUser, notifs: resultNotifs})
            await user.save()
        }
    }

    async getPopularUsers() {
        const popularUsers = await this.newTestingUserModel.aggregate([
            {$addFields: {
                subs: {$slice: ['$subs', 1]},
            }},
        ])
        return popularUsers
    }

    async giveToken(body: {email: string, userSocket: string}) {
        const tokens = await this.generateTokens(body.email)
        this.socketGateway.handleNewMessage({targetSocket: body.userSocket, message: {type: 'tokenQr', tokens: tokens}})
    }

    async postNotif(body: {email: string, trueParamEmail: string, type: boolean}) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        if (findUser) {
            let newUserPostNotifs: string[] = []
            if (body.type === true) {
                newUserPostNotifs = [...findUser.userNotifs, body.email]
            } else {
                newUserPostNotifs = findUser.userNotifs.filter(el => el !== body.email)
            }
            await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {userNotifs: newUserPostNotifs}, {new: true})
        }
    }

    async getPostNotifs(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            return findUser.userNotifs
        }
    }

    async enterTest(body: {login: string, password: string}) {
        const errEnter = 'ENTER_ERR'
        const findUser = await this.userModel.findOne({email: body.login})
        if (findUser) {
            const checkPass = await argon2.verify(findUser.password, body.password.trim())
            if (checkPass) {
                const sessId = uuidv4()
                const sessionData = {
                    user: {
                        email: findUser.email,
                    },
                    isAuthenticated: true,
                };
                await this.redis.setex(
                    `sess:${sessId}`,
                    60,
                    JSON.stringify(sessionData),
                )
                const refreshToken = uuidv4()
                const resultRefreshToken = await argon2.hash(refreshToken)
                const token = new this.testUserModel({token: resultRefreshToken, email: findUser.email})
                await token.save()
                await this.redis.sadd(`index:email:${findUser.email}`, sessId)
                return {
                    sessId: sessId,
                    refreshToken: refreshToken,
                }
            } else {
                return errEnter
            }
        } else {
            return errEnter
        }
    }

    async getEmailTest(sessId: string) {
        const sessionData = await this.redis.get(`sess:${sessId}`)
        if (sessionData) {
            const resultSessionData = JSON.parse(sessionData)
            const userEmail = resultSessionData.user.email
            const findUser = await this.userModel.findOne({email: userEmail})
            if (findUser) {
                return findUser.email
            }
        } else {
            return 'unauth'
        }
    }

    async closeSess(sessId: string) {
        const sessionData = await this.redis.get(`sess:${sessId}`)
        if (sessionData) {
            const resultSessionData = JSON.parse(sessionData)
            const userEmail = resultSessionData.user.email
            const allUserSessions = await this.redis.smembers(`index:email:${userEmail}`)
            const deleteSessId = allUserSessions.filter(el => el !== sessId)
            const pipeline = this.redis.pipeline()
            for (let item of deleteSessId) {
                pipeline.del(`sess:${item}`)
                pipeline.srem(`index:email:${userEmail}`, item)
            }
            await pipeline.exec()
        }
    }

    async refreshSession(refreshToken: string) {
        let resultRefreshToken: any = null
        const allTokens = await this.testUserModel.find().lean()
        for (let item of allTokens) {
            const checkToken = await argon2.verify(item.token, refreshToken)
            if (checkToken) {
                resultRefreshToken = item
            }
        }
        const sessId = uuidv4()
        const sessionData = {
            user: {
                email: resultRefreshToken.email,
            },
            isAuthenticated: true,
        };
        await this.redis.setex(
            `sess:${sessId}`,
            60,
            JSON.stringify(sessionData),
        ) 
        return sessId
    }

    async getUserKeywords(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            if (findUser.keyWords.length !== 0) {
                const favoriteKeyWordsUser = findUser.keyWords.sort((a, b) => b.score - a.score)
                let resultFavoriteKeyWordsUser: any[] = []
                if (favoriteKeyWordsUser.length <= 5) {
                    resultFavoriteKeyWordsUser = favoriteKeyWordsUser
                } else {
                    resultFavoriteKeyWordsUser = favoriteKeyWordsUser.slice(0, 5)
                }
                const labelsKeyWord = resultFavoriteKeyWordsUser.map(el => el.label)
                const allPhotos = await this.photoModel.find().lean()
                const photoWithLabels = allPhotos.map(el => {
                    return {
                        ...el,
                        labels: el.keyWords.map(element => element.label),
                    }
                })
                let keyWordsPhoto: any[] = []
                for (let label of labelsKeyWord) {
                    const labelPhoto = photoWithLabels.filter(el => el.labels.includes(label))
                    let resultLabelPhoto: any[] = []
                    if (labelPhoto.length <= 6) {
                        resultLabelPhoto = labelPhoto
                    } else {
                        resultLabelPhoto = labelPhoto.slice(0, 6)
                    }
                    resultLabelPhoto = resultLabelPhoto.map((el: any) => {
                        const {labels, ...newPhotoLabel} = el
                        return newPhotoLabel
                    })
                    resultLabelPhoto = await this.photoService.addBase64Photo(resultLabelPhoto)
                    keyWordsPhoto = [...keyWordsPhoto, {label: label, photos: resultLabelPhoto}]
                }
                return {
                    keyWords: resultFavoriteKeyWordsUser,
                    labelPhoto: keyWordsPhoto,
                }
            } else {
                return []
            }
        }
    }

    async getChatId(body: EmailAndTrueParamEmail) {
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        const resultChat = findChat[0]
        if (resultChat) {
            return resultChat.id
        }
    }

    async getNotifsMess(body: EmailAndTrueParamEmail) {
        const findChat = await this.chatFindEmail(body.email, body.trueParamEmail)
        const resultChat = findChat[0]
        const myStatusNotifs = resultChat.notifs.find(el => el.user === body.email)
        return myStatusNotifs.notifs
    }

}


