import { Body, Controller, Get, Post, Patch, Delete, Param } from '@nestjs/common';
import { TestingUsersService } from './testing-users.service';
import { GenerateUsersDto } from './generate-users.dto';

@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}

    @Post('create/user')
    createUser() {
        this.TestingUsersService.createUser()
    }

    @Get('get/all/users') 
    getAllUsers() {
        return this.TestingUsersService.getAllUsers()
    }

}
