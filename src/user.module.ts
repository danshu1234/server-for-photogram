import { Module } from '@nestjs/common'
import { UsersServiceService } from './users-service/users-service.service'
import { UsersControllerController } from './users-controller/users-controller.controller'
import { User, UserSchema } from './UserSchema'
import { MongooseModule } from '@nestjs/mongoose'
import { SocketModule } from './getaway.module'


@Module({
    providers: [UsersServiceService],
    controllers: [UsersControllerController],
    imports: [MongooseModule.forFeature([{name: User.name, schema: UserSchema}]), SocketModule],
})

export class UsersModule {}