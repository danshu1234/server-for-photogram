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
    

    async create() {
        for (let i=1; i < 51; i++) {
            const user = new this.userModel({id: i.toString()})
            await user.save()
        }
    }

    async getUser(id: string) {
        const findUser = await this.userModel.findOne({id: id}).explain('executionStats')
        return findUser
    }

    async saveFile(file: Express.Multer.File) {
        const date = new Date()
        const photoId = date.getTime().toString()

        const video = new this.userModel({id: photoId})
        await video.save()

        return new Promise((resolve, reject) => {
            const uploadStream = this.bucket.openUploadStream(file.originalname, {
                metadata: {
                  id: photoId,
                },
            });

        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);

        readableStream
          .pipe(uploadStream)
          .on('error', reject)
          .on('finish', () => {
            resolve(uploadStream.id);
          });
        });
    }

    async getFile(): Promise<Buffer> {
        const allVideos = await this.userModel.find();
        
        if (allVideos.length === 0) {
            throw new Error('No videos found');
        }

        const resultVideo = allVideos[0];
        const gridfsFile = await this.bucket
            .find({ 'metadata.id': resultVideo.id })
            .next();

        if (!gridfsFile) {
            throw new Error('Video not found in GridFS');
        }

        return new Promise((resolve, reject) => {
            const gridfsId = gridfsFile._id;
            const fileStream = this.bucket.openDownloadStream(gridfsId);

            const chunks: Buffer[] = [];

            fileStream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            fileStream.on('error', (error) => {
                reject(new Error(`Stream error: ${error.message}`));
            });

            fileStream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer);
            });
        });
    }


}
