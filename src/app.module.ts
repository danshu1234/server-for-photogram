import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { PhotosModule } from './photo.module';
import { SocketModule } from './getaway.module';

@Module({
  imports: [UsersModule, MongooseModule.forRoot('mongodb+srv://myBase:malfeya227@cluster0.gfyldwo.mongodb.net/blog'), PhotosModule, MongooseModule.forRoot('mongodb+srv://kawocih390:kjU8765@cluster0.epmnoxx.mongodb.net/blog'), SocketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
