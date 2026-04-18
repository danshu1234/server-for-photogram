import { Module, forwardRef } from '@nestjs/common';
import { UsersServiceService } from './users-service/users-service.service';
import { UsersControllerController } from './users-controller/users-controller.controller';
import { User, UserSchema } from './UserSchema';
import { Code, CodeSchema } from './CodeSchema';
import { EnterCode, EnterCodeSchema } from './EnterCodeSchema';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketModule } from './getaway.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; 
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';
import { TestingUser, TestingUserSchema } from './TestingUserSchema';
import { Video, VideoSchema } from './VideoSchema';
import { MobileControllerController } from './mobile.controller';
import { PhotoHigh, PhotoHighSchema } from './PhotoHighSchema';
import { Ava, AvaSchema } from './AvaSchema';
import { PlanMess, PlanMessSchema } from './PlanMessSchema';
import { NewTestingUser, NewTestingUserSchema } from './NewTestingUserShema';
import { TestProcessor } from './test.processor';
import { BullModule } from '@nestjs/bull';
import { Photo, PhotoSchema } from './PhotoSchema';
import { PhotosService } from './photos/photos.service';
import { PhotosModule } from './photo.module';
import { Chat, ChatSchema } from './ChatSchema';

@Module({
    providers: [UsersServiceService, GoogleStrategy, TestProcessor],
    controllers: [UsersControllerController, MobileControllerController],
    imports: [
        forwardRef(() => PhotosModule),
        ConfigModule.forRoot({
            isGlobal: true, 
            envFilePath: '.env', 
        }),
        BullModule.registerQueue({ 
            name: 'test-queue',   
            defaultJobOptions: {
                timeout: 3600000, 
            },
        }),
        MongooseModule.forFeature([
            {name: User.name, schema: UserSchema}, 
            {name: Code.name, schema: CodeSchema}, 
            {name: EnterCode.name, schema: EnterCodeSchema},
            {name: TestingUser.name, schema: TestingUserSchema},
            {name: Video.name, schema: VideoSchema},
            {name: PhotoHigh.name, schema: PhotoHighSchema},
            {name: Ava.name, schema: AvaSchema},
            {name: PlanMess.name, schema: PlanMessSchema},
            {name: NewTestingUser.name, schema: NewTestingUserSchema},
            {name: Photo.name, schema: PhotoSchema},
            {name: Chat.name, schema: ChatSchema},
        ]), 
        SocketModule,
        PassportModule,
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
    exports: [JwtModule, UsersServiceService, PassportModule],
})
export class UsersModule {}