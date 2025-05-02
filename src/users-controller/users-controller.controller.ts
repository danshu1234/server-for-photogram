import { Controller, Get, Body, Post, Param, Patch } from '@nestjs/common';
import { UsersServiceService } from 'src/users-service/users-service.service';

@Controller('users-controller')
export class UsersControllerController {

    constructor(private readonly UsersService: UsersServiceService){}

    @Post('create/new/user')
    createNewUser(@Body() user: {resultEmail: string, resultName: string}) {
        this.UsersService.createUser(user)
    }

    @Get('check/user/:email')
    checkEmailUser(@Param('email') email: string) {
        return this.UsersService.checkUser(email)
    }

    @Get('all/subs/:email')
    getAllSubs(@Param('email') email: string) {
        return this.UsersService.getSubs(email)
    }

    @Patch('unsub')
    unSubUser(@Body() body: {targetEmail: string, email: string}) {
        this.UsersService.unSub(body)
    }

    @Patch('sub')
    subUser(@Body() body: {targetEmail: string, email: string}) {
        this.UsersService.sub(body)
    }

    @Patch('add/socket')
    addSocket(@Body() body: {email: string , socketId: string}) {
        this.UsersService.addSocket(body)
    }

    @Patch('clear/socket')
    clearSocket(@Body() body: {email: string}) {
        this.UsersService.clearSocket(body)
    }

    @Get('get/notifs/:email')
    getNotifs(@Param('email') email: string) {
        return this.UsersService.getNotifs(email)
    }

    @Patch('new/notif')
    newNotif(@Body() body: {email: string, userEmail: string}) {
        this.UsersService.newNotif(body)
    }

    @Patch('clear/notifs')
    clearNotifs(@Body() body: {email: string}) {
        this.UsersService.clearNotifs(body)
    }

}
