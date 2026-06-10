import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { Chat, ChatSchema } from '../ChatSchema';
import { Photo, PhotoSchema } from '../PhotoSchema';
import { User, UserSchema } from 'src/UserSchema';
import { GroupAva, GroupAvaSchema } from 'src/GroupAvaSchema';
import { SocketModule } from 'src/getaway.module';
import { PhotoHigh, PhotoHighSchema } from 'src/PhotoHighSchema';
import { PlanMess, PlanMessSchema } from 'src/PlanMessSchema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; 

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Chat.name, schema: ChatSchema },
            { name: Photo.name, schema: PhotoSchema },
            { name: User.name, schema: UserSchema },
            { name: GroupAva.name, schema: GroupAvaSchema },
            { name: PhotoHigh.name, schema: PhotoHighSchema },
            { name: PlanMess.name, schema: PlanMessSchema },
        ]),
        SocketModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { 
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h') 
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [ChatsController],
    providers: [ChatsService],
    exports: [ChatsService],
})
export class ChatsModule {}