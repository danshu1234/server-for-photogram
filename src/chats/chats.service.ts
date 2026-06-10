import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GridFSBucket } from 'mongodb';
import { Model } from 'mongoose';
import { Chat, ChatDocument } from 'src/ChatSchema';
import { GroupAva, GroupAvaDocument } from 'src/GroupAvaSchema';
import { PhotoHigh, PhotoHighDocument } from 'src/PhotoHighSchema';
import { User, UserDocument } from 'src/UserSchema';
import EmailAndTrueParamEmail from 'src/emailInterface';
import { SocketGateway } from 'src/socket-getaway';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import EncryptMess from 'src/MessEncryptInterface';
import * as sharp from 'sharp';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlanMess, PlanMessDocument } from 'src/PlanMessSchema';
import archiver from 'archiver';
import { emailAndMessIdAndTrueParamEmail } from 'src/messIdInter';

@Injectable()
export class ChatsService {

    private bucket: GridFSBucket;

    constructor(@InjectModel(Chat.name) private chatModel: Model<ChatDocument>, @InjectModel(User.name) private userModel: Model<UserDocument>, @InjectModel(GroupAva.name) private groupAva: Model<GroupAvaDocument>, private readonly socketGateway: SocketGateway, @InjectModel(PhotoHigh.name) private photoHighModel: Model<PhotoHighDocument>, @InjectModel(PlanMess.name) private PlanMessModel: Model<PlanMessDocument>){}

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

    async isEmail(email: string) {
        if (email.includes('@')) {
            return true
        } else {
            return false
        }
    }

