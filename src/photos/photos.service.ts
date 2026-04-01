import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KeyWord, Photo, PhotoDocument } from 'src/PhotoSchema';
import { User, UserDocument } from 'src/UserSchema';
import { PhotoDto } from './PhotoDto';
import * as sharp from 'sharp';
import { JwtService } from '@nestjs/jwt';
import { SocketGateway } from 'src/socket-getaway';
import { UsersServiceService } from 'src/users-service/users-service.service';
import { HfInference } from '@huggingface/inference';
import { ConfigService } from '@nestjs/config';
import { RecPhoto, RecPhotoDocument } from 'src/RecPhotoSchema';

interface Comment{
    user: string,
    comment: string,
}

@Injectable()
export class PhotosService {

    private hf: HfInference;

    constructor(@InjectModel(Photo.name) private photoModel: Model<PhotoDocument>, @InjectModel(User.name) private userModel: Model<UserDocument>, private jwtService: JwtService, private readonly socketGateway: SocketGateway, @Inject(forwardRef(() => UsersServiceService)) private userService: UsersServiceService, private configService: ConfigService, @InjectModel(RecPhoto.name) private RecPhotoModel: Model<RecPhotoDocument>,) {}

    onModuleInit() {
        const token = this.configService.get('HF_TOKEN');
        if (!token) {
            throw new Error('HF_TOKEN not found in .env');
        }
        this.hf = new HfInference(token);
    }

    async addBase64Photo(photos: any[]) {
        const resultPhotos = await Promise.all(photos.map(async photo => {
            let buffer: Buffer | null = null
            const signature = photo.url.toString('hex', 0, 8)
            if (signature.startsWith('89504e470d0a1a0a')) {
                buffer = await sharp(photo.url.buffer)
                .resize(230, 230)
                .png({ quality: 70 })
                .toBuffer()
            } else if (signature.startsWith('ffd8ff')) {
                buffer = await sharp(photo.url.buffer)
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
                keyWords: photo.keyWords,
            }
        }))
        return resultPhotos
    }

    async sortRecPhotos(email: string, start: number, finish: number) {
        const findUser = await this.userModel.findOne({email: email})
        if (findUser) {
            const difPos = finish - start
            const allPhotosCount = await this.photoModel.aggregate([
                {$group: {
                    _id: null,
                    count: {$sum: 1}
                }},
            ])
            const targetPhotos = await this.photoModel.aggregate([
                {$addFields: {
                    idNum: {$toLong: '$id'},
                }},
                {$sort: {idNum: -1}},
                {$project: {idNum: 0}},
                {$skip: start},
                {$limit: difPos},
            ]).option({lean: true})
            const resultPhotos = await this.addBase64Photo(targetPhotos)
            if (findUser.keyWords.length !== 0) {
                let userLikePhoto: any[] = []
                let userOtherPhoto: any[] = []
                const userKeyWords = findUser.keyWords.map(el => el.label)
                for (let item of resultPhotos) {
                    let userLike: boolean = false
                    for (let keyWord of item.keyWords) {
                        if (userKeyWords.includes(keyWord.label)) {
                            userLike = true
                            break
                        }
                    }
                    if (userLike) {
                        userLikePhoto = [...userLikePhoto, item]
                    } else {
                        userOtherPhoto = [...userOtherPhoto, item]
                    }
                }
                const resultUserPhotos = [...userLikePhoto, ...userOtherPhoto]
                return {
                    photos: resultUserPhotos,
                    allLength: allPhotosCount[0].count,
                }
            } else {
                return {
                    photos: resultPhotos,
                    allLength: allPhotosCount[0].count,
                }
            }
        }
    }

