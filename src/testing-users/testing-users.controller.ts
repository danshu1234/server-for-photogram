import { Body, Controller, Get, Post, Patch, Delete, Param, UseGuards, Request, UseInterceptors, Req } from '@nestjs/common';
import { TestingUsersService } from './testing-users.service';
import { JwtAuthGuard } from 'jwt-auth.guard';
import { ChangePassDto } from './ChangePassDto';
import { UserDto } from './user.dto';

@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}
    
    @Post('enter')
    enterUser(@Body() body: {login: string, pass: string}) {
        return this.TestingUsersService.enterUser(body)
    }
    
    @Get('get/name')
    @UseGuards(JwtAuthGuard)
    getName(@Request() req) {
        return this.TestingUsersService.getName(req.user.email)
    }

    @Patch('get/access/token')
    getAccessToken(@Body() body: {refreshToken: string}) {
        return this.TestingUsersService.getAccessToken(body)
    }

    @Delete('exit/from/all')
    @UseGuards(JwtAuthGuard)
    exitFromAll(@Request() req) {
        this.TestingUsersService.exitFromAll(req.user.email)
    }

}

