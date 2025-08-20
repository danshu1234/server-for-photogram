import { Body, Controller, Get, Post, Patch, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { TestingUsersService } from './testing-users.service';
import { JwtAuthGuard } from 'jwt-auth.guard';
import { ChangePassDto } from './ChangePassDto';

@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}

    @Get('get/all/users') 
    getAllUsers() {
        return this.TestingUsersService.getAllUsers()
    }

    @Get('get/token')
    getToken() {
        return this.TestingUsersService.getToken()
    }

    @Get('get/email/:token')
    getEmail(@Param('token') token: string) {
        return this.TestingUsersService.getEmail(token)
    }

    @Get('get/data')
    @UseGuards(JwtAuthGuard)
    getData() {
        return this.TestingUsersService.getData()
    }

    @Get('hash/pass/:pass')
    hashPass(@Param('pass') pass: string) {
        return this.TestingUsersService.hashPass(pass)
    }

    @Get('check/token/:token')
    checkToken(@Param('token') token: string) {
        return this.TestingUsersService.checkToken(token)
    }

    @Post('enter')
    enter(@Body() body: {login: string, password: string}) {
        return this.TestingUsersService.enter(body)
    }

    @UseGuards(JwtAuthGuard)
    @Get('get/user/data')
    userData(@Request() req) {
        return this.TestingUsersService.userData(req.user)
    }

    @UseGuards(JwtAuthGuard)
    @Get('get/user/name')
    userName(@Request() req) {
        return this.TestingUsersService.userName(req.user)
    }

    @Patch('change/pass')
    changePass(@Body() body: ChangePassDto) {
        return this.TestingUsersService.changePass(body)
    }

}

