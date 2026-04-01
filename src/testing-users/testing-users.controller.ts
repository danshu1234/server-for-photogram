import { Controller, Get, Post, UseInterceptors, UploadedFile, Res, Param, Body, Patch } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestingUsersService } from './testing-users.service';
import { Response } from 'express';
import Message from './MessInterface';


@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}


    @Post('user/create')
    createUser() {
        return this.TestingUsersService.createUser()
    }

    @Get('get/user')
    getUser() {
        return this.TestingUsersService.getUser()
    }

    @Post('explore/photo')
    @UseInterceptors(FileInterceptor('photo'))
    createNewPhoto(@UploadedFile() file: Express.Multer.File) {
        this.TestingUsersService.explorePhoto(file)
    }

}   