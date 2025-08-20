import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { TestingUser, TestingUserDocument } from 'src/TestingUserSchema';
import { Document, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { testingDb } from './testingDb';
import { ChangePassDto } from './ChangePassDto';
import { HttpException } from '@nestjs/common';

@Injectable()
export class TestingUsersService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        
        @InjectModel(TestingUser.name) 
        private readonly userModel: Model<TestingUserDocument>,

        private jwtService: JwtService,
    ) {}

    async createUser() {
        const user = this.usersRepository.create({name: 'Danya', age: 18, id: '1'})
        await this.usersRepository.save(user)
    }

    async getAllUsers() {
        const allUsers = await this.usersRepository.find()
        return allUsers
    }

    async getToken() {
        const userData = {email: "danya.shundeev@internet.ru"}
        return this.jwtService.sign(userData)
    }
    
    async getEmail(token: string) {
        const userData = this.jwtService.verify(token)
        return userData
    }

    async getData() {
        return {
            name: 'Danya',
            email: 'danya.shundeev@internet.ru',
        }   
    }

    async hashPass(pass: string) {
        const resultHashPass = await argon2.hash(pass)
        return resultHashPass
    }

    async checkToken(token: string) {
        const verifyToken = this.jwtService.verify(token)
        return verifyToken
    }

    async enter(body: {login: string, password: string}) {
        const enterErr = 'ERR' 
        const findUser = await this.userModel.findOne({login: body.login})
        if (findUser !== null) {
            const checkPass = await argon2.verify(findUser.password, body.password)
            if (checkPass) {
                const token = this.jwtService.sign({login: findUser.login, role: 'user'})
                return token
            } else {
                return enterErr
            }
        } else {
            return enterErr
        }
    }

    async userData(user: {login: string, role: string}) {
        const findUser = await this.userModel.findOne({login: user.login})
        return {
            name: findUser?.name,
            age: findUser?.age,
        }
    }

    async userName(user: {login: string, role: string}) {
        const findUser = await this.userModel.findOne({login: user.login})
        return findUser?.name
    }

    async changePass(body: ChangePassDto) {
        try {
            const userData = await this.jwtService.verify(body.token)
            const findUser = await this.userModel.findOne({login: userData.login})
            if (findUser?.password) {
                const checkPass = await argon2.verify(findUser?.password, body.oldPass)
                if (checkPass) {
                    const newHashPass = await argon2.hash(body.newPass)
                    await this.userModel.findOneAndUpdate({login: userData.login}, {password: newHashPass}, {new: true})
                    return 'succes'
                } else {
                    return 'Invalid password'
                }
            }
        } catch (e) {
            throw new HttpException('Invalid token', 500);
        }
    }

}
