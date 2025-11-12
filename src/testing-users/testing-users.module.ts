import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { TestingUsersController } from './testing-users.controller';
import { TestingUsersService } from './testing-users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { NewTestingUserSchema, NewTestingUser } from 'src/NewTestingUserShema';
import { SocketModule } from '../getaway.module';
import { UsersModule } from 'src/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MongooseModule.forFeature([{name: NewTestingUser.name, schema: NewTestingUserSchema}]), SocketModule, UsersModule],
  providers: [TestingUsersService],
  controllers: [TestingUsersController],
})
export class TestingUsersModule {}