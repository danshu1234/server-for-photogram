import { Controller, Get, Body, Post, Param, Patch, UseInterceptors, UploadedFiles, UseGuards, Request } from '@nestjs/common';
import { UsersServiceService } from 'src/users-service/users-service.service';
import Message from 'src/Message';
import EmailAndTrueParamEmail from 'src/emailInterface';
import { EmailDto } from 'src/EmailDto';
import { UserDto } from './UserDto';
import { NewUserDto } from 'src/NewUserDto';
import { CreateUser } from 'src/CreateUser';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'jwt-auth.guard';

@Controller('users-controller')
export class UsersControllerController {

    constructor(private readonly UsersService: UsersServiceService){}


    @Post('enter')
    enter(@Body() body: {login: string, password: string}) {
        return this.UsersService.enter(body)
    }

    @Get('check/find/user/:email')
    checkFindUser(@Param('email') email: string) {
        return this.UsersService.checkFindUser(email)
    }

    @Get('all/subs/and/country')
    @UseGuards(JwtAuthGuard)
    getAllSubs(@Request() req) {
        return this.UsersService.getSubs(req.user.email)
    }

    @Patch('unsub')
    unSubUser(@Body() body: {targetEmail: string, resultEmail: string}) {
        this.UsersService.unSub(body)
    }

