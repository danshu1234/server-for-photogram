import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Photo, PhotoDocument } from 'src/PhotoSchema';

interface Comment{
    user: string,
    comment: string,
}

@Injectable()
export class PhotosService {

    constructor(@InjectModel(Photo.name) private photoModel: Model<PhotoDocument>) {}

    async createPhoto(photo: {id: string, resultEmail: string, img: string[], date: string, descript: string}) {
        const myPhoto = new this.photoModel({
            id: photo.id,
            url: photo.img,
            email: photo.resultEmail,
            likes: [],
            date: photo.date,
            descript: photo.descript,
            comments: [],
            commentsPerm: true,
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
        return {
            url: findPhoto?.url,
            info: findPhoto,
        }
    }

    async getComments(photoId: string) {
        const findPhoto = await this.photoModel.findOne({id: photoId})
        return findPhoto?.comments
    }

    async addNewComment(body: {resultComment: Comment, targetId: string}) {
        const findPhoto = await this.photoModel.findOne({id: body.targetId})
        if (findPhoto?.comments) {
            const prevComments = findPhoto.comments
            const resultComments = [...prevComments, body.resultComment]
            await this.photoModel.findOneAndUpdate({id: body.targetId}, {comments: resultComments}, {new: true})
            return 'OK'
        }
    }

    async getPost(id: string) {
        const findPost = await this.photoModel.findOne({id: id})
        return findPost
    }

    async permComments(body: {photoId: string, perm: boolean}) {
        await this.photoModel.findOneAndUpdate({id: body.photoId}, {commentsPerm: body.perm})
    }

  
}
