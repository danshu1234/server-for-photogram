import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { TestingUser, TestingUserDocument } from 'src/TestingUserSchema';
import { Document, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { testingDb } from './testingDb';
import { ChangePassDto } from './ChangePassDto';
import { HttpException } from '@nestjs/common';
import { SocketGateway } from 'src/socket-getaway';
import { JwtService } from '@nestjs/jwt';

const testUser = [
    {
        email: 'danya.shundeev@internet.ru',
        password: '$argon2id$v=19$m=65536,t=3,p=4$g9uDxYBr4th5L42rPIbTmQ$uRhoLrZse610fU4+5nI45UtSB+3I3AsIycO399/bdsc',
        name: 'Danya',
    },
]

@Injectable()
export class TestingUsersService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        
        @InjectModel(TestingUser.name) 
        private readonly userModel: Model<TestingUserDocument>,

        private jwtService: JwtService,

        private readonly socketGateway: SocketGateway,

    ) {}

    async enterUser(body: {login: string, pass: string}) {
        const findUser = testUser.find(el => el.email === body.login)
        if (findUser) {
            const checkPass = await argon2.verify(findUser.password, body.pass)
            if (checkPass) {
                const accessToken = this.jwtService.sign({email: findUser.email})
                const date = new Date()
                const nowTime = date.getTime().toString()
                const refreshToken = await argon2.hash(nowTime)
                const newRefreshToken = new this.userModel({token: refreshToken, email: findUser.email, timeStamp: nowTime})
                await newRefreshToken.save()
                return {
                    accessToken: accessToken,
                    refreshToken: nowTime,
                }
            } else {
                throw new BadRequestException()
            }
        } else {
            throw new BadRequestException()
        }
    }

    async getName(email: string) {
        const findUser = testUser.find(el => el.email === email)
        return findUser?.name
    }

    async getAccessToken(body: {refreshToken: string}) {
        const allTokens = await this.userModel.find().lean()
        let findToken: any = null
        for (let item of allTokens) {
            const checkToken = await argon2.verify(item.token, body.refreshToken)
            if (checkToken) {
                findToken = item
                break
            } 
        }
        if (findToken) {
            const date = new Date()
            const nowTime = date.getTime()
            if (nowTime - findToken.timeStamp < 120000) {
                const newRefreshToken = await argon2.hash(nowTime.toString())
                const resultAccessToken = this.jwtService.sign({email: findToken.email})
                await this.userModel.findOneAndUpdate({token: findToken.token}, {token: newRefreshToken}, {new: true})
                return {
                    accessToken: resultAccessToken,
                    refreshToken: nowTime,
                }
            } else {
                await this.userModel.findOneAndDelete({token: findToken.token})
                throw new BadRequestException()  
            }
        } else {
            throw new BadRequestException()
        }
    }

    async exitFromAll(email: string) {
        await this.userModel.deleteMany({email: email})   
    }

}
