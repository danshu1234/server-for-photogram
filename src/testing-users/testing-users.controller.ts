import { Body, Controller, Get, Post, Patch, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { TestingUsersService } from './testing-users.service';
import { JwtAuthGuard } from 'jwt-auth.guard';
import { ChangePassDto } from './ChangePassDto';

@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}


}

