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

    async saveBigFile(file: Express.Multer.File) {
        return new Promise((resolve, reject) => {
            const date = new Date()
            const photoId = date.getTime().toString()
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

    async getBigFile(id: string) {
        if (this.connection.db) {
            const fileMetadata = await this.connection.db
                .collection('photoss.files')  
                .findOne({ 'metadata.id': id });
            if (fileMetadata) {
                const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = [];
                    const downloadStream = this.bucket.openDownloadStream(fileMetadata._id);
                    downloadStream.on('data', (chunk) => chunks.push(chunk));
                    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
                    downloadStream.on('error', reject);
                });
                return fileBuffer
            }
        }
    }


}
