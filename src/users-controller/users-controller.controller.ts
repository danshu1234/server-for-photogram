import { Controller, Get, Body, Post, Param, Patch, UseInterceptors, UploadedFiles, UseGuards, Request, Res, UploadedFile } from '@nestjs/common';
import { UsersServiceService } from 'src/users-service/users-service.service';
import { EmailDto } from 'src/EmailDto';
import { UserDto } from './UserDto';
import { NewUserDto } from 'src/NewUserDto';
import { CreateUser } from 'src/CreateUser';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CookieJwtGuard } from 'src/cookie-jwt.guard';
import { messIdAndTrueParamEmail } from 'src/messIdInter';
import EncryptMess from 'src/MessEncryptInterface';

@Controller('users-controller')
export class UsersControllerController {

    constructor(private readonly UsersService: UsersServiceService){}


    @Get('check/find/user/:email')
    checkFindUser(@Param('email') email: string) {
        return this.UsersService.checkFindUser(email)
    }

    @Get('all/subs/and/country')
    @UseGuards(CookieJwtGuard)
    getAllSubs(@Request() req) {
        return this.UsersService.getSubs(req.user.email)
    }

    @Patch('unsub')
    @UseGuards(CookieJwtGuard)
    unSubUser(@Body() data: {targetEmail: string}, @Request() req) {
        const body = {targetEmail: data.targetEmail, resultEmail: req.user.email}
        this.UsersService.unSub(body)
    }

    @Patch('sub')
    @UseGuards(CookieJwtGuard)
    subUser(@Body() data: {targetEmail: string}, @Request() req) {
        const body = {targetEmail: data.targetEmail, resultEmail: req.user.email}
        this.UsersService.sub(body)
    }

    @Patch('add/socket')
    @UseGuards(CookieJwtGuard)
    addSocket(@Body() data: {socketId: string}, @Request() req) {
        const body = {socketId: data.socketId, email: req.user.email}
        this.UsersService.addSocket(body)
    }

    @Patch('clear/socket')
    clearSocket(@Body() body: {email: string}) {
        this.UsersService.clearSocket(body)
    }

    @Get('get/notifs')
    @UseGuards(CookieJwtGuard)
    getNotifs(@Request() req) {
        return this.UsersService.getNotifs(req.user.email)
    }

    @Patch('new/notif')
    @UseGuards(CookieJwtGuard)
    newNotif(@Body() data: {userEmail: string, photoId?: string, type: string}, @Request() req) {
        let body: any = null
        if (data.photoId) {
            body = {resultEmail: req.user.email, userEmail: data.userEmail, photoId: data.photoId, type: data.type}
        } else {
            body = {resultEmail: req.user.email, userEmail: data.userEmail, type: data.type}
        }
        this.UsersService.newNotif(body)
    }

    @Patch('clear/notifs')
    @UseGuards(CookieJwtGuard)
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
    @UseGuards(CookieJwtGuard)
    updateVisits(@Body() data: {email: string, targetEmail: string}, @Request() req) {
        const body = {email: req.user.email, targetEmail: data.targetEmail}
        return this.UsersService.updateVisits(body)
    }

    @Get('get/reports/:email')
    checkReport(@Param('email') email: string) {
        return this.UsersService.checkReport(email)
    }

