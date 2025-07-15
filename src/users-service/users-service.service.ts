import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/UserSchema';
import { SocketGateway } from 'src/socket-getaway';
import Message from 'src/Message';
import EmailAndTrueParamEmail from 'src/emailInterface';
import { find } from 'rxjs';

@Injectable()
export class UsersServiceService {

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private readonly socketGateway: SocketGateway) {}

    async createUser(user: {resultEmail: string, code: string, resultName: string, country: string, latitude: number, longitude: number}) {
        const myUser = new this.userModel({
            code: user.code,
            email: user.resultEmail,
            name: user.resultName,
            subscribes: 0,
            notifs: [],
            socket: '',
            visits: [],
            reports: [],
            avatar: '',
            country: user.country,
            open: true,
            permUsers: [],
            latitude: user.latitude,
            longitude: user.longitude,
            messages: [],
            permMess: 'Все',
            birthday: '',
            savePosts: [],
        })
        await myUser.save()
    }

    async checkUser(email: string) {
        const thisEmailUser = await this.userModel.findOne({email: email})
        if (thisEmailUser) {
            return 'true'
        } else {
            return 'false'
        }
    }

    async checkFindUser(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser !== undefined) {
            return 'OK'
        } else {
            return 'undefined'
        }
    }

    async getCode(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.code
    }

    async getSubs(email: string) {
        const findThisUser = await this.userModel.findOne({code: email})
        const subsAndCountryData = {
            subscribes: findThisUser?.subscribes,
            country: findThisUser?.country,
        }
        console.log(subsAndCountryData)
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
        const findTargetUser = await this.userModel.findOne({email: resultEmail})
        const targetSubs = findTargetUser?.subscribes
        if (targetSubs) {
            const filteredSubs = targetSubs.filter((el: string) => el !== body.resultEmail)
            await this.userModel.findOneAndUpdate({email: resultEmail}, {subscribes: filteredSubs}, {new: true})
        }
    }   

    async getEmail(code: string) {
        const findUser = await this.userModel.findOne({code: code})
        return findUser?.email
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
        const findTargetUser = await this.userModel.findOne({email: resultEmail})
        const targetSubs = findTargetUser?.subscribes
        if (targetSubs) {
            const newSubList = [...targetSubs, body.resultEmail]
            await this.userModel.findOneAndUpdate({email: resultEmail}, {subscribes: newSubList}, {new: true})
        }
    }

    async addSocket(body: {email: string, socketId: string}) {
        console.log(body.email)
        await this.userModel.findOneAndUpdate({email: body.email}, {socket: body.socketId}, {new: true})
    }

    async clearSocket(body: {email: string}) {
        await this.userModel.findOneAndUpdate({email: body.email}, {socket: ''}, {new: true})
    }

    async getNotifs(email: string) {
        const findUser = await this.userModel.findOne({code: email})
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

    async clearNotifs(body: {email: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const userNotifs = findUser?.notifs
        if (userNotifs) {
            const resultNotifs = userNotifs.filter(el => el.type === 'perm')
            await this.userModel.findOneAndUpdate({email: body.email}, {notifs: resultNotifs}, {new: true})
            return resultNotifs
        }
    }

    async getBannedUsers(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.usersBan
    }

    async addBannedUser(body: {userEmail: string, email: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser?.usersBan !== undefined) {
            const resultBannedList = [...findUser.usersBan, body.userEmail]
            await this.userModel.findOneAndUpdate({email: body.email}, {usersBan: resultBannedList}, {new: true})
        }
    }

    async getVisits(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.visits
    }

    async updateVisits(body: {visitsWithMe: string[], targetEmail: string}) {
        console.log(body)
        await this.userModel.findOneAndUpdate({email: body.targetEmail}, {visits: body.visitsWithMe}, {new: true})
        return 'OK'
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
        const findUser = await this.userModel.findOne({code: email})
        if (findUser?.avatar === '') {
            return ''
        } else {
            return findUser?.avatar
        }
    }

    async newAvatar(body: {targetEmail: string, newAva: string}) {
        await this.userModel.findOneAndUpdate({code: body.targetEmail}, {avatar: body.newAva}, {new: true})
    }

    async getFullData(email: string) {
        const findUser = await this.userModel.findOne({email: email}) 
        return findUser
    }

    async getAllUsers() {
        const allUsers = await this.userModel.find()
        return allUsers
    }

    async checkOpen(email: string) {
        const findUser = await this.userModel.findOne({code: email})
        return findUser?.open
    }

    async closeAcc(body: {email: string}) {
        await this.userModel.findOneAndUpdate({code: body.email}, {open: false}, {new: true})
        return 'OK'
    }

    async openAcc(body: {email: string}) {
        await this.userModel.findOneAndUpdate({code: body.email}, {open: true}, {new: true})
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

    async checkCoords(email: string) {
        const findUser = await this.userModel.findOne({code: email})
        if (findUser?.latitude !== null) {
            return 'OK'
        } else {
            return 'ERR'
        }
    }

    async getUserData(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            return findUser
        } else {
            return false
        }
    }

    async getChats(email: string) {
        const findUser = await this.userModel.findOne({email: email})
        return findUser?.messages
    }

    async getMess(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.email})
        if (findUser?.messages) {
            const findChat = findUser.messages.find(el => el.user === body.trueParamEmail)
            if (findChat === undefined) {
                return []
            } else {
                return findChat.messages
            }
        }
    }

    async newMess(body: {newMessages: Message[], trueParamEmail: string, email: string, socketId: string, per: string}) {
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        const newMessages = findFriend?.messages.map(el => {
            if (el.user !== body.email) {
                return el
            } else {
                return {
                    ...el,
                    messages: body.newMessages,
                    messCount: el.messCount + 1,
                }
            }
        })
        await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newMessages}, {new: true})

        const findMe = await this.userModel.findOne({email: body.email})
        const newMessagesForMe = findMe?.messages.map(el => {
            if (el.user !== body.trueParamEmail) {
                return el
            } else {
                return {
                    ...el,
                    messages: body.newMessages,
                }
            }
        })
        await this.userModel.findOneAndUpdate({email: body.email}, {messages: newMessagesForMe}, {new: true})
        if (findFriend?.socket !== '') {
            if (findFriend?.socket !== undefined) {
                this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'message', user: body.email, text: body.newMessages[body.newMessages.length - 1].text, photos: body.newMessages[body.newMessages.length - 1].photos, id:  body.newMessages[body.newMessages.length - 1].id, ans: body.newMessages[body.newMessages.length - 1].ans, socketId: body.socketId, typeMess: body.newMessages[body.newMessages.length - 1].typeMess, per: body.newMessages[body.newMessages.length - 1].per, pin: false}})
            }
        }
    }

    async newChat(body: {email: string, trueParamEmail: string, imageBase64: string[], inputMess: string, typeMessage: string, per: string}) {
        const findMe = await this.userModel.findOne({email: body.email})
        const date = new Date(); 
            const day = date.getDate().toString().padStart(2, '0'); 
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
            const year = date.getFullYear().toString().slice(-2);
            const formattedDate = `${day}.${month}.${year}`
            const id = date.getTime().toString()
        if (findMe?.messages) {
            const newMessages = [...findMe.messages, {user: body.trueParamEmail, messages: [{user: body.email, text: body.inputMess, photos: body.imageBase64, date: formattedDate, id: id, ans: '', edit: false, typeMess: body.typeMessage, per: '', pin: false}], messCount: 0, pin: false}]
            await this.userModel.findOneAndUpdate({email: body.email}, {messages: newMessages}, {new: true})
        }

        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        if (findFriend?.messages) {
            const newMessages = [...findFriend.messages, {user: body.email, messages: [{user: body.email, text: body.inputMess, photos: body.imageBase64, date: formattedDate, id: id, ans: '', edit: false, typeMess: body.typeMessage, per: '', pin: false}], messCount: 1, pin: false}]
            await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newMessages}, {new: true})
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
        return newMess
    }

    async messCount(body: EmailAndTrueParamEmail) {
        const findUser = await this.userModel.findOne({email: body.trueParamEmail})
        return findUser?.messages.find(el => el.user === body.email)?.messCount
    }

    async editMess(body: {email: string, trueParamEmail: string, editMess: string, inputMess: string}) {
        const findMe = await this.userModel.findOne({email: body.email})
        const findFriend = await this.userModel.findOne({email: body.trueParamEmail})
        const newChats = findMe?.messages.map(el => {
            if (el.user === body.trueParamEmail) {
                const newMess = el.messages.map(item => {
                    if (item.id === body.editMess) {
                        return {
                            ...item,
                            text: body.inputMess,
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
            }
        })

        const newFriendChats = findFriend?.messages.map(el => {
            if (el.user === body.email) {
                const newMess = el.messages.map(item => {
                    if (item.id === body.editMess) {
                        return {
                            ...item,
                            text: body.inputMess,
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
            }
        })
        await this.userModel.findOneAndUpdate({email: body.email}, {messages: newChats}, {new: true})
        await this.userModel.findOneAndUpdate({email: body.trueParamEmail}, {messages: newFriendChats}, {new: true})
        if (findFriend?.socket && findMe) {
            const findNewMe = await this.userModel.findOne({email: body.email})
            if (findNewMe) {
                if (findFriend.socket) {
                    this.socketGateway.handleNewMessage({targetSocket: findFriend.socket, message: {type: 'editMess', user: body.email, text: '', photos: [], mess: findNewMe.messages.find(el => el.user === body.trueParamEmail)?.messages}})
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

    async changeCode(body: {trueEmail: string, newCode: string}) {
        await this.userModel.findOneAndUpdate({email: body.trueEmail}, {code: body.newCode}, {new: true})
    }

}


