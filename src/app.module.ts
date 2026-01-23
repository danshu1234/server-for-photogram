import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { PhotosModule } from './photo.module';
import { SocketModule } from './getaway.module';
import { OpenAIModule } from './openai.module';
import { TestingUsersModule } from './testing-users/testing-users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from './mail.module';
import { User } from './testing-users/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_DB_URI_1'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    MailModule,
    PhotosModule,
    SocketModule,
    OpenAIModule,
    TestingUsersModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [User],
      autoLoadEntities: true,
      synchronize: true,
    }),
    ScheduleModule.forRoot({})
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}