    async createPhoto(photo: {file: Express.Multer.File, data: {id: string, date: string, userPostNotifs: string[], email: string}}) {
        let resultEmail: string = photo.data.email

        const resultBuffer = await sharp(photo.file.buffer)
        .toBuffer()

        const buffer = await sharp(photo.file.buffer)
            .resize(224, 224) 
            .toBuffer()
        
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: 'image/jpeg' });
        
        const result = await this.hf.imageClassification({
            model: 'microsoft/resnet-50',
            data: blob,
        });

        const resultWords = result.slice(0, 5)

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
            keyWords: resultWords,
        })
        await myPhoto.save()

        console.log('User notifs: ')
        console.log(photo.data.userPostNotifs)

        for (let user of photo.data.userPostNotifs) {
            await this.userService.newNotif({resultEmail: resultEmail, userEmail: user, type: 'public'})
        }
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
        if (findThisPhoto) {
            const findUser = await this.userModel.findOne({email: body.email})
            if (findUser) {
                let userKeyWords: KeyWord[] = findUser.keyWords
                const photoKeyWords: KeyWord[] = findThisPhoto.keyWords
                for (let item of photoKeyWords) {
                    const keyWordUser = userKeyWords.find(el => el.label === item.label)
                    if (keyWordUser) {
                        userKeyWords = userKeyWords.map(el => {
                            if (el.label === item.label) {
                                return {
                                    label: el.label,
                                    score: el.score + item.score,
                                }
                            } else {
                                return el
                            }
                        })
                    } else {
                        userKeyWords = [...userKeyWords, item]
                    }
                }
                await this.userModel.findOneAndUpdate({email: body.email}, {keyWords: userKeyWords}, {new: true})
            }
        }
        const prevLikes = findThisPhoto?.likes || []
        if (!findThisPhoto?.likes.includes(body.email)) {
            const newLikes = [...prevLikes, body.email]
            await this.photoModel.findOneAndUpdate({id: body.id}, {likes: newLikes}, {new: true})
            return 'OK'
        }
    }

    async unlikePhoto(body: {email: string, id: string}) {
        const findThisPhoto = await this.photoModel.findOne({id: body.id})
        if (findThisPhoto) {
            const findUser = await this.userModel.findOne({email: body.email})
            if (findUser) {
                let userKeyWords: any = findUser.keyWords
                const photoKeyWords: KeyWord[] = findThisPhoto.keyWords
                for (let item of photoKeyWords) {
                    userKeyWords = userKeyWords.map(el => {
                        if (el.label === item.label) {
                            const actScore = el.score - item.score
                            if (actScore !== 0) {
                                return {
                                    label: el.label,
                                    score: actScore,
                                }
                            } else {
                                return false
                            }
                        } else {
                            return el
                        }
                    })
                    userKeyWords = userKeyWords.filter(el => el !== false)
                    await this.userModel.findOneAndUpdate({email: body.email}, {keyWords: userKeyWords}, {new: true})
                }
            }
        }
        const prevLikes = findThisPhoto?.likes || []
        const newLikes = prevLikes.filter(el => el !== body.email)
        await this.photoModel.findOneAndUpdate({id: body.id}, {likes: newLikes}, {new: true})
        return 'OK'
    }

    async getAll(body: {email: string, start: number, finish: number}) {
        let photosRecUser: any = null
        const recPhoto = await this.sortRecPhotos(body.email, body.start, body.finish)
        photosRecUser = {resultPhotos: recPhoto?.photos, allLength: recPhoto?.allLength}
        return photosRecUser
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

    async addNewComment(body: {email: string, targetId: string, comment: string, type: string, commentId: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const findPhoto = await this.photoModel.findOne({id: body.targetId})
        if (findPhoto?.comments && findUser) {
            const prevComments = findPhoto.comments
            const resultComments = [...prevComments, {user: findUser.email, comment: body.comment, userName: findUser.name, type: body.type, id: body.commentId}]
            await this.photoModel.findOneAndUpdate({id: body.targetId}, {comments: resultComments}, {new: true})
            return 'OK'
        }
    }

    async getPost(id: string) {
        const findPost = await this.photoModel.findOne({id: id})
        return findPost
    }

    async permComments(body: {photoId: string, perm: boolean, email: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
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

    async deleteComment(body: {email: string, photoId: string, commentId: string}) {
        const findUser = await this.userModel.findOne({email: body.email})
        const findPhoto = await this.photoModel.findOne({id: body.photoId})
        if (findUser && findPhoto) {
            const newComments = findPhoto.comments.map(el => {
                if (el.id === body.commentId) {
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
