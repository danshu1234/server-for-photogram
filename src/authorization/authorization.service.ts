import { Injectable } from '@nestjs/common';
import { BadRequestException, Body, Inject, forwardRef } from '@nestjs/common';
import { NewUserDto } from 'src/NewUserDto';
import { CreateUser } from 'src/CreateUser';
import { specialSymbols, lowercaseLetters } from 'src/PassSymbols';
import { v4 as uuidv4 } from 'uuid';
import * as argon2 from 'argon2';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/UserSchema';
import { InjectModel } from '@nestjs/mongoose';
import { TestingUser, TestingUserDocument } from 'src/TestingUserSchema';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { Code, CodeDocument } from 'src/CodeSchema';
import { EnterCode, EnterCodeDocument } from 'src/EnterCodeSchema';
import { SocketGateway } from 'src/socket-getaway';
import { REDIS_CLIENT } from '../redis.module'
import Redis from 'ioredis';
import { NewTestingUser, NewTestingUserDocument } from 'src/NewTestingUserShema';


@Injectable()
export class AuthorizationService {

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, @InjectModel(TestingUser.name) private readonly refreshTokensModel: Model<TestingUserDocument>, private jwtService: JwtService, private readonly mailerService: MailerService, @InjectModel(Code.name) private codeModel: Model<CodeDocument>, @InjectModel(EnterCode.name) private enterCodeModel: Model<EnterCodeDocument>, private readonly socketGateway: SocketGateway, @Inject(REDIS_CLIENT) private redis: Redis, @InjectModel(NewTestingUser.name) private readonly testUserModel: Model<NewTestingUserDocument>){}

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
                refreshToken: {
                    refreshToken: refreshToken,
                    email: email,
                },
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
                        refreshToken: {
                            refreshToken: refreshToken,
                            email: findThisUser.email,
                        },
                    }
                }
            } else {
                throw new BadRequestException()
            }
        }
    }

    async getNewToken(body: {refreshToken: {email: string, refreshToken: string}, token?: string}, response: any) {
        const allRefreshTokens = await this.refreshTokensModel.aggregate([
            {$match: {
                'email': body.refreshToken.email,
            }},
        ])
        let resultRefreshToken: any = null
        for (let item of allRefreshTokens) {
            const checkToken = await argon2.verify(item.token, body.refreshToken.refreshToken)
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

    async googleEnter(userEmail: string, name: string) {
        const findUser = await this.userModel.findOne({email: userEmail})
        if (!findUser) {
            const plat = 'desktop'
            await this.addUser(userEmail, [], name, plat)
        }
        const tokens = await this.generateTokens(userEmail)
        if (typeof tokens.refreshToken !== 'string') {
            if (!findUser) {
                return {
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken.refreshToken,
                    reg: true,
                    email: userEmail,
                }
            } else {
                return {
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken.refreshToken,
                    reg: false,
                    email: userEmail,
                }  
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

    async giveToken(body: {email: string, userSocket: string}) {
        const tokens = await this.generateTokens(body.email)
        this.socketGateway.handleNewMessage({targetSocket: body.userSocket, message: {type: 'tokenQr', tokens: tokens}})
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

}
