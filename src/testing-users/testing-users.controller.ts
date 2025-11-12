import { Controller, Get, Post, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestingUsersService } from './testing-users.service';
import { Response } from 'express';

@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}

    @Post('save/file')
    @UseInterceptors(FileInterceptor('file'))
    saveFile(@UploadedFile() file: Express.Multer.File) {
        return this.TestingUsersService.saveFile(file)
    }

    @Get('file')
    async getFile(@Res() res: Response) {
        const archive = await this.TestingUsersService.getFile()
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="file"',
        });
        archive.pipe(res)
    }

}   