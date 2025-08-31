import { Injectable } from '@nestjs/common';
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

@Injectable()
export class TestingUsersService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        
        @InjectModel(TestingUser.name) 
        private readonly userModel: Model<TestingUserDocument>,

    ) {}


}
