import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/UserSchema';
import { SocketGateway } from 'src/socket-getaway';

@Injectable()
export class UsersServiceService {

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private readonly socketGateway: SocketGateway) {}

    async createUser(user: {resultEmail: string, resultName: string}) {
        const myUser = new this.userModel({
            email: user.resultEmail,
            name: user.resultName,
            subscribes: 0,
            notifs: [],
            socket: '',
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

    async getSubs(email: string) {
        const findThisUser = await this.userModel.findOne({email: email})
        return findThisUser?.subscribes
    }

    async unSub(body: {targetEmail: string, email: string}) {
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
            const filteredSubs = targetSubs.filter((el: string) => el !== body.email)
            await this.userModel.findOneAndUpdate({email: resultEmail}, {subscribes: filteredSubs}, {new: true})
        }
    }   

    async sub(body: {targetEmail: string, email: string}) {
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
            const newSubList = [...targetSubs, body.email]
            await this.userModel.findOneAndUpdate({email: resultEmail}, {subscribes: newSubList}, {new: true})
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

    async newNotif(body: {email: string, userEmail: string, photoId: string}) {
        const findUser = await this.userModel.findOne({email: body.userEmail})
        const currentNotifs = findUser?.notifs || [];
        const resultNotifs = [...currentNotifs, {notif: `${body.email} оценил(а) ваше`, photoId: body.photoId}]
        await this.userModel.findOneAndUpdate({email: body.userEmail}, {notifs: resultNotifs}, {new: true})
        if (findUser?.socket !== '') {
            if (findUser?.socket !== undefined) {
                this.socketGateway.handleNewMessage({targetSocket: findUser.socket, message: {type: 'checkNotifs'}})
            }
        }
    }

    async clearNotifs(body: {email: string}) {
        await this.userModel.findOneAndUpdate({email: body.email}, {notifs: []}, {new: true})
    }

}
