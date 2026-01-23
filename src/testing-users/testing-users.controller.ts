import { Controller, Get, Post, UseInterceptors, UploadedFile, Res, Param, Body, Patch } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestingUsersService } from './testing-users.service';
import { Response } from 'express';
import Message from './MessInterface';


@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}


    @Post('user/create')
    createUser(@Body() body: {publicKey: string, name: string}) {
        return this.TestingUsersService.createUser(body)
    }

    @Patch('new/mess')
    newMess(@Body() body: {resultMess: Message[]}) {
        return this.TestingUsersService.newMess(body)
    }

    @Get('public/key')
    getPublicKey() {
        return this.TestingUsersService.getPublicKey()
    }
    
    @Get('all/mess')
    getAllMess() {
        return this.TestingUsersService.getAllMess()
    }

    @Patch('add/key')
    addKey(@Body() body: {publicKey: string}) {
        this.TestingUsersService.addKey(body)
    }

}   