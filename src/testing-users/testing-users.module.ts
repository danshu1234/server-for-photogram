import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { TestingUsersController } from './testing-users.controller';
import { TestingUsersService } from './testing-users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TestingUserSchema, TestingUser } from 'src/TestingUserSchema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MongooseModule.forFeature([{name: TestingUser.name, schema: TestingUserSchema}]),
  JwtModule.register({ 
      secret: 'fiejwfijewfjucijwfokekfwio0ewjfgiejwfgoj',
      signOptions: { expiresIn: '5m' },
  }),
  ],
  providers: [TestingUsersService],
  controllers: [TestingUsersController],
})
export class TestingUsersModule {}