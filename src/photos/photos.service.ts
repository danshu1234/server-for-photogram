import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Photo, PhotoDocument } from 'src/PhotoSchema';

@Injectable()
export class PhotosService {

    constructor(@InjectModel(Photo.name) private photoModel: Model<PhotoDocument>) {}

    async createPhoto(photo: {id: string, email: string, img: string, date: string}) {
        const myPhoto = new this.photoModel({
            id: photo.id,
            url: photo.img,
            email: photo.email,
            likes: [],
            date: photo.date,
        })
        await myPhoto.save()
    }

    async getUserPhotoServ(email: string) {
        const userPhotos = await this.photoModel.find({email: email})
        return userPhotos
    }

    async likePhoto(body: {email: string, id: string}) {
        const findThisPhoto = await this.photoModel.findOne({id: body.id})
        const prevLikes = findThisPhoto?.likes || []
        const newLikes = [...prevLikes, body.email]
        await this.photoModel.findOneAndUpdate({id: body.id}, {likes: newLikes}, {new: true})
    }

    async unlikePhoto(body: {email: string, id: string}) {
        const findThisPhoto = await this.photoModel.findOne({id: body.id})
        const prevLikes = findThisPhoto?.likes || []
        const newLikes = prevLikes.filter(el => el !== body.email)
        await this.photoModel.findOneAndUpdate({id: body.id}, {likes: newLikes}, {new: true})
    }

    async deletePhoto(body: {photoId: string}) {
        await this.photoModel.findOneAndDelete({id: body.photoId})
    }

    async getAll() {
        const allPhotosArr = await this.photoModel.find()
        return allPhotosArr
    }

    async getPhotoById(photoId: string) {
        const findPhoto = await this.photoModel.findOne({id: photoId})
        return findPhoto?.url
    }

}
