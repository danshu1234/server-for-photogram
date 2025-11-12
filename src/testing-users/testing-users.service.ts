import { BadRequestException, Body, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { NewTestingUser, NewTestingUserDocument } from 'src/NewTestingUserShema';
import { Document, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { testingDb } from './testingDb';
import { ChangePassDto } from './ChangePassDto';
import { HttpException } from '@nestjs/common';
import { SocketGateway } from 'src/socket-getaway';
import { JwtService } from '@nestjs/jwt';
import * as sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import * as archiver from 'archiver';

@Injectable()
export class TestingUsersService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        
        @InjectModel(NewTestingUser.name) 
        private readonly userModel: Model<NewTestingUserDocument>,

        private jwtService: JwtService,

        private readonly socketGateway: SocketGateway,

    ) {}

    async saveFile(file: Express.Multer.File) {
        const docFile = new this.userModel({docFile: file.buffer})
        await docFile.save()
        return file
    }

    async getFile() {
        const files = await this.userModel.find()
        const archive = archiver('zip')
        files.forEach((file, index) => {
            archive.append(file.docFile, {name: `${(index + 1).toString()}.mp4`})
        });
        archive.finalize()
        return archive
    }

}
