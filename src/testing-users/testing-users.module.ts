import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { TestingUsersController } from './testing-users.controller';
import { TestingUsersService } from './testing-users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TestingUserSchema, TestingUser } from 'src/TestingUserSchema';
import { SocketModule } from '../getaway.module';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from 'src/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MongooseModule.forFeature([{name: TestingUser.name, schema: TestingUserSchema}]), SocketModule, UsersModule],
  providers: [TestingUsersService],
  controllers: [TestingUsersController],
})
export class TestingUsersModule {}