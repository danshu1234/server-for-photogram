import { Controller, Post, Body, Get, Param, Delete, Patch } from '@nestjs/common';
import { PhotosService } from './photos.service';

interface Comment{
    user: string,
    comment: string,
}

@Controller('photos')
export class PhotosController {

    constructor(private readonly PhotosService: PhotosService){}

    @Post('create')
    createNewPhoto(@Body() photo: {id: string, resultEmail: string, img: string[], date: string, descript: string}) {
        this.PhotosService.createPhoto(photo)
    }

    @Get('get/user/photos/:email')
    getUserPhoto(@Param('email') email: string) {
        return this.PhotosService.getUserPhotoServ(email)
    }

    @Patch('like/this/photo')
    likeThisPhoto(@Body() body: {email: string, id: string}) {
        this.PhotosService.likePhoto(body)
    }

    @Patch('unlike/photo')
    unlikeThisPhoto(@Body() body: {email: string, id: string}) {
        this.PhotosService.unlikePhoto(body)
    }

    @Delete('delete/photo')
    deleteUserPhoto(@Body() body: {photoId: string}) {
        this.PhotosService.deletePhoto(body)
    }

    @Get('all')
    getAllPhotos() {
        return this.PhotosService.getAll()
    }

    @Get('big/photo/:photoId')
    getPhotoById(@Param('photoId') photoId: string) {
        return this.PhotosService.getPhotoById(photoId)
    }

    @Get('comments/:photoId')
    getComments(@Param('photoId') photoId: string) {
        return this.PhotosService.getComments(photoId)
    }

    @Patch('new/comment')
    addNewComment(@Body() body: {resultComment: Comment, targetId: string}) {
        return this.PhotosService.addNewComment(body)
    }

    @Get('get/post/:id')
    getPost(@Param('id') id: string) {
        return this.PhotosService.getPost(id)
    }

    @Patch('perm/comments')
    permComments(@Body() body: {photoId: string, perm: boolean}) {
        this.PhotosService.permComments(body)
    }

}
