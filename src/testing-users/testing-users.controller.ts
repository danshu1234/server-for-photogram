import { Controller, Get, Post, UseInterceptors, UploadedFile, Res, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestingUsersService } from './testing-users.service';
import { Response } from 'express';

@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}


    @Post('create')
    create() {
        this.TestingUsersService.create()
    }

    @Get('get/:id')
    getUser(@Param('id') id: string) {
        return this.TestingUsersService.getUser(id)
    }

    @Post('save/video')
    @UseInterceptors(FileInterceptor('video'))
    saveVideo(@UploadedFile() file: Express.Multer.File) {
        this.TestingUsersService.saveFile(file)
    }

    @Get('video')
    async getVideo() {
        return this.TestingUsersService.getFile()
    }

}   