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
import { RedisModule } from './redis.module';
import { ChatsModule } from './chats/chats.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [
        ConfigModule,
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: 'schema.gql',  
            playground: true,    
            context: ({ req, res }) => ({
              req,
              res,
              cookies: req.cookies,
            })           
        }),
      ],
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
    ScheduleModule.forRoot({}),
    RedisModule,
    ChatsModule,
    AuthorizationModule,
        ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [User],
        synchronize: true, 
        logging: true,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}