import { Module } from '@nestjs/common';
import { OpenAIController } from './openai.controller';
import { OpenAIService } from './openai.service';
import { User, UserSchema } from './UserSchema'
import { MongooseModule } from '@nestjs/mongoose'
import { UsersModule } from './user.module'

@Module({
  controllers: [OpenAIController],
  providers: [OpenAIService],
  exports: [OpenAIService], 
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },   
    ]),
    UsersModule,
  ],
})
export class OpenAIModule {}