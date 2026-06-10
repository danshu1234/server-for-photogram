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
import { GroupAva, GroupAvaDocument } from 'src/GroupAvaSchema';

@Injectable()
export class UsersServiceService {

    private bucket: GridFSBucket;

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, @InjectConnection() private readonly connection: Connection, private readonly socketGateway: SocketGateway, private readonly mailerService: MailerService, @InjectModel(Code.name) private codeModel: Model<CodeDocument>, @InjectModel(EnterCode.name) private enterCodeModel: Model<EnterCodeDocument>, private jwtService: JwtService, @InjectModel(TestingUser.name) private readonly refreshTokensModel: Model<TestingUserDocument>, @InjectModel(Video.name) private VideoModel: Model<VideoDocument>, @InjectModel(PhotoHigh.name) private photoHighModel: Model<PhotoHighDocument>, @InjectModel(Ava.name) private avaModel: Model<AvaDocument>, @InjectModel(PlanMess.name) private PlanMessModel: Model<PlanMessDocument>, @InjectModel(NewTestingUser.name) private readonly newTestingUserModel: Model<NewTestingUserDocument>, @InjectQueue('test-queue') private testQueue: Queue, @Inject(REDIS_CLIENT) private redis: Redis, @InjectModel(NewTestingUser.name) private readonly testUserModel: Model<NewTestingUserDocument>, @InjectModel(Photo.name) private photoModel: Model<PhotoDocument>, @Inject(forwardRef(() => PhotosService)) private readonly photoService: PhotosService, @InjectModel(Chat.name) private chatModel: Model<ChatDocument>, @InjectModel(GroupAva.name) private groupAva: Model<GroupAvaDocument>) {}
    
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

    async newAvatar(body: {targetEmail: string, ava: Express.Multer.File}) {
        const findAva = await this.avaModel.findOne({email: body.targetEmail}) 
        const avaBuffer = await sharp(body.ava.buffer)
            .resize(224, 224) 
            .png()
            .toBuffer()

        const base64 = avaBuffer.toString('base64')
        const resultAvatar = `data:image/png;base64,${base64}`
        if (findAva) {
            await this.avaModel.findOneAndUpdate({email: body.targetEmail}, {avatar: resultAvatar}, {new: true})
            await this.userModel.findOneAndUpdate({email: body.targetEmail}, {avatar: ''}, {new: true})
        } else {
            const ava = new this.avaModel({email: body.targetEmail, avatar: resultAvatar})
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

    async getMyVisits(email: string) {
        const findUser = await this.userModel.findOne({code: email})
        const visitsArr = findUser?.visits
        if (visitsArr) {
            return visitsArr.length
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

    async deleteAvatar(email: string) {
        await this.avaModel.findOneAndDelete({email: email})
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


}


