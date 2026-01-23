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

@Injectable()
export class TestingUsersService {

    private bucket: GridFSBucket;

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectConnection() private readonly connection: Connection,
        
        @InjectModel(NewTestingUser.name) 
        private readonly userModel: Model<NewTestingUserDocument>,

        private jwtService: JwtService,

        private readonly socketGateway: SocketGateway,
        

    ) {}

    onModuleInit() {
        if (!this.connection.db) {
            throw new Error('MongoDB database connection is not established');
        }
        
        this.bucket = new GridFSBucket(this.connection.db, {
            bucketName: 'photoss',
        });
    }
    

    async createUser(body: {publicKey: string, name: string}) {
        const user = new this.userModel({name: body.name, messages: [], messKey: body.publicKey})
        await user.save()
        return 'OK'
    }

    async newMess(body: {resultMess: Message[]}) {
        const name = 'Danya'
        const findUser = await this.userModel.findOne({name: name})
        if (findUser) {
            const resultMessages = [...findUser.messages, body.resultMess]
            await this.userModel.findOneAndUpdate({name: name}, {messages: resultMessages}, {new: true})
        }
    }

    async getPublicKey() {
        const name: string = 'Danya'
        const findUser = await this.userModel.findOne({name: name})
        if (findUser) {
            return findUser.messKey
        }
    }

    async getAllMess() {
        const name: string = 'Danya'
        const findUser = await this.userModel.findOne({name: name})
        if (findUser) {
            return findUser.messages
        }
    }

    async addKey(body: {publicKey: string}) {
        const name: string = 'Danya'
        const findUser = await this.userModel.findOne({name: name})
        if (findUser) {
            if (typeof findUser.messKey === 'string') {
                const newPublicKeys = [body.publicKey]
                await this.userModel.findOneAndUpdate({name: name}, {messKey: newPublicKeys}, {new: true})
            } else {
                const newPublicKeys = [...findUser.messKey, body.publicKey]
                await this.userModel.findOneAndUpdate({name: name}, {messKey: newPublicKeys}, {new: true})
            }
        }
    }


}
