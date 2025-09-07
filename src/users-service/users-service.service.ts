import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/UserSchema';
import { Code, CodeDocument } from 'src/CodeSchema';
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

@Injectable()
export class UsersServiceService {

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private readonly socketGateway: SocketGateway, private readonly mailerService: MailerService, @InjectModel(Code.name) private codeModel: Model<CodeDocument>, @InjectModel(EnterCode.name) private enterCodeModel: Model<EnterCodeDocument>, private jwtService: JwtService) {}
    async enter(body: {login: string, password: string}) {
        const err = 'ERR'
        const findUser = await this.userModel.findOne({email: body.login})
        if (findUser) {
            const checkPass = await argon2.verify(findUser.password, body.password)
            if (checkPass === true) {
                const token = this.jwtService.sign({email: findUser.email})
                return token
            } else {
                return err
            }
        } else {
            return err
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
        await this.userModel.findOneAndUpdate({email: body.email}, {socket: body.socketId}, {new: true})
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
        } else if (body.type === 'perm') {
            resultNotifs = [...currentNotifs, {type: 'perm', user: body.resultEmail}]
        } else if (body.type === 'succes') {
            resultNotifs = [...currentNotifs, {type: 'succes', user: body.resultEmail}]
        } else if (body.type === 'err') {
            resultNotifs = [...currentNotifs, {type: 'err', user: body.resultEmail}]
        }
        await this.userModel.findOneAndUpdate({email: body.userEmail}, {notifs: resultNotifs}, {new: true})
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
        const findMe = await this.userModel.findOne({code: body.email})
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
        const findUser = await this.userModel.findOne({email: email})
        if (findUser?.avatar === '') {
            return ''
        } else {
            return findUser?.avatar
        }
    }

    async newAvatar(body: {targetEmail: string, newAva: string}) {
        await this.userModel.findOneAndUpdate({email: body.targetEmail}, {avatar: body.newAva}, {new: true})
    }

    async getAllUsers() {
        const allUsers = await this.userModel.find({}, {messages: 0, password: 0})
        return allUsers
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
        const findUser = await this.userModel.findOne({email: email}, {code: 0, messages: 0, password: 0})
        if (findUser) {
            return findUser
        } else {
            return false
        }
    }

    async getChats(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            const resultChats = findUser.messages.map(chat => {
                return {
                    ...chat,
                    messages: chat.messages.map(message => {
                        if (message.text === '') {
                            return message
                        } else {
                            if (process.env.ENCRYPTION_KEY) {
                                const resultText = CryptoJS.AES.decrypt(message.text, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
                                return {
                                    ...message,
                                    text: resultText,
                                }
                            }
                        }
                    })
                }
            })
            return resultChats
        }
    }

    async getMess(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.email}).lean()
        if (findUser) {
            if (findUser.messages) {
                let findChat = findUser.messages.find(el => el.user === body.trueParamEmail)
                if (findChat) {
                    const resultMessages = findChat?.messages.map(el => {
                    let resultText: string = ''
                    if (process.env.ENCRYPTION_KEY && el.text !== '') {
                        resultText = CryptoJS.AES.decrypt(el.text, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
                    } else {
                        resultText = ''
                    }
                    return {
                        ...el,
                        text: resultText,
                    }
                    })
                    findChat = {
                        ...findChat,
                        messages: resultMessages,
                    }
                    if (findChat === undefined) {
                        return []
                    } else {
                        const resultMessages = await Promise.all(findChat.messages.map(async message => {
                            if (message.photos.length !== 0) {
                                const resultBuffers = await Promise.all(message.photos.map(async photo => {
                                    const buffer = Buffer.from(photo.buffer);
                                    const resultBuffer = await sharp(buffer)
                                    .resize(350, 250)
                                    .jpeg({quality: 90})
                                    .toBuffer()
                                    return resultBuffer
                                }))
                                let resultText: string = ''
                                if (process.env.ENCRYPTION_KEY) {
                                    resultText = CryptoJS.AES.decrypt(message.text, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
                                }
                                return {
                                    ...message,
                                    text: resultText,
                                    photos: resultBuffers.map(el => `data:image/jpeg;base64,${el.toString('base64')}`)
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
        }
    }

    async newMess(resultData: {user: string, text: string, date: string, id: string, ans: string, per: string, type: string, email: string, trueParamEmail: string, files: Express.Multer.File[]}) {
        const findFriend = await this.userModel.findOne({email: resultData.trueParamEmail})
        const findMe = await this.userModel.findOne({email: resultData.email})
        let resultEncryptedText: string = ''
        if (process.env.ENCRYPTION_KEY) {
            resultEncryptedText = CryptoJS.AES.encrypt(resultData.text, process.env.ENCRYPTION_KEY).toString()
        }
        if (findFriend?.email !== findMe?.email) {
            const newMessages = findFriend?.messages.map(el => {
            if (el.user !== findMe?.email) {
                return el
            } else {
                return {
                    ...el,
                    messages: [...el.messages, {user: resultData.user, text: resultEncryptedText, date: resultData.date, photos: resultData.files.map(el => el.buffer), id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}],
                    messCount: el.messCount + 1,
                }
            }
        })
        await this.userModel.findOneAndUpdate({email: resultData.trueParamEmail}, {messages: newMessages}, {new: true})

        const newMessagesForMe = findMe?.messages.map(el => {
            if (el.user !== resultData.trueParamEmail) {
                return el
            } else {
                return {
                    ...el,
                    messages: [...el.messages, {user: resultData.user, text: resultEncryptedText, date: resultData.date, photos: resultData.files.map(el => el.buffer), id: resultData.id, ans: resultData.ans, edit: false, typeMess: resultData.type, per: resultData.per, pin: false}],
                }
            }
        })
        await this.userModel.findOneAndUpdate({email: resultData.email}, {messages: newMessagesForMe}, {new: true})

        let resultPhotos: any = []

        if (resultData.files.length !== 0) {
            resultPhotos = await Promise.all(resultData.files.map(async photo => {
            if (photo.mimetype === 'image/jpeg') {
                const resultBuffer = await sharp(photo.buffer)
                .resize(200, 200)
                .jpeg({quality: 70})
                .toBuffer()

                return `data:image/jpeg;base64,${resultBuffer.toString('base64')}`
            } else if (photo.mimetype === 'image/png') {
                const resultBuffer = await sharp(photo.buffer)
                .resize(200, 200)
                .png({quality: 70})
                .toBuffer()

                return `data:image/jpeg;base64,${resultBuffer.toString('base64')}`
            }
        }))
        } 

        if (findFriend?.socket !== '') {
            if (findFriend?.socket !== undefined) {
                this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'message', user: findMe?.email, text: resultData.text, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
            }
        }
        }
    }

    async newChat(resultData: {user: string, text: string, date: string, id: string, ans: string, per: string, type: string, email: string, trueParamEmail: string, files: Express.Multer.File[]}) {
        const findMe = await this.userModel.findOne({email: resultData.email})
        const findFriend = await this.userModel.findOne({email: resultData.trueParamEmail})
        let resultEncryptedText: string = ''
        if (process.env.ENCRYPTION_KEY) {
            resultEncryptedText = CryptoJS.AES.encrypt(resultData.text, process.env.ENCRYPTION_KEY).toString()
        }
        if (findMe?.email !== findFriend?.email) {
            const date = new Date(); 
            const day = date.getDate().toString().padStart(2, '0'); 
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
            const year = date.getFullYear().toString().slice(-2);
            const formattedDate = `${day}.${month}.${year}`
            const id = date.getTime().toString()
            if (findMe?.messages) {
                const newMessages = [...findMe.messages, {user: resultData.trueParamEmail, messages: [{user: findMe.email, text: resultEncryptedText, photos: resultData.files, date: formattedDate, id: id, ans: '', edit: false, typeMess: resultData.type, per: '', pin: false}], messCount: 0, pin: false, notifs: true}]
                await this.userModel.findOneAndUpdate({email: resultData.email}, {messages: newMessages}, {new: true})
            }

            if (findFriend?.messages) {
                const newMessages = [...findFriend.messages, {user: findMe?.email, messages: [{user: findMe?.email, text: resultEncryptedText, photos: resultData.files, date: formattedDate, id: id, ans: '', edit: false, typeMess: resultData.type, per: '', pin: false}], messCount: 1, pin: false, notifs: true}]
                await this.userModel.findOneAndUpdate({email: resultData.trueParamEmail}, {messages: newMessages}, {new: true})
            }
        }
    }   

    async zeroMess(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.email})
        const userMess = findUser?.messages
        if (userMess) {
            const newMess = userMess.map(el => {
                if (el.user === body.trueParamEmail) {
                    return {
                        ...el,
                        messCount: 0,
                    }
                } else {
                    return el
                }
            })
            await this.userModel.findOneAndUpdate({email: body.email}, {messages: newMess}, {new: true})
        }
    }

    async typingUser(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        const findSocket = findUser?.socket
        if (findSocket) {
            this.socketGateway.handleNewMessage({targetSocket: findSocket, message: {type: 'typing', user: body.email, text: '', photos: []}})
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
        if (prevBanUsers) {
            await this.userModel.findOneAndUpdate({email: body.email}, {banMess: [...prevBanUsers, body.trueParamEmail]}, {new: true})
        }
    }

    async unbanUser(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.email})
        const prevBanUsers = findUser?.banMess
        if (prevBanUsers) {
            const filteredUsersBan = prevBanUsers.filter(el => el !== body.trueParamEmail)
            await this.userModel.findOneAndUpdate({email: body.email}, {banMess: filteredUsersBan}, {new: true})
        }
    }

    async deleteMess(body: {email: string, trueParamEmail: string, index: number, messId: string}) {
        let newMess: any = []
        const findMe = await this.userModel.findOne({email: body.email})
        const newChats = findMe?.messages.map(el => {
            if (el.user === body.trueParamEmail) {
                const newMessages = el.messages.filter((el, index) => index !== body.index)
                return {
                    ...el,
                    messages: newMessages,
                }
            } else {
                return el
            }
        })
        await this.userModel.findOneAndUpdate({email: body.email}, {messages: newChats}, {new: true})

        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        const newFriendChats = findFriend?.messages.map(el => {
            if (el.user === body.email) {
                const newMessages = el.messages.filter((el, index) => index !== body.index)
                newMess = newMessages
                return {
                    ...el,
                    messages: newMessages,
                    messCount: el.messCount - 1,
                }
            } else {
                return el
            }
        })
        await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newFriendChats}, {new: true})
        if (findFriend?.socket !== undefined) {
            this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'delete', user: body.email, text: '', photos: [], id: body.messId, ans: ''}})
        }

        if (newMess.length === 0) {
            const newMyChats = findMe?.messages.filter(el => el.user !== body.trueParamEmail)
            const newFriendChats = findFriend?.messages.filter(el => el.user !== body.email)
            await this.userModel.findOneAndUpdate({email: body.email}, {messages: newMyChats}, {new: true})
            await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newFriendChats}, {new: true})
        }
        const resultMessages = newMess.map(el => {
            return {
                ...el,
                photos: el.photos.map(element => `data:image/jpeg;base64,${element.toString('base64')}`)
            }
        })
        return resultMessages
    }

    async messCount(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        return findUser?.messages.find(el => el.user === body.email)?.messCount
    }

    async editMess(body: {email: string, trueParamEmail: string, editMess: string, inputMess: string, per: string}) {
        const findMe = await this.userModel.findOne({email: body.email})
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        const newChats = findMe?.messages.map(el => {
            if (el.user === body.trueParamEmail) {
                const newMess = el.messages.map(item => {
                    if (item.id === body.editMess && process.env.ENCRYPTION_KEY) {
                        return {
                            ...item,
                            text: CryptoJS.AES.encrypt(body.inputMess, process.env.ENCRYPTION_KEY).toString(),
                            edit: true,
                        }
                    } else {
                        return item
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

        const newFriendChats = findFriend?.messages.map(el => {
            if (el.user === findMe?.email) {
                const newMess = el.messages.map(item => {
                    if (item.id === body.editMess && process.env.ENCRYPTION_KEY) {
                        return {
                            ...item,
                            text: CryptoJS.AES.encrypt(body.inputMess, process.env.ENCRYPTION_KEY).toString(),
                            edit: true,
                        }
                    } else {
                        return item
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
        await this.userModel.findOneAndUpdate({email: body.email}, {messages: newChats}, {new: true})
        await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newFriendChats}, {new: true})
        if (findFriend?.socket && findMe) {
            const findNewMe = await this.userModel.findOne({email: body.email})
            if (findNewMe) {
                if (findFriend.socket) {
                    const resultMessages = findNewMe.messages.find(el => el.user === body.trueParamEmail)?.messages.map(el => {
                        if (process.env.ENCRYPTION_KEY) {
                            return {
                                ...el,
                                text: CryptoJS.AES.decrypt(el.text, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
                            }
                        }
                    })
                    this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'editMess', user: findMe.email, text: '', photos: [], mess: resultMessages}})
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
            this.socketGateway.handleNewMessage({targetSocket: userSocket, message: {type: 'startVoice', user: body.email, text: '', photos: [], mess: []}})
        }
    }

    async stopVoice(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        const userSocket = findUser?.socket
        if (userSocket) {
            this.socketGateway.handleNewMessage({targetSocket: userSocket, message: {type: 'stopVoice', user: body.email, text: '', photos: [], mess: []}})
        }
    }

    async pinChat(body: {user: string, pin: boolean, email: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const newUserChats = findUser?.messages.map(el => {
            if (el.user !== body.user) {
                return el
            } else {
                return {
                    ...el,
                    pin: body.pin,
                }
            }
        })
        await this.userModel.findOneAndUpdate({email: body.email}, {messages: newUserChats}, {new: true})
        return newUserChats
    }

    async pinMess(body: {email: string, trueParamEmail: string, messId: string, pin: boolean}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const newChats = findUser?.messages.map(el => {
            if (el.user === body.trueParamEmail) {
                const newMess = el.messages.map(element => {
                    if (element.id === body.messId) {
                        return {
                            ...element,
                            pin: body.pin,
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
        await this.userModel.findOneAndUpdate({email: body.email}, {messages: newChats}, {new: true})
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

    async getOnlineStatus(body: {trueEmail: string, trueParamEmail: string}) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        const userSocket = findUser?.socket
        if (userSocket !== undefined) {
            this.socketGateway.handleNewMessage({targetSocket: userSocket, message: {type: 'onlineStatus', user: body.trueEmail, text: '', photos: [], id: '', ans: ''}})
        }
    }

    async giveOnlineStatus(body: {userEmail: string}) {
        const findUser = await this.userModel.findOne({email: body.userEmail})
        const userSocket = findUser?.socket
        if (userSocket !== undefined) {
            this.socketGateway.handleNewMessage({targetSocket: userSocket, message: {type: 'giveOnlineStatus', user: body.userEmail, text: '', photos: [], id: '', ans: ''}})
        }
    }

    async changeNofifs(body: {notifs: boolean, trueEmail: string, user: string}) {
        const findUser = await this.userModel.findOne({email: body.trueEmail})
        const newChats = findUser?.messages.map(el => {
            if (el.user === body.user) {
                return {
                    ...el,
                    notifs: body.notifs,
                }
            } else {
                return el
            }
        })
        await this.userModel.findOneAndUpdate({email: body.trueEmail}, {messages: newChats}, {new: true})
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

    async regUser(body: CreateUser) {
        const findThisLogin = await this.userModel.findOne({email: body.login})
        if (!findThisLogin) {
            if (body.firstPass === body.secondPass) {
                const findCode = await this.codeModel.findOne({email: body.login})
                if (findCode) {
                    if (body.code === findCode.code) {
                        const resultPass = await argon2.hash(body.firstPass)
                        const myUser = new this.userModel({
                            email: body.login,
                            password: resultPass,
                            name: body.name,
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
                        })
                        await myUser.save()
                        await this.codeModel.findOneAndDelete({email: body.login})
                        const token = this.jwtService.sign({email: body.login})
                        return token
                    } else {
                        return 'ERR'
                    }
                }
            }
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
                    const token = this.jwtService.sign({email: findThisUser.email})
                    return token
                }
            } else {
                return 'ERR'
            }
        }
    }

}


