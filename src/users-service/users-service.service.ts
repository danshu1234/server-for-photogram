import { BadRequestException, Body, Injectable } from '@nestjs/common';
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
import { fileTypeFromBuffer } from 'file-type';
import { emailAndMessIdAndTrueParamEmail } from 'src/messIdInter';

@Injectable()
export class UsersServiceService {

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private readonly socketGateway: SocketGateway, private readonly mailerService: MailerService, @InjectModel(Code.name) private codeModel: Model<CodeDocument>, @InjectModel(EnterCode.name) private enterCodeModel: Model<EnterCodeDocument>, private jwtService: JwtService, @InjectModel(TestingUser.name) private readonly refreshTokensModel: Model<TestingUserDocument>,) {}
    
    checkSize(files: Express.Multer.File[]) {
        if (files.length !== 0) {
                const sizeFiles = files.map(el => {
                const buffer = Buffer.from(el.buffer)
                const sizeInMB = Number((buffer.length / (1024 * 1024)).toFixed(2))
                return sizeInMB
            })
            const resultSize = sizeFiles.reduce((acuum, el) => acuum + el)
            console.log(`Size: ${resultSize}`)
            if (resultSize < 7) {
                return true
            } else {
                return false
            }
        } else {
            return true
        }
    }
    
    async enter(body: {login: string, password: string}, response: any) {
        const findUser = await this.userModel.findOne({email: body.login})
        if (findUser && findUser.password) {
            const checkPass = await argon2.verify(findUser.password, body.password)
            if (checkPass === true) {
                const refreshToken = uuidv4()
                const resultRefreshToken = await argon2.hash(refreshToken)
                const token = this.jwtService.sign({email: findUser.email})
                const date = new Date()
                const time = date.getTime()
                const newRefreshToken = new this.refreshTokensModel({token: resultRefreshToken, email: body.login, timeStamp: time})
                await newRefreshToken.save()
                response.cookie('accessToken', token, {
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 1000, 
                });
                return {
                    refreshToken: refreshToken,
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
        } else {
            resultNotifs = [...currentNotifs, {type: body.type, user: body.resultEmail}]
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
                                if (message.typeMess === 'text') {
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
        }
    }

    async newMess(resultData: {user: string, text: string, date: string, id: string, ans: string, per: string, type: string, email: string, trueParamEmail: string, files: Express.Multer.File[]}) {
        let permSize = this.checkSize(resultData.files)
        if (permSize) {
            const findFriend = await this.userModel.findOne({email: resultData.trueParamEmail})
            const findMe = await this.userModel.findOne({email: resultData.email})
            let resultEncryptedText: string = ''
            if (process.env.ENCRYPTION_KEY) {
                resultEncryptedText = CryptoJS.AES.encrypt(resultData.text, process.env.ENCRYPTION_KEY).toString()
            }
            const findThisChat = findFriend?.messages.find(el => el.user === resultData.email)
            if (findThisChat) {
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
            } else {
                if (findFriend) {
                    const date = new Date(); 
                    const day = date.getDate().toString().padStart(2, '0'); 
                    const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
                    const year = date.getFullYear().toString().slice(-2);
                    const formattedDate = `${day}.${month}.${year}`
                    const id = date.getTime().toString()
                    const newFriendChats = [...findFriend.messages, {user: resultData.email, messages: [{user: resultData.email, text: resultEncryptedText, photos: resultData.files, date: formattedDate, id: id, ans: '', edit: false, typeMess: resultData.type, per: '', pin: false}], messCount: 1, pin: false, notifs: true}]
                    await this.userModel.findOneAndUpdate({email: resultData.trueParamEmail}, {messages: newFriendChats}, {new: true})
                }
            }

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

            if (resultData.email !== resultData.trueParamEmail) {
                await this.userModel.findOneAndUpdate({email: resultData.email}, {messages: newMessagesForMe}, {new: true})
            }

            let resultPhotos: any = []

            if (resultData.files.length !== 0 && resultData.type === 'text') {
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
                } else {
                    return ''
                }
            }))
            } 

            if (findFriend?.socket !== '') {
                if (findFriend?.socket !== undefined && resultData.email !== resultData.trueParamEmail) {
                    this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'message', user: findMe?.email, text: resultData.text, photos: resultPhotos, id:  resultData.id, ans: resultData.ans, socketId: '', typeMess: resultData.type, per: resultData.per, pin: false}})
                }
            }
            return 'OK'
        } else {
            return 'SIZE_ERR'
        }
    }

    async newChat(resultData: {user: string, text: string, date: string, id: string, ans: string, per: string, type: string, email: string, trueParamEmail: string, files: Express.Multer.File[]}) {
        const permSize = this.checkSize(resultData.files)
        if (permSize) {
            const findMe = await this.userModel.findOne({email: resultData.email})
            const findFriend = await this.userModel.findOne({email: resultData.trueParamEmail})
            let resultEncryptedText: string = ''
            if (process.env.ENCRYPTION_KEY) {
                resultEncryptedText = CryptoJS.AES.encrypt(resultData.text, process.env.ENCRYPTION_KEY).toString()
            }
            const date = new Date(); 
            const day = date.getDate().toString().padStart(2, '0'); 
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
            const year = date.getFullYear().toString().slice(-2);
            const formattedDate = `${day}.${month}.${year}`
            const id = date.getTime().toString()
            if (findMe?.messages) {
                const newMessages = [...findMe.messages, {user: resultData.trueParamEmail, messages: [{user: findMe.email, text: resultEncryptedText, photos: resultData.files.map(el => el.buffer), date: formattedDate, id: id, ans: '', edit: false, typeMess: resultData.type, per: '', pin: false}], messCount: 0, pin: false, notifs: true}]
                await this.userModel.findOneAndUpdate({email: resultData.email}, {messages: newMessages}, {new: true})
            }
            if (findFriend?.messages) {
                const findThisChat = findFriend.messages.find(el => el.user === resultData.email)
                if (!findThisChat) {
                    const newMessages = [...findFriend.messages, {user: findMe?.email, messages: [{user: findMe?.email, text: resultEncryptedText, photos: resultData.files.map(el => el.buffer), date: formattedDate, id: id, ans: '', edit: false, typeMess: resultData.type, per: '', pin: false}], messCount: 1, pin: false, notifs: true}]
                    await this.userModel.findOneAndUpdate({email: resultData.trueParamEmail}, {messages: newMessages}, {new: true})
                } else {
                    const newMessages = {...findThisChat, messages: [...findThisChat.messages, {user: findMe?.email, text: resultEncryptedText, photos: resultData.files.map(el => el.buffer), date: formattedDate, id: id, ans: '', edit: false, typeMess: resultData.type, per: '', pin: false}], messCount: findThisChat.messCount + 1}
                    const resultFriendChats = findFriend.messages.map(el => {
                        if (el.user === resultData.email) {
                            return newMessages
                        } else {
                            return el
                        }
                    })
                    if (resultData.email !== resultData.trueParamEmail) {
                        await this.userModel.findOneAndUpdate({email: resultData.trueParamEmail}, {messages: resultFriendChats}, {new: true})
                    }
                }
            }
            return 'OK'
        } else {
            return 'SIZE_ERR'
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
        if (prevBanUsers && body.email !== body.trueParamEmail) {
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

    async deleteMess(body: {email: string, trueParamEmail: string, index: number, messId: string, readStatus: boolean}) {
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
                if (body.readStatus === false) {
                    return {
                        ...el,
                        messages: newMessages,
                        messCount: el.messCount - 1,
                    }
                } else {
                    return {
                        ...el,
                        messages: newMessages,
                    }
                }
            } else {
                return el
            }
        })
        await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newFriendChats}, {new: true})
        if (findFriend?.socket !== undefined) {
            this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'delete', user: body.email, text: '', photos: [], id: body.messId, ans: '', readStatus: body.readStatus}})
        }

        if (newMess.length === 0) {
            const newMyChats = findMe?.messages.filter(el => el.user !== body.trueParamEmail)
            const newFriendChats = findFriend?.messages.filter(el => el.user !== body.email)
            await this.userModel.findOneAndUpdate({email: body.email}, {messages: newMyChats}, {new: true})
            await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newFriendChats}, {new: true})
        }
        return 'OK'
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
                            peerId: '',
                            botMess: [],
                            onlineStatus: 'Online',
                        })
                        await myUser.save()
                        await this.codeModel.findOneAndDelete({email: body.login})
                        const token = this.jwtService.sign({email: body.login})
                        const refreshToken = uuidv4()
                        const resultRefreshToken = await argon2.hash(refreshToken)
                        const date = new Date()
                        const time = date.getTime()
                        await this.codeModel.findOneAndDelete({email: body.login, code: body.code})
                        const newRefreshToken = new this.refreshTokensModel({token: resultRefreshToken, email: body.login, timeStamp: time})
                        await newRefreshToken.save()
                        response.cookie('accessToken', token, {
                            httpOnly: true,
                            sameSite: 'strict',
                            maxAge: 60 * 60 * 1000, 
                        });
                        return {
                            refreshToken: refreshToken,
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

    async getNewToken(body: {refreshToken: string}, response: any) {
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
                const resultAccessToken = this.jwtService.sign({email: resultRefreshToken.email})
                const refreshToken = uuidv4()
                const resultToken = await argon2.hash(refreshToken)
                await this.refreshTokensModel.findOneAndUpdate({token: resultRefreshToken.token}, {token: resultToken}, {new: true})
                response.cookie('accessToken', resultAccessToken, {
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 1000, 
                });
                return {
                    refreshToken: refreshToken,
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
        await this.userModel.findOneAndUpdate({email: email}, {avatar: ''}, {new: true})
    }

    async googleEnter(userEmail: string, name: string) {
        const findUser = await this.userModel.findOne({email: userEmail})
        if (!findUser) {
            const myUser = new this.userModel({
                email: userEmail,
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
                onlineStatus: 'Online',
            })
            await myUser.save()
        }
        const refreshToken = uuidv4()
        const resultRefreshToken = await argon2.hash(refreshToken)
        const date = new Date()
        const time = date.getTime()
        const newRefreshToken = new this.refreshTokensModel({token: resultRefreshToken, email: userEmail, timeStamp: time})
        await newRefreshToken.save()
        const token = this.jwtService.sign({email: userEmail})
        return {
            token: token,
            refreshToken: refreshToken,
        }
    }

    async deleteChat(body: {email: string, friendEmail: string, friendDel: boolean}) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const resultUserChats = findUser.messages.filter(el => el.user !== body.friendEmail)
            await this.userModel.findOneAndUpdate({email: body.email}, {messages: resultUserChats}, {new: true})
            if (body.friendDel === true) {
                const findFriend = await this.userModel.findOne({email: body.friendEmail})
                if (findFriend) {
                    const resultFriendChats = findFriend.messages.filter(el => el.user !== body.email)
                    await this.userModel.findOneAndUpdate({email: body.friendEmail}, {messages: resultFriendChats}, {new: true})
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
        await this.userModel.findOneAndUpdate({email: email}, {onlineStatus: result}, {new: true})
    }

    async onlineStatus(email: string) {
        await this.userModel.findOneAndUpdate({email: email}, {onlineStatus: 'Online'}, {new: true})
    }

    async getStatusOnline(trueParamEmail: string) {
        const findUser = await this.userModel.findOne({email: trueParamEmail})
        return findUser?.onlineStatus
    }

    async getVideoMess(body: {email: string, videoMessId: string, trueParamEmail: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const userMess = findUser?.messages
        if (userMess) {
            const findThisChat = userMess.find(el => el.user === body.trueParamEmail)
            const findMess = findThisChat?.messages.find(el => el.id === body.videoMessId)
            const videoFile = findMess?.photos[0]
            if (videoFile) {
                const videoBuffer = Buffer.from(videoFile.buffer)
                const resultVideo = `data:video/mp4;base64,${videoBuffer.toString('base64')}`
                return resultVideo
            }
        }
    }

    async getFriendMessCount(body: {email: string, trueParamEmail: string}) {
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        if (findFriend) {
            const resultChat = findFriend.messages.find(el => el.user === body.email)
            return resultChat?.messCount
        }
    }

    async readMess(body: {targetEmail: string}) {
        const findFriend = await this.userModel.findOne({email: body.targetEmail})
        if (findFriend) {
            this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'readMess', user: '', text: '', photos: [], id:  '', ans: '', socketId: '', typeMess: '', per: '', pin: false}})
        }
    }

    async openChat(body: {email: string, trueParamEmail: string}) {
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        if (findFriend) {
            this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'openChat', user: body.email, text: '', photos: [], id:  '', ans: '', socketId: '', typeMess: '', per: '', pin: false}})
        }
    }

    async videoMess(body: emailAndMessIdAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const userMess = findUser.messages
            const findThisChat = userMess.find(el => el.user === body.trueParamEmail)
            const findThisMess = findThisChat?.messages.find(el => el.id === body.messId)
            if (findThisMess) {
                const videoBuffer = Buffer.from(findThisMess.photos[0].buffer)
                const resultVideo = `data:video/mp4;base64,${videoBuffer.toString('base64')}`
                return resultVideo
            }
        }
    }

    async getFile(body: emailAndMessIdAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser) {
            const userMess = findUser.messages
            const findThisChat = userMess.find(el => el.user === body.trueParamEmail)
            const findThisMess = findThisChat?.messages.find(el => el.id === body.messId)
            if (findThisMess) {
                const fileBuffer = Buffer.from(findThisMess.photos[0].buffer)
                const fileType = await fileTypeFromBuffer(fileBuffer)
                return {
                    file: fileBuffer,
                    type: fileType?.mime,
                }
            }
        }
    }

}


