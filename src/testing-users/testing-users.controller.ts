import { Controller, Get, Post, UseInterceptors, UploadedFile, Res, Param, Body, Patch, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestingUsersService } from './testing-users.service';
import { Response } from 'express';
import Message from './MessInterface';


@Controller('testing-users')
export class TestingUsersController {

    constructor(private readonly TestingUsersService: TestingUsersService) {}


    // @Post('add/user')
    // createUser(@Body() body: {name: string, age: number, id: string}) {
    //     return this.TestingUsersService.createUser(body)
    // }

    // @Get('get/user/:id')
    // getUser(@Param('id') id: string) {
    //     return this.TestingUsersService.getUser(id)
    // }

    // @Patch('new/name')
    // updateName(@Body() body: {userName: string, id: string}) {
    //     this.TestingUsersService.updateUserName(body)
    // }

    // @Delete('delete/user')
    // deleteUser(@Body() body: {id: string}) {
    //     this.TestingUsersService.deleteUser(body)
    // }

    // @Post('create/users')
    // createUsers() {
    //     this.TestingUsersService.createUsers()
    // }

    // @Get('get/users')
    // getUsers() {
    //     return this.TestingUsersService.getUsers()
    // }

    // @Post('move/user')
    // moveUser(@Body() body: {higlightUser: string, type: string}) {
    //     this.TestingUsersService.moveUser(body)
    // }

    // @Post('move/all/users')
    // moveAllUsers(@Body() body: {type: string}) {
    //     this.TestingUsersService.moveAllUsers(body)
    // }

    // @Post('distribute/users')
    // distributeUsers() {
    //     return this.TestingUsersService.distributeUsers()
    // }

    // @Post('users/reverse')
    // usersReverse() {
    //     this.TestingUsersService.usersReverse()
    // }

    // @Post('condition/send')
    // conditionSend(@Body() body: {age: string, sign: string, base: string}) {
    //     return this.TestingUsersService.conditionSend(body)
    // }

    // @Post('split/gender')
    // splitGender() {
    //     return this.TestingUsersService.splitGender()
    // }

    // @Get('alphabet/users')
    // alphabetUsers() {
    //     return this.TestingUsersService.alphabetUsers()
    // }

    // @Post('explore/photo')
    // @UseInterceptors(FileInterceptor('photo'))
    // createNewPhoto(@UploadedFile() file: Express.Multer.File) {
    //     this.TestingUsersService.explorePhoto(file)
    // }


    @Post('create/user')
    createUserTest() {
        this.TestingUsersService.createUserTest()
    }

    @Patch('add/friends')
    addFriends() {
        this.TestingUsersService.addFriends()
    }

}   