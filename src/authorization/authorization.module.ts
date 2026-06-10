import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AuthorizationController } from './authorization.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/UserSchema';
import { TestingUser, TestingUserSchema } from 'src/TestingUserSchema';
import { Code, CodeSchema } from 'src/CodeSchema';
import { EnterCode, EnterCodeSchema } from 'src/EnterCodeSchema';
import { NewTestingUser, NewTestingUserSchema } from 'src/NewTestingUserShema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SocketModule } from 'src/getaway.module';
import { GoogleStrategy } from 'src/google.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TestingUser.name, schema: TestingUserSchema },
      { name: Code.name, schema: CodeSchema },
      { name: EnterCode.name, schema: EnterCodeSchema },
      { name: NewTestingUser.name, schema: NewTestingUserSchema },
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
  controllers: [AuthorizationController],
  providers: [AuthorizationService, GoogleStrategy],
})
export class AuthorizationModule {}
