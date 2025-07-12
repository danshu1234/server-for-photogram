import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { TestingUser, TestingUserDocument } from 'src/TestingUserSchema';
import { Document, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class TestingUsersService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        
        @InjectModel(TestingUser.name) 
        private readonly userModel: Model<TestingUserDocument>
    ) {}

    async createUser() {
        const user = this.usersRepository.create({name: 'Danya', age: 18, id: '1'})
        await this.usersRepository.save(user)
    }

    async getAllUsers() {
        const allUsers = await this.usersRepository.find()
        return allUsers
    }

}
