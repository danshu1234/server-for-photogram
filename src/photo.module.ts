import { Module } from '@nestjs/common'
import { PhotosService } from './photos/photos.service'
import { PhotosController } from './photos/photos.controller'
import { Photo, PhotoSchema } from './PhotoSchema'
import { User, UserSchema } from './UserSchema'
import { MongooseModule } from '@nestjs/mongoose'
import { UsersModule } from './user.module'

@Module({
  providers: [PhotosService],
  controllers: [PhotosController],
  imports: [
    MongooseModule.forFeature([
      { name: Photo.name, schema: PhotoSchema }, 
      { name: User.name, schema: UserSchema },   
    ]),
    UsersModule,
  ],
})
export class PhotosModule {}