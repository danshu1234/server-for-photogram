import { Controller, Post, Body, Get, Param, Delete, Patch, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('photos')
export class PhotosController {

    constructor(private readonly PhotosService: PhotosService){}

    @Post('create')
    @UseInterceptors(FileInterceptor('photo'))
    createNewPhoto(@UploadedFile() file: Express.Multer.File, @Body() body: {id: string, date: string, email: string}) {
        const photo = {
            file: file,
            data: body,
        }
        this.PhotosService.createPhoto(photo)
    }

    @Post('get/user/photos')
    getUserPhoto(@Body() body: {email: string, trueParamEmail: string}) {
        return this.PhotosService.getUserPhotoServ(body)
    }

    @Patch('like/this/photo')
    likeThisPhoto(@Body() body: {email: string, id: string}) {
        this.PhotosService.likePhoto(body)
    }

    @Patch('unlike/photo')
    unlikeThisPhoto(@Body() body: {email: string, id: string}) {
        this.PhotosService.unlikePhoto(body)
    }

    @Post('all')
    getAllPhotos(@Body() body: {start: number, finish: number}) {
        return this.PhotosService.getAll(body)
    }

    @Get('big/photo/:photoId')
    async getPhotoById(@Param('photoId') photoId: string, @Res() res: Response) {
        const resultBuffer = await this.PhotosService.getPhotoById(photoId)
        res.setHeader('Content-Type', 'image/jpeg/png')
        return res.send(resultBuffer)
    }

    @Get('big/photo/info/:photoId')
    getInfo(@Param('photoId') photoId: string) {
        return this.PhotosService.getPhotoInfo(photoId)
    }

    @Get('comments/:photoId')
    getComments(@Param('photoId') photoId: string) {
        return this.PhotosService.getComments(photoId)
    }

    @Patch('new/comment')
    addNewComment(@Body() body: {email: string, targetId: string, commentInput: string}) {
        return this.PhotosService.addNewComment(body)
    }

    @Get('get/post/:id')
    getPost(@Param('id') id: string) {
        return this.PhotosService.getPost(id)
    }

    @Patch('perm/comments')
    permComments(@Body() body: {photoId: string, perm: boolean, email: string}) {
        return this.PhotosService.permComments(body)
    }
    
    @Delete('delete/photo')
    deletePhoto(@Body() body: {photoId: string, email: string}) {
        this.PhotosService.deletePhoto(body)
    }

    @Patch('delete/comment')
    deleteComment(@Body() body: {email: string, photoId: string, comment: string}) {
        return this.PhotosService.deleteComment(body)
    }

}