    @Patch('sub')
    subUser(@Body() body: {targetEmail: string, resultEmail: string}) {
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

    @Get('get/notifs')
    @UseGuards(JwtAuthGuard)
    getNotifs(@Request() req) {
        return this.UsersService.getNotifs(req.user.email)
    }

    @Patch('new/notif')
    newNotif(@Body() body: {resultEmail: string, userEmail: string, photoId?: string, type: string}) {
        this.UsersService.newNotif(body)
    }

    @Patch('clear/notifs')
    @UseGuards(JwtAuthGuard)
    clearNotifs(@Request() req) {
        return this.UsersService.clearNotifs(req.user.email)
    }

    @Get('get/banned/users/:email')
    getBannedUsers(@Param('email') email: string) {
        return this.UsersService.getBannedUsers(email)
    }

    @Post('add/banned/user')
    addBannedUser(@Body() body: {userEmail: string, email: string}) {
        this.UsersService.addBannedUser(body)
    }

    @Patch('update/visits')
    updateVisits(@Body() body: {email: string, targetEmail: string}) {
        return this.UsersService.updateVisits(body)
    }

    @Get('get/reports/:email')
    checkReport(@Param('email') email: string) {
        return this.UsersService.checkReport(email)
    }

    @Patch('new/report')
    newReport(@Body() body: {targetEmail: string, email: string}) {
        this.UsersService.newReport(body)
    }

    @Get('check/delete/:email')
    checkDelete(@Param('email') email: string) {
        return this.UsersService.checkDelete(email)
    }

    @Patch('add/video')
    addVideo(@Body() body: {email: string, video: string}) {
        this.UsersService.addVideo(body)
    }

    @Get('get/user/name/:email') 
    getName(@Param('email') email: string) {
        return this.UsersService.getName(email)
    }

    @Get('get/email')
    @UseGuards(JwtAuthGuard)
    getEmail(@Request() req) {
        return req.user.email
    }

    @Get('get/avatar')
    @UseGuards(JwtAuthGuard)
    getAva(@Request() req) {
        return this.UsersService.getAva(req.user.email)
    }

    @Patch('new/avatar')
    @UseGuards(JwtAuthGuard)
    newAvatar(@Body() data: {newAva: string}, @Request() req) {
        const resultEmail: string = req.user.email
        const body = {targetEmail: resultEmail, newAva: data.newAva}
        this.UsersService.newAvatar(body)
    }

    @Get('get/all/users')
    getAllUsers() {
        return this.UsersService.getAllUsers()
    }

    @Get('check/open')
    @UseGuards(JwtAuthGuard)
    checkOpen(@Request() req) {
        return this.UsersService.checkOpen(req.user.email)
    }

    @Patch('close/acc')
    @UseGuards(JwtAuthGuard)
    closeAcc(@Request() req) {
        return this.UsersService.closeAcc(req.user.email)
    }

    @Patch('open/acc')
    @UseGuards(JwtAuthGuard)
    openAcc(@Request() req) {
        return this.UsersService.openAcc(req.user.email)
    }

    @Patch('check/perm/status')
    checkPerm(@Body() body: {trueParamEmail: string, email: string}) {
        return this.UsersService.checkPerm(body)
    }

    @Patch('new/perm/user')
    newPermUser(@Body() body: {newUserEmail: string, email: string}) {
        this.UsersService.newPermUser(body)
    }

    @Patch('delete/perm')
    deletePerm(@Body() body: {user: string, email: string}) {
        return this.UsersService.deletePerm(body)
    }

    @Get('get/close/users')
    getCloseUsers() {
        return this.UsersService.getCloseUsers()
    }

    @Get('get/user/data/:email')
    getUserData(@Param('email') email: string) {
        return this.UsersService.getUserData(email)
    }

    @Get('get/chats/:email')
    getChats(@Param('email') email: string) {
        return this.UsersService.getChats(email)
    }

    @Post('get/mess')
    getMess(@Body() body: EmailAndTrueParamEmail) {
        return this.UsersService.getMess(body)
    }

    @Patch('new/mess')
    @UseInterceptors(FilesInterceptor('photo'))
    newMess(@UploadedFiles() files: Express.Multer.File[], @Body() body: {user: string, text: string, date: string, id: string, ans: string, type: string, code: string, trueParamEmail: string, per: string}) {
        const resultData = {...body, files: files}
        this.UsersService.newMess(resultData)
    }

    @Patch('new/chat')
    @UseInterceptors(FilesInterceptor('photo'))
    newChat(@UploadedFiles() files: Express.Multer.File[], @Body() body: {user: string, text: string, date: string, id: string, ans: string, type: string, code: string, trueParamEmail: string, per: string}) {
        const resultData = {...body, files: files}
        this.UsersService.newChat(resultData)
    }

    @Patch('zero/mess')
    zeroMess(@Body() body: EmailAndTrueParamEmail) {
        this.UsersService.zeroMess(body)
    }

    @Post('typing')
    typing(@Body() body: EmailAndTrueParamEmail) {
        this.UsersService.typingUser(body)
    }

    @Get('get/ban/mess/:trueParamEmail')
    getBanMess(@Param('trueParamEmail') trueParamEmail: string) {
        return this.UsersService.getBanMess(trueParamEmail)
    }

    @Get('get/my/ban/mess/:email')
    getMyBanMess(@Param('email') email: string) {
        return this.UsersService.getBanMess(email)
    }

    @Patch('ban/user')
    banUser(@Body() body: EmailAndTrueParamEmail) {
        this.UsersService.banUser(body)
    }

    @Patch('unban/user')
    unbanUser(@Body() body: EmailAndTrueParamEmail) {
        this.UsersService.unbanUser(body)
    }

    @Patch('delete/mess')
    deleteMess(@Body() body: {email: string, trueParamEmail: string, index: number, messId: string}) {
        return this.UsersService.deleteMess(body)
    }

    @Post('get/mess/count')
    messCount(@Body()  body: EmailAndTrueParamEmail) {
        return this.UsersService.messCount(body)
    }

    @Patch('edit/mess')
    editMess(@Body() body: {email: string, trueParamEmail: string, editMess: string, inputMess: string, per: string}) {
        return this.UsersService.editMess(body)
    }

    @Get('get/perm/mess/:email')
    getPerm(@Param('email') email: string) {
        return this.UsersService.getPerm(email)
    }

    @Patch('new/perm/mess')
    newMessPerm(@Body() body: {email: string, changePerm: string}) {
        this.UsersService.newMessPerm(body)
    }

    @Post('get/perm/data')
    getPermData(@Body() body: EmailAndTrueParamEmail) {
        return this.UsersService.getPermData(body)
    }

    @Post('start/voice')
    startVoice(@Body() body: EmailAndTrueParamEmail) {
        this.UsersService.startVoice(body)
    }

    @Post('stop/voice')
    stopVoice(@Body() body: EmailAndTrueParamEmail) {
        this.UsersService.stopVoice(body)
    }

    @Patch('pin/chat')
    pinChat(@Body() body: {user: string, pin: boolean, email: string}) {
        return this.UsersService.pinChat(body)
    }

    @Patch('pin/mess')
    pinMess(@Body() body: {email: string, trueParamEmail: string, messId: string, pin: boolean}) {
        this.UsersService.pinMess(body)
    }

    @Get('get/save/posts/:email')
    getSavePosts(@Param('email') email: string) {
        return this.UsersService.getSavePosts(email)
    }

    @Patch('save/unsave/post')
    saveUnsavePost(@Body() body: {email: string, postId: string, type: string}) {
        return this.UsersService.saveUnsavePost(body)
    }

    @Patch('change/code')
    changeCode(@Body() body: {email: string, newCode: string}) {
        this.UsersService.changeCode(body)
    }

    @Get('get/mess/count/:email')
    getMessCount(@Param('email') email: string) {
        return this.UsersService.getMessCount(email)
    }

    @Post('get/online/status')
    getOnlineStatus(@Body() body: {trueEmail: string, trueParamEmail: string}) {
        this.UsersService.getOnlineStatus(body)
    }

    @Post('give/online/status')
    giveOnlineStatus(@Body() body: {userEmail: string}) {
        this.UsersService.giveOnlineStatus(body)
    }

    @Patch('change/notifs')
    changeNotifs(@Body() body: {notifs: boolean, trueEmail: string, user: string}) {
        this.UsersService.changeNofifs(body)
    }

    @Get('get/visits/:email')
    getMyVisits(@Param('email') email: string) {
        return this.UsersService.getMyVisits(email)
    }

    @Post('validate/email')
    validateEmail(@Body() body: EmailDto) {
        return body.email
    }

    @Post('send/code')
    sendCode(@Body() body: NewUserDto) {
        return this.UsersService.sendCode(body)
    }

    @Post('reg/user')
    regUser(@Body() body: CreateUser) {
        return this.UsersService.regUser(body)
    }

    @Post('send/enter/code/:email') 
    sendEnterCode(@Param('email') email: string) {
        return this.UsersService.sendEnterCode(email)
    }

    @Post('email/enter')
    emailEnter(@Body() body: {email: string, code: string}) {
        return this.UsersService.emailEnter(body)
    }

    @Post('check/token')
    @UseGuards(JwtAuthGuard)
    checkToken(@Request() req) {
        return 'OK'
    }

}
