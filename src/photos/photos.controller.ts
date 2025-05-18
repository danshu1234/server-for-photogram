import { Controller, Post, Body, Get, Param, Delete, Patch } from '@nestjs/common';
import { PhotosService } from './photos.service';

@Controller('photos')
export class PhotosController {

    constructor(private readonly PhotosService: PhotosService){}

    @Post('create')
    createNewPhoto(@Body() photo: {id: string, email: string, img: string, date: string, descript: string}) {
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

}