    @Patch('new/report')
    @UseGuards(CookieJwtGuard)
    newReport(@Body() data: {targetEmail: string}, @Request() req) {
        const body = {targetEmail: data.targetEmail, email: req.user.email}
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
    @UseGuards(CookieJwtGuard)
    getEmail(@Request() req) {
        return req.user.email
    }

    @Get('get/avatar')
    @UseGuards(CookieJwtGuard)
    getAva(@Request() req) {
        return this.UsersService.getAva(req.user.email)
    }

    @Patch('new/avatar')
    @UseGuards(CookieJwtGuard)
    @UseInterceptors(FileInterceptor('ava'))
    newAvatar(@UploadedFile() ava: Express.Multer.File, @Request() req) {
        const resultEmail: string = req.user.email
        const body = {targetEmail: resultEmail, ava: ava}
        this.UsersService.newAvatar(body)
    }

    @Get('get/all/users')
    getAllUsers() {
        return this.UsersService.getAllUsers()
    }

    @Get('check/open')
    @UseGuards(CookieJwtGuard)
    checkOpen(@Request() req) {
        return this.UsersService.checkOpen(req.user.email)
    }

    @Patch('close/acc')
    @UseGuards(CookieJwtGuard)
    closeAcc(@Request() req) {
        return this.UsersService.closeAcc(req.user.email)
    }

    @Patch('open/acc')
    @UseGuards(CookieJwtGuard)
    openAcc(@Request() req) {
        return this.UsersService.openAcc(req.user.email)
    }

    @Patch('check/perm/status')
    checkPerm(@Body() body: {trueParamEmail: string, email: string}) {
        return this.UsersService.checkPerm(body)
    }

    @Patch('new/perm/user')
    @UseGuards(CookieJwtGuard)
    newPermUser(@Body() data: {newUserEmail: string}, @Request() req) {
        const body = {newUserEmail: data.newUserEmail, email: req.user.email}
        this.UsersService.newPermUser(body)
    }

    @Patch('delete/perm')
    @UseGuards(CookieJwtGuard)
    deletePerm(@Body() data: {user: string}, @Request() req) {
        const body = {user: data.user, email: req.user.email}
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

    @Get('get/visits/:email')
    getMyVisits(@Param('email') email: string) {
        return this.UsersService.getMyVisits(email)
    }

    @Post('validate/email')
    validateEmail(@Body() body: EmailDto) {
        return body.email
    }

    @Post('check/token')
    @UseGuards(CookieJwtGuard)
    checkToken(@Request() req) {
        return 'OK'
    }

    @Patch('add/peer')
    @UseGuards(CookieJwtGuard)
    addPeer(@Request() req, @Body() data: {peerId: string}) {
        const body = {email: req.user.email, peerId: data.peerId}
        this.UsersService.addPeer(body)
    }

    @Post('data/call')
    @UseGuards(CookieJwtGuard)
    dataForCall(@Request() req, @Body() data: {trueParamEmail: string}) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.UsersService.dataForCall(body)
    }


    @Patch('delete/avatar')
    @UseGuards(CookieJwtGuard)
    deleteAvatar(@Request() req) {
        const userEmail = req.user.email
        this.UsersService.deleteAvatar(userEmail)
    }

    @Get('exit/acc')
    exitAcc(@Res() res: Response) {
        const token = ''
        res.cookie('accessToken', token, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000, 
        });
        return res.status(200).send()
    }

    @Get('check/user/:email')
    checkUser(@Param('email') email: string) {
        return this.UsersService.checkUser(email)
    }

    @Get('user/close')
    @UseGuards(CookieJwtGuard)
    userClose(@Request() req) {
        this.UsersService.closeUser(req.user.email)
    }

    @Patch('online/status')
    @UseGuards(CookieJwtGuard)
    onlineStatus(@Body() data: {plat: string}, @Request() req) {
        const body = {email: req.user.email, plat: data.plat}
        this.UsersService.onlineStatus(body)
    }

    @Get('get/status/online/:trueParamEmail')
    getStatusOnline(@Param('trueParamEmail') trueParamEmail: string) {
        return this.UsersService.getStatusOnline(trueParamEmail)
    }

    @Get('add/test/users')
    addTestUsers() {
        this.UsersService.addTestUsers()
    }

    @Get('get/popular/users')
    getPopularUsers() {
        return this.UsersService.getPopularUsers()
    }

    @Patch('new/user/notif')
    @UseGuards(CookieJwtGuard)
    postNotif(@Body() data: {trueParamEmail: string, type: boolean}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail, type: data.type}
        this.UsersService.postNotif(body)
    }

    @Get('user/get/notifs')
    @UseGuards(CookieJwtGuard)
    getPostNotifs(@Request() req) {
        return this.UsersService.getPostNotifs(req.user.email)
    }

    @Post('close/sess/test')
    closeSess(@Body() body: {sessId: string}) {
        this.UsersService.closeSess(body.sessId)
    }

    @Post('refresh/session')
    refreshSession(@Body() body: {refreshToken: string}) {
        return this.UsersService.refreshSession(body.refreshToken)
    }

    @Get('get/key/words')
    @UseGuards(CookieJwtGuard)
    getUserKeywords(@Request() req) {
        const email = req.user.email
        return this.UsersService.getUserKeywords(email)
    }


}
