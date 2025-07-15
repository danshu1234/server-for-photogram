import { Controller, Get, Body, Post, Param, Patch } from '@nestjs/common';
import { UsersServiceService } from 'src/users-service/users-service.service';
import Message from 'src/Message';
import EmailAndTrueParamEmail from 'src/emailInterface';

@Controller('users-controller')
export class UsersControllerController {

    constructor(private readonly UsersService: UsersServiceService){}

    @Post('create/new/user')
    createNewUser(@Body() user: {resultEmail: string, code: string, resultName: string, country: string, latitude: number, longitude: number}) {
        this.UsersService.createUser(user)
    }

    @Get('check/user/:email')
    checkEmailUser(@Param('email') email: string) {
        return this.UsersService.checkUser(email)
    }

    @Get('get/code/:email')
    getCode(@Param('email') email: string) {
        return this.UsersService.getCode(email)
    }

    @Get('check/find/user/:email')
    checkFindUser(@Param('email') email: string) {
        return this.UsersService.checkFindUser(email)
    }

    @Get('all/subs/and/country/:email')
    getAllSubs(@Param('email') email: string) {
        return this.UsersService.getSubs(email)
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

    @Get('get/notifs/:email')
    getNotifs(@Param('email') email: string) {
        return this.UsersService.getNotifs(email)
    }

    @Patch('new/notif')
    newNotif(@Body() body: {resultEmail: string, userEmail: string, photoId?: string, type: string}) {
        this.UsersService.newNotif(body)
    }

    @Patch('clear/notifs')
    clearNotifs(@Body() body: {email: string}) {
        return this.UsersService.clearNotifs(body)
    }

    @Get('get/banned/users/:email')
    getBannedUsers(@Param('email') email: string) {
        return this.UsersService.getBannedUsers(email)
    }

    @Post('add/banned/user')
    addBannedUser(@Body() body: {userEmail: string, email: string}) {
        this.UsersService.addBannedUser(body)
    }

    @Get('get/visits/:email')
    getVisits(@Param('email') email: string) {
        return this.UsersService.getVisits(email)
    }

    @Patch('update/visits')
    updateVisits(@Body() body: {visitsWithMe: string[], targetEmail: string}) {
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

    @Get('get/email/:code')
    getEmail(@Param('code') code: string) {
        return this.UsersService.getEmail(code)
    }

    @Get('get/avatar/:email')
    getAva(@Param('email') email: string) {
        return this.UsersService.getAva(email)
    }

    @Patch('new/avatar')
    newAvatar(@Body() body: {targetEmail: string, newAva: string}) {
        this.UsersService.newAvatar(body)
    }

    @Get('get-full-data/:email')
    getFullData(@Param('email') email: string) {
        return this.UsersService.getFullData(email)
    }

    @Get('get/all/users')
    getAllUsers() {
        return this.UsersService.getAllUsers()
    }

    @Get('check/open/:email')
    checkOpen(@Param('email') email: string) {
        return this.UsersService.checkOpen(email)
    }

    @Patch('close/acc')
    closeAcc(@Body() body: {email: string}) {
        return this.UsersService.closeAcc(body)
    }

    @Patch('open/acc')
    openAcc(@Body() body: {email: string}) {
        return this.UsersService.openAcc(body)
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

    @Get('check/coords/:email')
    checkCoords(@Param('email') email: string) {
        return this.UsersService.checkCoords(email)
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
    newMess(@Body() body: {newMessages: Message[], trueParamEmail: string, email: string, socketId: string, per: string}) {
        this.UsersService.newMess(body)
    }

    @Patch('new/chat')
    newChat(@Body() body: {email: string, trueParamEmail: string, imageBase64: string[], inputMess: string, typeMessage: string, per: string}) {
        this.UsersService.newChat(body)
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
    editMess(@Body() body: {email: string, trueParamEmail: string, editMess: string, inputMess: string}) {
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
    changeCode(@Body() body: {trueEmail: string, newCode: string}) {
        this.UsersService.changeCode(body)
    }

}
