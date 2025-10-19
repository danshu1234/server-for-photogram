import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Photo, PhotoDocument } from 'src/PhotoSchema';
import { User, UserDocument } from 'src/UserSchema';
import { PhotoDto } from './PhotoDto';
import * as sharp from 'sharp';
import { JwtService } from '@nestjs/jwt';

interface Comment{
    user: string,
    comment: string,
}

@Injectable()
export class PhotosService {

    constructor(@InjectModel(Photo.name) private photoModel: Model<PhotoDocument>, @InjectModel(User.name) private userModel: Model<UserDocument>, private jwtService: JwtService) {}

    async createPhoto(photo: {file: Express.Multer.File, data: {id: string, date: string, email: string}}) {
        let resultEmail: string = photo.data.email

        const resultBuffer = await sharp(photo.file.buffer)
        .toBuffer()

        const myPhoto = new this.photoModel({
            id: photo.data.id,
            url: resultBuffer,
            email: resultEmail,
            likes: [],
            date: photo.data.date,
            descript: '',
            comments: [],
            commentsPerm: true,
            pin: false,
        })
        await myPhoto.save()
        return 'OK'
    }

    async getUserPhotoServ(body: {email: string, trueParamEmail: string}) {
        const targetUser = await this.userModel.findOne({email: body.trueParamEmail})
            if (targetUser?.open === true || targetUser?.email === body.email || targetUser?.permUsers.includes(body.email)) {
                const resultPhotos = await this.photoModel.find({email: targetUser?.email})
                const finalPhotos = resultPhotos.reverse()
                const resultUserPhotos = await Promise.all(finalPhotos.map(async photo => {
                let buffer: Buffer | null = null
                const signature = photo.url.toString('hex', 0, 8)
                if (signature.startsWith('89504e470d0a1a0a')) {
                    buffer = await sharp(photo.url)
                    .resize(250, 250)
                    .png({ quality: 70 })
                    .toBuffer()
                } else if (signature.startsWith('ffd8ff')) {
                    buffer = await sharp(photo.url)
                    .resize(250, 250)
                    .jpeg({ quality: 70 })
                    .toBuffer()
                }
                    const resultImageBase64 = `data:image/jpeg;base64,${buffer?.toString('base64')}`
                    return {
                        url: resultImageBase64,
                        id: photo.id,
                        likes: photo.likes,
                        email: photo.email,
                        date: photo.date,
                        descript: photo.descript,
                        comments: photo.comments,
                        commentsPerm: photo.commentsPerm,
                        pin: photo.pin,
                    }
                }))
                return {
                    type: 'photos',
                    photos: resultUserPhotos,
                }
            } else {
                const targetUserNotifs = targetUser?.notifs
                if (targetUserNotifs) {
                    let myCount = 0
                    for (let item of targetUserNotifs) {
                        if (item.type === 'perm' && item.user === body.email) {
                            myCount+=1
                        }
                    }
                    if (myCount !== 0) {
                        return {
                            type: 'send',
                            photos: [],
                        }
                    } else {
                        return {
                            type: 'unsend',
                            photos: [],
                        }
                    }
                }
            }
    }

    async likePhoto(body: {email: string, id: string}) {
        const findThisPhoto = await this.photoModel.findOne({id: body.id})
        const prevLikes = findThisPhoto?.likes || []
        if (!findThisPhoto?.likes.includes(body.email)) {
            const newLikes = [...prevLikes, body.email]
            await this.photoModel.findOneAndUpdate({id: body.id}, {likes: newLikes}, {new: true})
        }
    }

    async unlikePhoto(body: {email: string, id: string}) {
        const findThisPhoto = await this.photoModel.findOne({id: body.id})
        const prevLikes = findThisPhoto?.likes || []
            const newLikes = prevLikes.filter(el => el !== body.email)
            await this.photoModel.findOneAndUpdate({id: body.id}, {likes: newLikes}, {new: true})
    }

    async getAll(body: {start: number, finish: number}) {
        const allPhotosArr = await this.photoModel.find()
        const targetPhotos = allPhotosArr.reverse().slice(body.start, body.finish)
        const resultPhotos = await Promise.all(targetPhotos.map(async photo => {
            let buffer: Buffer | null = null
            const signature = photo.url.toString('hex', 0, 8)
            if (signature.startsWith('89504e470d0a1a0a')) {
                buffer = await sharp(photo.url)
                .resize(230, 230)
                .png({ quality: 70 })
                .toBuffer()
            } else if (signature.startsWith('ffd8ff')) {
                buffer = await sharp(photo.url)
                .resize(250, 250)
                .jpeg({ quality: 70 })
                .toBuffer()
            }
            const resultImageBase64 = `data:image/jpeg;base64,${buffer?.toString('base64')}`
            return {
                url: resultImageBase64,
                id: photo.id,
                likes: photo.likes,
                email: photo.email,
                date: photo.date,
                descript: photo.descript,
                comments: photo.comments,
                commentsPerm: photo.commentsPerm,
                pin: photo.pin,
            }
        }))
        return {
            photos: resultPhotos,
            allLength: allPhotosArr.length,
        }
    }

    async getPhotoById(photoId: string) {
        const findPhoto = await this.photoModel.findOne({id: photoId})
        return findPhoto?.url
    }

    async getPhotoInfo(photoId: string) {
        const findPhoto = await this.photoModel.findOne({id: photoId}).lean()
        const resultInfo = {...findPhoto, url: ''}
        return resultInfo
    }

    async getComments(photoId: string) {
        const findPhoto = await this.photoModel.findOne({id: photoId})
        return findPhoto?.comments
    }

    async addNewComment(body: {email: string, targetId: string, commentInput: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const findPhoto = await this.photoModel.findOne({id: body.targetId})
        if (findPhoto?.comments && findUser) {
            const prevComments = findPhoto.comments
            const resultComments = [...prevComments, {user: findUser.email, comment: body.commentInput, userName: findUser.name}]
            await this.photoModel.findOneAndUpdate({id: body.targetId}, {comments: resultComments}, {new: true})
            return 'OK'
        }
    }

    async getPost(id: string) {
        const findPost = await this.photoModel.findOne({id: id})
        return findPost
    }

    async permComments(body: {photoId: string, perm: boolean, email: string}) {
        const findUser = await this.userModel.findOne({code: body.email})
        const findPhoto = await this.photoModel.findOne({id: body.photoId})
        if (findUser && findPhoto) {
            if (findUser.email === findPhoto.email) {
                await this.photoModel.findOneAndUpdate({id: body.photoId}, {commentsPerm: body.perm})
                return 'OK'
            }
        }
    }

    async deletePhoto(body: {photoId: string, email: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const findPhoto = await this.photoModel.findOne({id: body.photoId})
        if (findUser && findPhoto) {
            if (findUser.email === findPhoto.email) {
                await this.photoModel.findOneAndDelete({id: body.photoId})
            }
        }
    }

    async deleteComment(body: {email: string, photoId: string, comment: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const findPhoto = await this.photoModel.findOne({id: body.photoId})
        if (findUser && findPhoto) {
            const newComments = findPhoto.comments.map(el => {
                if (el.user === findUser.email && el.comment === body.comment) {
                    return false
                } else {
                    return el
                }
            }).filter(el => el !== false)
            await this.photoModel.findOneAndUpdate({id: body.photoId}, {comments: newComments}, {new: true})
            return 'OK'
        }
    }

}
