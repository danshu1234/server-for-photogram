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

@Injectable()
export class TestingUsersService {

    private bucket: GridFSBucket;
    private hf: HfInference;

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectConnection() private readonly connection: Connection,
        
        @InjectModel(NewTestingUser.name) 
        private readonly userModel: Model<NewTestingUserDocument>,

        private jwtService: JwtService,

        private readonly socketGateway: SocketGateway,

        private configService: ConfigService,
        

    ) {}

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
    

    async createUser() {
        const name = 'Danya'
        const lastName = 'Shundeev'
        const email = 'danya.shundeev@internet.ru'
        const phone = '89026150139'
        const birthday = '20.01.20007'
        const user = new this.userModel({firstName: name, lastName: lastName, email: email, phone: phone, birthDate: birthday})
        await user.save()
        return 'OK'
    }

    async getUser() {
        const users = await this.userModel.find()
        return users
    }

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


}
