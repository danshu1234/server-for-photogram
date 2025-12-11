import { Module } from '@nestjs/common';
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

@Module({
    providers: [UsersServiceService, GoogleStrategy],
    controllers: [UsersControllerController],
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, 
            envFilePath: '.env', 
        }),
        MongooseModule.forFeature([
            {name: User.name, schema: UserSchema}, 
            {name: Code.name, schema: CodeSchema}, 
            {name: EnterCode.name, schema: EnterCodeSchema},
            {name: TestingUser.name, schema: TestingUserSchema},
            {name: Video.name, schema: VideoSchema},
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
        })
    ],
    exports: [JwtModule, UsersServiceService, PassportModule],
})
export class UsersModule {}