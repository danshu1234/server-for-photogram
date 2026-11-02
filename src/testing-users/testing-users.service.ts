import { BadRequestException, Body, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { NewTestingUser, NewTestingUserDocument } from 'src/NewTestingUserShema';
import { Connection, Document, Model } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { testingDb } from './testingDb';
import { ChangePassDto } from './ChangePassDto';
import { HttpException } from '@nestjs/common';
import { SocketGateway } from 'src/socket-getaway';
import { JwtService } from '@nestjs/jwt';
import * as sharp from 'sharp';
import * as archiver from 'archiver';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import Message from './MessInterface';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { ConfigService } from '@nestjs/config';
import { HfInference } from '@huggingface/inference';
import { users } from './testingUsers';
import { v4 as uuidv4 } from 'uuid';
import { ExperimUser, ExperimUserDocument } from 'src/ExperimUserSchema';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { alphabet } from './testingUsers'
import Groq from 'groq-sdk'

@Injectable()
export class TestingUsersService {

    private bucket: GridFSBucket;
    private hf: HfInference;
    private client: OpenAI;

    private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=AIzaSyB5siRsjSTIiXX69g6xgEx9FUOqdPNLVQo'

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectConnection() private readonly connection: Connection,
        
        @InjectModel(NewTestingUser.name) 
        private readonly userModel: Model<NewTestingUserDocument>,

        private jwtService: JwtService,

        private readonly socketGateway: SocketGateway,

        private configService: ConfigService,
        
        @InjectModel(ExperimUser.name)
        private readonly experimUserModel: Model<ExperimUserDocument>,

    ) {
        this.client = new OpenAI({
            apiKey: this.configService.get<string>('GROQ_API_KEY'),
            baseURL: 'https://api.groq.com/openai/v1',
        });
    }

    onModuleInit() {
        if (!this.connection.db) {
            throw new Error('MongoDB database connection is not established');
        }
        
        this.bucket = new GridFSBucket(this.connection.db, {
            bucketName: 'photoss',
        });

        const token = this.configService.get('HF_TOKEN');
        if (!token) {
            throw new Error('HF_TOKEN not found in .env');
        }
        this.hf = new HfInference(token);
    }
    

    // async createUser(body: {name: string, age: number, id: string}) {
    //     const user = this.usersRepository.create({...body})
    //     await this.usersRepository.save(user)
    // }

    // async getUser(id: string) {
    //     const findUser = await this.usersRepository.findOne({where: {id: id}})
    //     return findUser
    // }

    // async updateUserName(body: {userName: string, id: string}) {
    //     await this.usersRepository.update({id: body.id}, {name: body.userName})
    // }

    // async deleteUser(body: {id: string}) {
    //     await this.usersRepository.delete({id: body.id})
    // }

    // async createUsers() {
    //     const resultUsers = users.map(el => {
    //         return {
    //             ...el,
    //             id: uuidv4(),
    //         }
    //     })
    //     for (const [index, item] of resultUsers.entries()) {
    //         if (index < 3) {
    //             const user = new this.experimUserModel({...item})
    //             await user.save()
    //         } else {
    //             const user = this.usersRepository.create({...item})
    //             await this.usersRepository.save(user)
    //         }
    //     }
    // }

    // async getUsers() {
    //     const usersMongo = await this.experimUserModel.find()
    //     const usersPostgre = await this.usersRepository.find()
    //     let resultUsersMongo: {name: string, age: number, id: string}[] = []
    //     let resultUsersPostgre: {name: string, age: number, id: string}[] = []
    //     if (usersPostgre) {
    //         resultUsersPostgre = usersPostgre.map(el => {
    //             return {
    //                 name: el.name,
    //                 age: el.age,
    //                 id: el.id,
    //             }
    //         })
    //     }
    //     if (usersMongo) {
    //         resultUsersMongo = usersMongo.map(el => {
    //             return {
    //                 name: el.name,
    //                 age: el.age,
    //                 id: el.id,
    //             }
    //         })
    //     }
    //     return {
    //         usersMongo: resultUsersMongo,
    //         usersPostgre: resultUsersPostgre,
    //     }
    // }

    // async moveUser(body: {higlightUser: string, type: string}) {
    //     if (body.type === 'postgreToMongo') {
    //         const findUser = await this.usersRepository.findOne({where: {id: body.higlightUser}})
    //         if (findUser) {
    //             await this.usersRepository.delete({id: body.higlightUser})
    //             const user = new this.experimUserModel({...findUser}) 
    //             await user.save()
    //         }
    //     } else if (body.type === 'mongoToPostgre') {
    //         const findUser = await this.experimUserModel.findOne({id: body.higlightUser})
    //         if (findUser) {
    //             await this.experimUserModel.findOneAndDelete({id: body.higlightUser})
    //             console.log('User: ')
    //             console.log(findUser)
    //             const user = this.usersRepository.create({name: findUser.name, age: findUser.age, id: findUser.id})
    //             await this.usersRepository.save(user)
    //         }
    //     }
    // }

    // async moveAllUsers(body: {type: string}) {
    //     if (body.type === 'postgreToMongo') {
    //         const allUsersPostgre = await this.usersRepository.find()
    //         for (let item of allUsersPostgre) {
    //             await this.usersRepository.delete({id: item.id})
    //             const user = new this.experimUserModel({name: item.name, age: item.age, id: item.id}) 
    //             await user.save()
    //         }
    //     } else {
    //         const allUsersMongo = await this.experimUserModel.find()
    //         for (let item of allUsersMongo) {
    //             await this.experimUserModel.findOneAndDelete({id: item.id})
    //             const user = this.usersRepository.create({name: item.name, age: item.age, id: item.id})
    //             await this.usersRepository.save(user)
    //         }
    //     }
    // }

    // async distributeUsers() {
    //     const usersMongo = await this.experimUserModel.find()
    //     const usersPostgre = await this.usersRepository.find()
    //     const allUsers = [...usersMongo, ...usersPostgre]
    //     let resultUsersMongo: {name: string, age: number, id: string}[] = []
    //     let resultPostgreUsers: {name: string, age: number, id: string}[] = []
    //     for (let item of allUsers) {
    //         const randomNum = Math.round(Math.random())
    //         if (randomNum === 1) {
    //             resultUsersMongo = [...resultUsersMongo, {name: item.name, age: item.age, id: item.id}]
    //         } else if (randomNum === 0) {
    //             resultPostgreUsers = [...resultPostgreUsers, {name: item.name, age: item.age, id: item.id}]
    //         }
    //     }
    //     const mongoUsersId = usersMongo.map(el => el.id)
    //     const postgreUsersId = usersPostgre.map(el => el.id)
    //     for (let id of mongoUsersId) {
    //         await this.experimUserModel.findOneAndDelete({id: id})
    //     }
    //     for (let id of postgreUsersId) {
    //         await this.usersRepository.delete({id: id})
    //     }
    //     for (let item of resultUsersMongo) {
    //         const user = new this.experimUserModel({...item})
    //         await user.save()
    //     }
    //     for (let item of resultPostgreUsers) {
    //         const user = this.usersRepository.create({...item})
    //         await this.usersRepository.save(user)
    //     }
    //     return {
    //         usersMongo: resultUsersMongo,
    //         usersPostgre: resultPostgreUsers,
    //     }
    // }

    // async usersReverse() {
    //     const usersMongo = await this.experimUserModel.find()
    //     const usersPostgre = await this.usersRepository.find()
    //     const mongoUsersId = usersMongo.map(el => el.id)
    //     const postgreUsersId = usersPostgre.map(el => el.id)
    //     for (let id of mongoUsersId) {
    //         await this.experimUserModel.findOneAndDelete({id: id})
    //     }
    //     for (let id of postgreUsersId) {
    //         await this.usersRepository.delete({id: id})
    //     }
    //     for (let item of usersMongo) {
    //         const user = this.usersRepository.create({name: item.name, age: item.age, id: item.id})
    //         await this.usersRepository.save(user)
    //     }
    //     for (let item of usersPostgre) {
    //         const user = new this.experimUserModel({name: item.name, age: item.age, id: item.id})
    //         await user.save()
    //     }
    // }

    // async conditionSend(body: {age: string, sign: string, base: string}) {
    //     const resultAge = Number(body.age)
    //     let allUsers: any[] = []
    //     if (body.base === 'PostgreSQL') {
    //         allUsers = await this.experimUserModel.find()
    //     } else {
    //         allUsers = await this.usersRepository.find()
    //     }
    //     let filteredUsers: any[] = []
    //     if (body.sign === '>') {
    //         filteredUsers = allUsers.filter(el => el.age > resultAge)
    //     } else {
    //         filteredUsers = allUsers.filter(el => el.age < resultAge)
    //     }
    //     const filteredUsersId = filteredUsers.map(el => el.id)
    //     for (let item of filteredUsersId) {
    //         if (body.base === 'PostgreSQL') {
    //             await this.experimUserModel.findOneAndDelete({id: item})
    //         } else {
    //             await this.usersRepository.delete({id: item})
    //         }
    //     }
    //     for (let item of filteredUsers) {
    //         if (body.base === 'PostgreSQL') {
    //             const user = this.usersRepository.create({name: item.name, age: item.age, id: item.id})
    //             await this.usersRepository.save(user)
    //         } else {
    //             const user = new this.experimUserModel({name: item.name, age: item.age, id: item.id})
    //             await user.save()
    //         }
    //     }
    //     return this.getUsers()
    // }

    // async splitGender() {
    //     const allUsersMongo = await this.experimUserModel.find()
    //     const allUsersPostgre = await this.usersRepository.find()
    //     const allUserNames = [...allUsersMongo.map(el => el.name), ...allUsersPostgre.map(el => el.name)]
    //     const text = `Нужно разделить имена на мужские и женские: ${allUserNames}, от тебя нужен ответ в формате Муж1,Муж2,Муж3.../Жен1,Жен2,Жен3..., после / не нужен пробел, в твоем ответе должно быть только это, ничего больше`
    //     const model = 'llama-3.3-70b-versatile'
    //     const temperature = 0.7
    //     const messages: ChatCompletionMessageParam[] = [{role: 'user', content: text}]
    //     const completion = await this.client.chat.completions.create({
    //         model,
    //         messages,
    //         temperature,
    //     });
    //     const subdivideNames = completion.choices[0].message.content
    //     console.log(subdivideNames)
    //     if (subdivideNames) {
    //         const splitterIndex = subdivideNames.indexOf('/')
    //         const mensName = subdivideNames.slice(0, splitterIndex)
    //         const womensName = subdivideNames.slice(splitterIndex + 1, subdivideNames.length)
    //         const resultMensName = mensName.split(',')
    //         const resultWomensName = womensName.split(',')
    //         for (let item of allUsersMongo) {
    //             if (!resultMensName.includes(item.name)) {
    //                 await this.experimUserModel.findOneAndDelete({id: item.id})
    //                 const user = this.usersRepository.create({name: item.name, age: item.age, id: item.id})
    //                 await this.usersRepository.save(user)
    //             }
    //         }
    //         for (let item of allUsersPostgre) {
    //             if (!resultWomensName.includes(item.name)) {
    //                 await this.usersRepository.delete({id: item.id})
    //                 const user = new this.experimUserModel({name: item.name, age: item.age, id: item.id})
    //                 await user.save()
    //             }
    //         }
    //     }
    //     return this.getUsers()
    // }

    // async alphabetUsers() {
    //     const usersMongo = await this.experimUserModel.find()
    //     const usersPostgre = await this.usersRepository.find()
    //     const resultUsersMongo = usersMongo.map(el => {
    //         return {
    //             name: el.name,
    //             age: el.age,
    //             id: el.id,
    //         }
    //     })
    //     const resultUsersPostgre = usersPostgre.map(el => {
    //         return {
    //             name: el.name,
    //             age: el.age,
    //             id: el.id,
    //         }
    //     })
    //     const allUsers = [...resultUsersMongo, ...resultUsersPostgre]
    //     const resultAllUsers = JSON.stringify(allUsers)
    //     const text = `Нужно отсортировать объекты по name в алфавитном порядке: ${resultAllUsers}, если первые буквы совпадают, нужно отсортировать по последующим буквам, не нужно пример кода, от тебя нужен ответ в формате списка id через запятую, без пробелов`
    //     const model = 'llama-3.3-70b-versatile'
    //     const temperature = 0.7
    //     const messages: ChatCompletionMessageParam[] = [{role: 'user', content: text}]
    //     const completion = await this.client.chat.completions.create({
    //         model,
    //         messages,
    //         temperature,
    //     });
    //     const id = completion.choices[0].message.content
    //     const resultId = id?.split(',')
    //     const resultUsers = resultId?.map(el => {
    //         const user = allUsers.find(element => element.id === el)
    //         return user
    //     })
    //     return resultUsers
    // }

    async explorePhoto(file: Express.Multer.File) {
        const buffer = await sharp(file.buffer)
            .resize(224, 224) 
            .toBuffer()
        
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: 'image/jpeg' });
        
        const result = await this.hf.imageClassification({
            model: 'microsoft/resnet-50',
            data: blob,
        });

        const resultWords = result.slice(0, 5)
        console.log(resultWords)
    }

    async createUserTest() {
        const names: string[] = ['Danya', 'Alice', 'Dima', 'Alex']
        for (let item of names) {
            const lowName: string = item.toLowerCase()
            const resultEmail = `${lowName}@gmail.com`
            let randomNums: number[] = []
            for (let i=0; i<5; i++) {
                const randomNum: number = Math.floor(Math.random() * 10)
                randomNums = [...randomNums, randomNum]
            }
            const resultPassword = randomNums.map(el => el.toString()).join('')
            const user = new this.experimUserModel({email: resultEmail, name: item, password: resultPassword, friends: []})
            await user.save()
        }
    }

    async findAll(): Promise<ExperimUser[]> {
        const allUsers = this.experimUserModel.find()
        return allUsers
    }

    async getUser (email: string): Promise<ExperimUser | null> {
        const findUser = await this.experimUserModel.findOne({email: email})
        console.log(findUser)
        if (findUser) {
            return findUser
        } else {
            return null
        }
    }
    
    async getUserEmail(): Promise<string | null> {
        const allUsers = await this.experimUserModel.find()
        return allUsers[0].email
    }

    async addFriends() {
        const allUsers = await this.experimUserModel.find()
        const emailUsers = allUsers.map(el => el.email).filter(el => el !== 'danya@gmail.com')
        const email: string = 'danya@gmail.com'
        await this.experimUserModel.findOneAndUpdate({email: email}, {friends: emailUsers}, {new: true})
    }

    async getUserFriends(friends: string[]): Promise<ExperimUser[]> {
        let resultFriends: ExperimUser[] = []
        for (let item of friends) {
            const findFriend = await this.experimUserModel.findOne({email: item})
            if (findFriend) {
                resultFriends = [...resultFriends, findFriend]
            }
        }
        return resultFriends
    }

    async correctText(body: {input: string}) {
        const text = 'Нужно исправить в тексте орфографические ошибки и ошибки пунктуации, от тебя нужен только готовый текст, текст для исправления: ' + body.input
        const model = 'groq/compound-mini'
        const temperature = 0.7
        const messages: ChatCompletionMessageParam[] = [{role: 'user', content: text}]
        const completion = await this.client.chat.completions.create({
            model,
            messages,
            temperature,
        });
        const resultText = completion.choices[0].message.content
        return resultText
    }

    async getCities() {

        const USERNAME = process.env.GEONAMES_USER;

        if (USERNAME) {
            const params = new URLSearchParams({
                continentCode: 'EU',
                featureClass: 'P',
                orderby: 'population',
                maxRows: '100',
                lang: 'ru',
                username: USERNAME,
            });

            const res = await fetch(`http://api.geonames.org/searchJSON?${params}`);
            if (!res.ok) throw new Error(`GeoNames ${res.status}`);

            const data = await res.json();
            return data.geonames;
        }
    }

    async rateCities(body: {coords: {latitude: number, longitude: number}[]}) {
        let cities: {name: string, population: number}[] = []
        for (let item of body.coords) {
            const cityInfo = await fetch(`http://api.geonames.org/findNearbyPlaceNameJSON?lat=${item.latitude}&lng=${item.longitude}&username=danshu001&style=full`)
            const resultCityInfo = await cityInfo.json()
            const city = resultCityInfo.geonames[0]
            console.log(city)
            cities = [...cities, {name: city.name, population: city.population}]
        }
        cities.sort((a, b) => b.population - a.population)
        const resultCities = cities.map(el => el.name) 
        return resultCities
    }
    
}
