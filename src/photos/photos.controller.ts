import { Controller, Post, Body, Get, Param, Delete, Patch, UseInterceptors, UploadedFile, Res, UseGuards, Request } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from 'jwt-auth.guard';
import { CookieJwtGuard } from 'src/cookie-jwt.guard';

@Controller('photos')
export class PhotosController {

    constructor(private readonly PhotosService: PhotosService){}

    @Post('create')
    @UseGuards(CookieJwtGuard)
    @UseInterceptors(FileInterceptor('photo'))
    createNewPhoto(@UploadedFile() file: Express.Multer.File, @Body() data: {id: string, date: string}, @Request() req) {
        const body = {id: data.id, date: data.date, email: req.user.email}
        const photo = {
            file: file,
            data: body,
        }
        this.PhotosService.createPhoto(photo)
    }

    @Post('get/user/photos')
    @UseGuards(CookieJwtGuard)
    getUserPhoto(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.PhotosService.getUserPhotoServ(body)
    }

    @Patch('like/this/photo')
    @UseGuards(CookieJwtGuard)
    likeThisPhoto(@Body() data: {id: string}, @Request() req) {
        const body = {email: req.user.email, id: data.id}
        this.PhotosService.likePhoto(body)
    }

    @Patch('unlike/photo')
    @UseGuards(CookieJwtGuard)
    unlikeThisPhoto(@Body() data: {id: string}, @Request() req) {
        const body = {email: req.user.email, id: data.id}
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
    @UseGuards(CookieJwtGuard)
    addNewComment(@Body() data: {targetId: string, commentInput: string}, @Request() req) {
        const body = {targetId: data.targetId, commentInput: data.commentInput, email: req.user.email}
        return this.PhotosService.addNewComment(body)
    }

    @Get('get/post/:id')
    getPost(@Param('id') id: string) {
        return this.PhotosService.getPost(id)
    }

    @Patch('perm/comments')
    @UseGuards(CookieJwtGuard)
    permComments(@Body() data: {photoId: string, perm: boolean}, @Request() req) {
        const body = {photoId: data.photoId, perm: data.perm, email: req.user.email}
        return this.PhotosService.permComments(body)
    }
    
    @Delete('delete/photo')
    @UseGuards(CookieJwtGuard)
    deletePhoto(@Body() data: {photoId: string}, @Request() req) {
        const body = {photoId: data.photoId, email: req.user.email}
        this.PhotosService.deletePhoto(body)
    }

    @Patch('delete/comment')
    @UseGuards(CookieJwtGuard)
    deleteComment(@Body() data: {photoId: string, comment: string}, @Request() req) {
        const body = {photoId: data.photoId, comment: data.comment, email: req.user.email}
        return this.PhotosService.deleteComment(body)
    }

}