    isBufferPhoto(photo: any): photo is { buffer: any } {
        return photo && typeof photo === 'object' && 'buffer' in photo;
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
            {$match: {
                'isUsersChat': true,
                $expr: { $lt: [ { $size: "$users" }, 3]},
            }},
            {$project: {isUsersChat: 0}},
        ])
        return findChat
    }

    async getChat(email: string, trueParamEmail: string) {
        let resultChat: any = ''
        const isUserSearch = await this.isEmail(trueParamEmail)
        if (isUserSearch) {
            const chatsUser = await this.chatFindEmail(email, trueParamEmail)
            if (chatsUser.length !== 0) {
                resultChat = chatsUser[0]
            }
            resultChat = chatsUser[0]
        } else {
            const findChat = await this.chatModel.findOne({id: trueParamEmail})
            if (findChat) {
                resultChat = findChat
            }
        }
        if (resultChat !== '') {
            return resultChat
        } else {
            return undefined
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
                let friendEmail: string = ''
                if ('name' in chat) {
                    friendEmail = chat.id
                } else {
                    friendEmail = chat.users.filter(el => el !== email)[0]
                }
                const userChat = await this.userModel.findOne({email: friendEmail})
                const findPinStatus = chat.pin.find(el => el.user === email)
                const findMessCount = chat.messCount.find(el => el.user === email)
                const findMessNotifs = chat.notifs.find(el => el.user === email)
                const resultMessages = chat.messages.map(el => {
                    if (el.typeMess === 'text' || el.typeMess === 'vote') {
                        const findMyMessText = el.text.find(element => element.user === email)
                        if (findMyMessText) {
                            return {
                                ...el,
                                text: findMyMessText.message,
                            }
                        } else {
                            return false
                        }
                    } else {
                        return {
                            ...el,
                            text: el.text,
                        }
                    }
                }).filter(el => el !== false)
                if (userChat) {
                    resultChats = [...resultChats, {...chat, messages: resultMessages, onlineStatus: userChat.onlineStatus, user: friendEmail, pin: findPinStatus.pin, messCount: findMessCount.countMess, notifs: findMessNotifs.notifs}]
                } else {
                    resultChats = [...resultChats, {...chat, messages: resultMessages, onlineStatus: {status: '', plat: ''}, user: friendEmail, pin: findPinStatus.pin, messCount: findMessCount.countMess, notifs: findMessNotifs.notifs}]
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
            const chatsUser = resultChatsUser.map(el => {
                const resultMessages = el.messages.map(element => {
                    if (element.users.includes(email)) {
                        return element
                    } else {
                        return false
                    }
                }).filter(el => el !== false)
                return {
                    ...el,
                    messages: resultMessages,
                }
            }).filter(el => el.messages.length !== 0)
            let chatsWithAvatars: any[] = []
            for (let item of chatsUser) {
                if (item.users.length > 2) {
                    if (item.avatar !== '') {
                        const resultAvatar = await this.groupAva.findOne({id: item.avatar})
                        if (resultAvatar) {
                            chatsWithAvatars = [...chatsWithAvatars, {...item, avatar: resultAvatar.avatar}]
                        }
                    } else {
                        chatsWithAvatars = [...chatsWithAvatars, item]
                    }
                } else {
                    chatsWithAvatars = [...chatsWithAvatars, item]
                }
            }
            return chatsWithAvatars
        }
    }

    async getMess(body: EmailAndTrueParamEmail) {
        let resultChat = await this.getChat(body.email, body.trueParamEmail)
        if (resultChat) {
            const resultMessages = resultChat.messages.map(el => {
                if (el.users.includes(body.email)) {
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
                    if (el.typeMess === 'text' || el.typeMess === 'vote') {
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
                } else {
                    return false
                }
            })
            resultChat = {
                ...resultChat,
                messages: resultMessages.filter(el => el !== false),
            }
            if (resultChat === undefined) {
                return []
            } else {
                const resultMessages = await Promise.all(resultChat.messages.map(async message => {
                    if (message.photos.length !== 0) {
                        if (message.typeMess === 'text') {
                            let resultText: any = ''
                            if (process.env.ENCRYPTION_KEY) {
                                resultText = message.text
                            }
                            const resultPhotos = message.photos.map(el => {
                                return {
                                    base64: '',
                                    id: el.id,
                                }
                            })
                            return {
                                ...message,
                                text: message.text,
                                photos: resultPhotos,
                            }
                        } else {
                            return {...message, photos: []}
                        }
                    } else {
                        return message
                    }
                }))
                const messagesWithAllVote = resultMessages.map(el => {
                    if (el.typeMess === 'vote') {
                        let allVote: string[] = []
                        for (let vote of el.votes) {
                            for (let user of vote.users) {
                                allVote = [...allVote, user]
                            }
                        }
                        return {
                            ...el,
                            allUserVotes: allVote,
                        }
                    } else {
                        return el
                    }
                })
                return messagesWithAllVote
            }
        } else {
            return []
        }
    }

    async newMess(resultData: {user: string, text: {user: string, message: EncryptMess[]}[] | string, date: string, id: string, ans: string, per: string, type: string, email: string, trueParamEmail: string, origUser: string, origId: string, origChatId: string, files: any, videoId?: string, dateSend?: string, hour?: string, minute?: string, previewVideo?: string, options?: {id: string, option: string, users: string[]}[]}) {
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
                            .resize(100, 100)
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
        let chatName: string = ''
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
        let findChat: any = ''
        const isUserSearch = await this.isEmail(resultData.trueParamEmail)
        if (isUserSearch) {
            findChat = await this.chatFindEmail(resultData.email, resultData.trueParamEmail)
        } else {
            const chatUser = await this.chatModel.findOne({id: resultData.trueParamEmail})
            findChat = chatUser
        }
        let resultChat: any = ''
        if (findMe && findFriend) {
            resultChat = findChat[0]
        } else {
            resultChat = findChat
            chatName = resultChat.name
        }
        let resultMessage: any = ''
        console.log('Chat: ')
        console.log(resultChat)
        if (resultChat.users.includes(resultData.email)) {
            if (resultChat) {
                console.log('Function works')
                if (resultData.options) {
                    resultMessage = [...resultChat.messages, {user: resultData.user, text: resultData.text, date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultChat.users, reactions: [], votes: resultData.options}] 
                } else {
                    if (resultData.type !== 'video' && resultData.type !== 'voice') {
                        console.log('Particip: ')
                        resultMessage = [...resultChat.messages, {user: resultData.user, text: resultData.text, date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultChat.users, reactions: []}]
                    } else if (resultData.type === 'video') {
                        if (resultData.videoId && resultData.per === '') {
                            if (resultData.email !== resultData.trueParamEmail) {
                                resultMessage = [...resultChat.messages, {user: resultData.user, text: resultData.videoId, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultChat.users, reactions: []}]
                            } else {
                                resultMessage = [...resultChat.messages, {user: resultData.user, text: resultData.videoId, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultChat.users, reactions: []}]
                            }
                        } else {
                            if (resultData.email !== resultData.trueParamEmail) {
                                resultMessage = [...resultChat.messages, {user: resultData.user, text: videoId, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultChat.users, reactions: []}]
                            } else {
                                resultMessage = [...resultChat.messages, {user: resultData.user, text: videoId, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultChat.users, reactions: []}]                            
                            }
                        }
                    } else if (resultData.type === 'voice') {
                        resultMessage = [...resultChat.messages, {user: resultData.user, text: resultData.text, date: resultData.date, photos: [{id: previewId}], id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultChat.users, reactions: []}]
                    }
                }
                if (resultData.email !== resultData.trueParamEmail) {
                    if (!resultData.dateSend && !resultData.hour && !resultData.minute) {
                        const messCountFriend = resultChat.messCount.map(el => {
                            if (resultChat.users.includes(el.user)) {
                                if (el.user !== resultData.email) {
                                    return {
                                        user: el.user,
                                        countMess: el.countMess + 1,
                                    }
                                } else {
                                    return el
                                }
                            } else {
                                return el
                            }
                        })
                        console.log('Mess count: ')
                        console.log(messCountFriend)
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
            for (let item of resultChat.users) {
                if (item !== resultData.email) {
                    const findUser = await this.userModel.findOne({email: item})
                    if (findUser) {
                        if (findUser.socket !== undefined && resultData.email !== resultData.trueParamEmail && !resultData.dateSend && !resultData.hour && !resultData.minute) {
                            if (resultData.type === 'video') {
                                if (resultData.videoId) {
                                    for (let socket of findUser.socket) {
                                        this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: resultData.videoId, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                                    }
                                } else {
                                    for (let socket of findUser.socket) {
                                        this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: videoId, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                                    }
                                }
                            } else {
                                if (typeof resultData.text !== 'string') {
                                    const findTextUser = resultData.text.find(el => el.user === item)
                                    console.log('Text: ')
                                    console.log(findTextUser)
                                    for (let socket of findUser.socket) {
                                        if (resultData.options) {
                                            this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: findTextUser?.message, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false, votes: resultData.options}})
                                        } else {
                                            this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: findTextUser?.message, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false, users: resultChat.users}})
                                        }
                                    }
                                } else {
                                    for (let socket of findUser.socket) {
                                        this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: resultData.text, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return {
                status: 'OK',
                photos: resultFiles,
            }
        }
    }

    async newChat(resultData: {user: string, text: {user: string, message: EncryptMess[]}[] | string, date: string, id: string, ans: string, per: string, type: string, email: string, trueParamEmail: string, origUser: string, origId: string, files: Express.Multer.File[], users: string[], videoId?: string, groupName?: string}) {
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
        const resultUsers = [...resultData.users, resultData.email]
        let chatName: string = ''
        if (resultData.groupName) {
            chatName = resultData.groupName
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
        if (resultData.type !== 'video') {
            messNew = [{user: resultData.user, text: resultData.text, date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultUsers, reactions: []}]
        } else {
            if (resultData.videoId) {
                messNew = [{user: resultData.user, text: resultData.videoId, date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultUsers, reactions: []}]
            } else {
                messNew = [{user: resultData.user, text: videoId, date: resultData.date, photos: resultFiles, id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false, users: resultUsers, reactions: []}]
            }
        }
        const usersMessCount = resultUsers.map(el => {
            if (el === resultData.email) {
                return {
                    user: el,
                    countMess: 0,
                }
            } else {
                return {
                    user: el,
                    countMess: 1,
                }
            }
        })
        const usersPinChat = resultUsers.map(el => {
            return {
                user: el,
                pin: false,
            }
        })
        const usersNotifChat = resultUsers.map(el => {
            return {
                user: el,
                notifs: true,
            }
        })
        const chatId = uuidv4()
        if (resultData.groupName) {
            const chat = new this.chatModel({id: chatId, users: resultUsers, messages: messNew, messCount: usersMessCount, notifs: usersNotifChat, pin: usersPinChat, name: resultData.groupName, admin: [resultData.email], avatar: ''})
            await chat.save()
        } else {
            const chat = new this.chatModel({id: chatId, users: resultUsers, messages: messNew, messCount: usersMessCount, notifs: usersNotifChat, pin: usersPinChat})
            await chat.save()
        }
        for (let item of resultUsers) {
            const findUser = await this.userModel.findOne({email: item})
            if (findUser) {
                const chatsUser = findUser.messages
                const resultChatsUser = [...chatsUser, chatId]
                await this.userModel.findOneAndUpdate({email: item}, {messages: resultChatsUser}, {new: true})
            }
        }
        let resultPhotos: any = []
        if (resultData.type === 'text') {
            resultPhotos = resultFiles
        } 
        for (let item of resultData.users) {
            if (item !== resultData.email) {
                const findUser = await this.userModel.findOne({email: item})
                if (findUser) {
                    if (findUser.socket !== undefined && resultData.email !== resultData.trueParamEmail) {
                        if (resultData.type === 'video') {
                            if (resultData.videoId) {
                                for (let socket of findUser.socket) {
                                    this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: resultData.videoId, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                                }
                            } else {
                                for (let socket of findUser.socket) {
                                    this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: videoId, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                                }
                            }
                        } else {
                            if (typeof resultData.text !== 'string') {
                                const findTextUser = resultData.text.find(el => el.user === item)
                                console.log('Text: ')
                                console.log(findTextUser)
                                for (let socket of findUser.socket) {
                                    this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: findTextUser?.message, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                                }
                            } else {
                                for (let socket of findUser.socket) {
                                    this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'message', user: {email: resultData.trueParamEmail, name: chatName, sender: resultData.email}, text: resultData.text, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                                }
                            }
                        }
                    }
                }
            }
        }
        return {
            status: 'OK',
            photos: resultFiles,
            id: chatId,
        }
    }   

    async zeroMess(body: EmailAndTrueParamEmail) {
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
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

    async getMessCount(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.messages
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

    async deleteMess(body: {email: string, trueParamEmail: string, messId: string[], readStatus: {user: string, read: boolean}[]}) {
        let newMess: any = []
        let deleteVideoId: string[] = []
        let deletePhotoId: any[] = []
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
        if (resultChat) {
            newMess = resultChat.messages.filter(el => el.id !== body.messId[0])
            const newMessCount = resultChat.messCount.map(el => {
                const findReadStatus = body.readStatus.find(element => element.user === el.user)
                if (findReadStatus) {
                    if (findReadStatus.read === true) {
                        return {
                            user: el.user,
                            countMess: el.countMess,
                        }
                    } else {
                        return {
                            user: el.user,
                            countMess: el.countMess - 1,
                        }
                    }
                }
            })
            if (newMess.length !== 0) {
                await this.chatModel.findOneAndUpdate({id: resultChat.id}, {messages: newMess, messCount: newMessCount}, {new: true})
                for (let item of resultChat.users) {
                    if (item !== body.email) {
                        const findUser = await this.userModel.findOne({email: item})
                        if (findUser) {
                            const unreadCount = newMessCount.find(el => el.user === item)
                            for (let socket of findUser.socket) {
                                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'delete', user: {email: body.trueParamEmail, name: '', sender: body.email}, text: '', photos: [], id:  body.messId, ans: '', socketId: '', readStatus: unreadCount.countMess}})
                            }
                        }
                    }
                }
            } else {
                await this.chatModel.findOneAndDelete({id: resultChat.id})
            }
        }
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})

        console.log('PhotoId: ')
        console.log(deletePhotoId)

        if (deletePhotoId.length !== 0) {
            for (let item of deletePhotoId) {
                await this.photoHighModel.findOneAndDelete({id: item})
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
        const resultChat = await this.getChat(body.trueParamEmail, body.email)
        console.log(`Email: ${body.email}`)
        if (resultChat) {
            return resultChat.messCount
        } else {
            return [{user: body.trueParamEmail, countMess: 0}, {user: body.email, countMess: 0}]
        }
    }

    async editMess(body: {email: string, trueParamEmail: string, editMess: string, inputMess: string, per: string, text: {user: string, message: EncryptMess[]}[]}) {
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
        if (resultChat) {
            const messNew = resultChat.messages.map(el => {
                if (body.editMess === el.id) {
                    return {
                        ...el,
                        text: body.text,
                        edit: true,
                    }
                } else {
                    return el
                }
            })
            await this.chatModel.findOneAndUpdate({id: resultChat.id}, {messages: messNew}, {new: true})
        }
        for (let item of resultChat.users) {
            if (item !== body.email) {
                const findUser = await this.userModel.findOne({email: item})
                const userResultText = body.text.find(el => el.user === item)
                if (findUser) {
                    for (let socket of findUser.socket) {
                        this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'editMess', user: {email: body.trueParamEmail, name: '', sender: body.email}, text: userResultText?.message, photos: [], mess: body.editMess}})
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
        const resultChat = await this.getChat(body.email, body.user)
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
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
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

    async addPublicKey(body: {email: string, publicKey: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const newPublicKeys = [...findUser.publicKeys, body.publicKey]
            await this.userModel.findOneAndUpdate({email: body.email}, {publicKeys: newPublicKeys}, {new: true})
            return 'OK'
        }
    }
    
    async getPublicKeys(usersChat: string[]) {
        let usersPublicKeys: {user: string, publicKeys: string[]}[] = []
        for (let item of usersChat) {
            const findUser = await this.userModel.findOne({email: item})
            if (findUser) {
                usersPublicKeys = [...usersPublicKeys, {user: item, publicKeys: findUser.publicKeys}]
            }
        }
        return usersPublicKeys
    }

    async getChatId(body: EmailAndTrueParamEmail) {
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
        if (resultChat) {
            return resultChat.id
        }
    }

    async getNotifsMess(body: EmailAndTrueParamEmail) {
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
        const myStatusNotifs = resultChat.notifs.find(el => el.user === body.email)
        return myStatusNotifs.notifs
    }

    async getUsersChat(trueParamEmail: string) {
        const findChat = await this.chatModel.findOne({id: trueParamEmail})
        if (findChat) {
            return findChat.users
        }
    }

    async getNameChat(id: string) {
        const findChat = await this.chatModel.findOne({id: id})
        if (findChat) {
            return findChat.name
        }
    }

    async deleteChat(body: {email: string, friendEmail: string, friendDel: boolean}) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const resultChat = await this.getChat(body.email, body.friendEmail)
            if (!body.friendDel) {
                const newMessages = resultChat.messages.map(el => {
                    const resultUsers = el.users.filter(el => el !== body.email)
                    return {
                        ...el,
                        users: resultUsers,
                    }
                })
                await this.chatModel.findOneAndUpdate({id: resultChat.id}, {messages: newMessages}, {new: true})
            } else {
                if (resultChat.users.length < 3) {
                    await this.chatModel.findOneAndDelete({id: resultChat.id})
                }
            }
        }
        return 'OK'
    }

    async getNotifStatus(body: {email: string, trueParamEmail: string}) {
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
        const notifUserStatus = resultChat.notifs.find(el => el.user === body.email)
        return notifUserStatus.notifs
    }

    async getUsersGroup(body: {email: string, trueParamEmail: string}) {
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
        if (resultChat) {
            if (resultChat.users.includes(body.email)) {
                const usersGroup = resultChat.users
                if (!resultChat.id.includes('@')) {
                    return {
                        usersGroup: usersGroup,
                        admin: resultChat.admin,
                    }
                } else {
                    return {
                        usersGroup: usersGroup,
                        admin: [],
                    }
                }
            } else {
                return {
                    usersGroup: 'PART_ERR',
                    admin: [],
                }
            }
        } else {
            return {
                usersGroup: [body.email, body.trueParamEmail],
                admin: [],
            }
        }
    }

    async deleteParticip(body: {email: string, trueParamEmail: string, particip: string}) {
        const findChat = await this.chatModel.findOne({id: body.trueParamEmail})
        if (findChat) {
            const usersNew = findChat.users.filter(el => el !== body.particip)
            await this.chatModel.findOneAndUpdate({id: findChat.id}, {users: usersNew}, {new: true})
            return 'OK'
        }
    }

    async addParticip(body: {email: string, trueParamEmail: string, particip: string}) {
        const findChat = await this.chatModel.findOne({id: body.trueParamEmail})
        if (findChat) {
            if (findChat.admin?.includes(body.email)) {
                const newParticip = [...findChat.users, body.particip]
                if (findChat.messCount.find(el => el.user === body.particip) && findChat.notifs.find(el => el.user === body.particip) && findChat.pin.find(el => el.user === body.particip)) {
                    await this.chatModel.findOneAndUpdate({id: findChat.id}, {users: newParticip}, {new: true})
                } else {
                    const newPin = [...findChat.pin, {user: body.particip, pin: false}]
                    const newMessCount = [...findChat.messCount, {user: body.particip, countMess: 1}]
                    const newNotifs = [...findChat.notifs, {user: body.particip, notifs: true}]
                    await this.chatModel.findOneAndUpdate({id: findChat.id}, {users: newParticip, messCount: newMessCount, notifs: newNotifs, pin: newPin}, {new: true})
                }
                const findUser = await this.userModel.findOne({email: body.particip})
                if (findUser) {
                    const newUserMessages = [...findUser.messages, body.trueParamEmail]  
                    await this.userModel.findOneAndUpdate({email: body.particip}, {messages: newUserMessages}, {new: true})   
                    return 'OK'      
                }
            }
        }
    }

    async chatExit(body: {email: string, trueParamEmail: string}) {
        const findChat = await this.chatModel.findOne({id: body.trueParamEmail})
        if (findChat) {
            const newParticip = findChat.users.filter(el => el !== body.email)
            const findUser = await this.userModel.findOne({email: body.email})
            if (findUser) {
                const messagesUser = findUser.messages.filter(el => el !== findChat.id)
                await this.userModel.findOneAndUpdate({email: body.email}, {messages: messagesUser}, {new: true})
                if (findChat.admin?.includes(body.email)) {
                    const randomNum = Math.floor(Math.random() * newParticip.length)
                    const adminNew = newParticip[randomNum] 
                    await this.chatModel.findOneAndUpdate({id: findChat.id}, {users: newParticip, admin: adminNew}, {new: true})
                } else {
                    await this.chatModel.findOneAndUpdate({id: findChat.id}, {users: newParticip}, {new: true})
                }
                return 'OK'
            }
        }
    }

    async avatarChat(body: {email: string, trueParamEmail: string, ava: Express.Multer.File}) {
        const chatUser = await this.chatModel.findOne({id: body.trueParamEmail}) 
        if (chatUser) {
            if (chatUser.admin?.includes(body.email)) {
                const findAva = await this.groupAva.findOne({id: chatUser.avatar}) 
                const avaBuffer = await sharp(body.ava.buffer)
                    .resize(70, 70) 
                    .jpeg({quality: 40})
                    .png()
                    .toBuffer()

                const base64 = avaBuffer.toString('base64')
                const resultAvatar = `data:image/png;base64,${base64}`

                if (findAva) {
                    await this.groupAva.findOneAndUpdate({id: chatUser.avatar}, {avatar: resultAvatar}, {new: true})
                } else {
                    const id = uuidv4()
                    const avatarGroup = new this.groupAva({id: id, avatar: resultAvatar})
                    await avatarGroup.save()
                    await this.chatModel.findOneAndUpdate({id: body.trueParamEmail}, {avatar: id}, {new: true})
                }
            }
        }
    }

    async reactions(body: {email: string, reactionsMess: {reaction: string, users: string[]}[], messEmojies: string, trueParamEmail: string}) {
        const findChat = await this.getChat(body.email, body.trueParamEmail)
        if (findChat) {
            const newMessages = findChat.messages.map(el => {
                if (el.id === body.messEmojies) {
                    return {
                        ...el,
                        reactions: body.reactionsMess,
                    }
                }
            })
            await this.chatModel.findOneAndUpdate({id: findChat.id}, {messages: newMessages}, {new: true})
        }
        for (let item of findChat.users) {
            if (item !== body.email) {
                const findUser = await this.userModel.findOne({email: item})
                if (findUser) {
                    for (let socket of findUser.socket) {
                        this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'reaction', user: {email: body.trueParamEmail, name: '', sender: body.email}, text: '', photos: [], id: body.messEmojies, ans: '', socketId: '', readStatus: 0, reactions: body.reactionsMess}})
                    }
                }
            }
        }
    }

    async previewPhoto(body: {email: string, messId: string, trueParamEmail: string, indexPhoto: number}) {
        const findChat = await this.getChat(body.email, body.trueParamEmail)
        if (findChat) {
            const messageWithPhoto = findChat.messages.find(el => el.id === body.messId)
            const photo = messageWithPhoto.photos.find((el, index) => index === body.indexPhoto)
            return photo.base64
        }
    }

    async voteUser(body: {email: string, messId: string, trueParamEmail: string, voteId: string}) {
        const findChat = await this.getChat(body.email, body.trueParamEmail)
        if (findChat) {
            const newMess = findChat.messages.map(el => {
                if (el.id === body.messId) {
                    const newVotes = el.votes.map(element => {
                        if (element.id === body.voteId) {
                            return {
                                ...element,
                                users: [...element.users, body.email]
                            }
                        } else {
                            return element
                        }
                    })
                    return {
                        ...el,
                        votes: newVotes,
                    }
                } else {
                    return el
                }
            })
            await this.chatModel.findOneAndUpdate({id: findChat.id}, {messages: newMess}, {new: true})
        }
    }
        
    async voiceRevoke(body: {email: string, messId: string, trueParamEmail: string}) {
        const findChat = await this.getChat(body.email, body.trueParamEmail)
        if (findChat) {
            const newMess = findChat.messages.map(el => {
                if (el.id === body.messId) {
                    const newVotes = el.votes.map(element => {
                        if (element.users.includes(body.email)) {
                            return {
                                ...element,
                                users: element.users.filter(user => user !== body.email)
                            }
                        } else {
                            return element
                        }
                    })
                    return {
                        ...el,
                        votes: newVotes,
                    }
                } else {
                    return el
                }
            })
            await this.chatModel.findOneAndUpdate({id: findChat.id}, {messages: newMess}, {new: true})
        }
    }

    async changeNofifs(body: {notifs: boolean, trueEmail: string, user: string}) {
        const resultChat = await this.getChat(body.trueEmail, body.user)
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

    async getBotMess(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.botMess
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
        console.log('Mess count: ')
        console.log(messCountFriend)
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
                this.socketGateway.handleNewMessage({targetSocket: socket, message: {type: 'openChat', user: {email: body.trueParamEmail, name: '', sender: body.email}, text: '', photos: [], id:  '', ans: '', socketId: '', typeMess: '', per: '', pin: false}})
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

    async getBigPhotos(body: {messId: string, email: string, trueParamEmail: string, photoId: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const resultChat = await this.getChat(body.email, body.trueParamEmail)
            if (resultChat) {
                const findMess = resultChat.messages.find(el => el.id === body.messId)
                if (findMess) {
                    const bigPhotoId = findMess.photos.find(el => el.id === body.photoId).id
                    let bigPhotoBuffer: Buffer | string = ''
                    const findBuffer = await this.photoHighModel.findOne({id: bigPhotoId})
                    if (findBuffer) {
                        bigPhotoBuffer = findBuffer.photo
                        return {
                            id: findBuffer.id,
                            photo: bigPhotoBuffer,
                        }
                    }
                }
            }
        }
    }

    async messLength(body: {email: string, trueParamEmail: string}) {
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
        if (resultChat) {
            return resultChat.messages.length
        } else {
            return 0
        }
    }

    async getBigPhoto(body: {email: string, trueParamEmail: string, messId: string, photoId: string}) {
        const resultChat = await this.getChat(body.email, body.trueParamEmail)
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


}
