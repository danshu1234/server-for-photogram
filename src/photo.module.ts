import { Module, forwardRef } from '@nestjs/common'
import { PhotosService } from './photos/photos.service'
import { PhotosController } from './photos/photos.controller'
import { Photo, PhotoSchema } from './PhotoSchema'
import { User, UserSchema } from './UserSchema'
import { MongooseModule } from '@nestjs/mongoose'
import { UsersModule } from './user.module'
import { PhotoHigh } from './PhotoHighSchema'
import { SocketModule } from './getaway.module'
import { UsersServiceService } from './users-service/users-service.service'
import { RecPhoto, RecPhotoSchema } from './RecPhotoSchema'

@Module({
  providers: [PhotosService],
  controllers: [PhotosController],
  imports: [
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([
      { name: Photo.name, schema: PhotoSchema }, 
      { name: User.name, schema: UserSchema }, 
      { name: RecPhoto.name, schema: RecPhotoSchema },
    ]),
    SocketModule,
  ],
  exports: [PhotosService]
})
export class PhotosModule {}