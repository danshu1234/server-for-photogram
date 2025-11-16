import { Controller, Get, Post, UseInterceptors, UploadedFile, Res, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestingUsersService } from './testing-users.service';
import { Response } from 'express';

@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}

    @Post('save/big/file')
    @UseInterceptors(FileInterceptor('file'))
    saveBigFile(@UploadedFile() file: Express.Multer.File) {
        this.TestingUsersService.saveBigFile(file)
    }

    @Get('get/big/file/:id') 
    async getBigFile(@Param('id') id: string, @Res() res: Response) {
        const resultBuffer = await this.TestingUsersService.getBigFile(id)
        res.setHeader('Content-Type', 'video/mp4')
        return res.send(resultBuffer)
    }

}   