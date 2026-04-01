import { Controller, Get, Body, Post, Param, Patch, UseInterceptors, UploadedFiles, UseGuards, Request, Res } from '@nestjs/common';
import { UsersServiceService } from 'src/users-service/users-service.service';
import Message from 'src/Message';
import EmailAndTrueParamEmail from 'src/emailInterface';
import { EmailDto } from 'src/EmailDto';
import { UserDto } from './UserDto';
import { NewUserDto } from 'src/NewUserDto';
import { CreateUser } from 'src/CreateUser';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CookieJwtGuard } from 'src/cookie-jwt.guard';
import { messIdAndTrueParamEmail } from 'src/messIdInter';
import EncryptMess from 'src/MessEncryptInterface';

@Controller('users-controller')export class UsersControllerController {

    constructor(private readonly UsersService: UsersServiceService){}


    @Post('enter')
    enter(@Body() body: {login: string, password: string, mobile?: string}, @Res({ passthrough: true }) response: Response) {
        return this.UsersService.enter(body, response)
    }

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

    @Get('get/chats')
    @UseGuards(CookieJwtGuard)
    getChats(@Request() req) {
        return this.UsersService.getChats(req.user.email)
    }

    @Post('get/mess')
    @UseGuards(CookieJwtGuard)
    getMess(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        return this.UsersService.getMess(body)
    }

    @Patch('new/mess')  
    @UseGuards(CookieJwtGuard)
    @UseInterceptors(FilesInterceptor('photo'))
    newMess(@UploadedFiles() files: Express.Multer.File[], @Body() body: {user: string, text: string, date: string, id: string, ans: string, type: string, trueParamEmail: string, per: string, origUser: string, origId: string, videoId?: string, myText: string, previewVideo?: string}, @Request() req) {
        let resultData: any = ''
        if (body.type !== 'video') {
            resultData = {...body, files: files, email: req.user.email, text: JSON.parse(body.text), myText: JSON.parse(body.myText)}
        } else {
            resultData = {...body, files: files, email: req.user.email, text: body.text, myText: body.text, previewVideo: body.previewVideo}
        }
        return this.UsersService.newMess(resultData)
    }
    
    @Patch('new/chat')
    @UseGuards(CookieJwtGuard)
    @UseInterceptors(FilesInterceptor('photo'))
    newChat(@UploadedFiles() files: Express.Multer.File[], @Body() body: {user: string, text: string, date: string, id: string, ans: string, type: string, trueParamEmail: string, per: string, origUser: string, origId: string, videoId?: string, myText: string}, @Request() req) {
        const resultData = {...body, files: files, email: req.user.email, text: JSON.parse(body.text), myText: JSON.parse(body.myText)}
        return this.UsersService.newChat(resultData)
    }

    @Patch('zero/mess')
    @UseGuards(CookieJwtGuard)
    zeroMess(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        this.UsersService.zeroMess(body)
    }

    @Post('typing')
    @UseGuards(CookieJwtGuard)
    typing(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        this.UsersService.typingUser(body)
    }

    @Get('get/ban/mess/:trueParamEmail')
    getBanMess(@Param('trueParamEmail') trueParamEmail: string) {
        return this.UsersService.getBanMess(trueParamEmail)
    }

    @Get('get/my/ban/mess')
    @UseGuards(CookieJwtGuard)
    getMyBanMess(@Request() req) {
        return this.UsersService.getBanMess(req.user.email)
    }

    @Patch('ban/unban/user')
    @UseGuards(CookieJwtGuard)
    banUser(@Body() data: {trueParamEmail: string, banStatus: boolean}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, banStatus: data.banStatus, email: req.user.email}
        this.UsersService.banUser(body)
    }

    @Patch('delete/mess')
    @UseGuards(CookieJwtGuard)
    deleteMess(@Body() data: {trueParamEmail: string, messId: string[], unreadCount: number}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail, messId: data.messId, unreadCount: data.unreadCount}
        return this.UsersService.deleteMess(body)
    }

    @Post('get/mess/count')
    messCount(@Body()  body: EmailAndTrueParamEmail) {
        return this.UsersService.messCount(body)
    }

    @Patch('edit/mess')
    @UseGuards(CookieJwtGuard)
    editMess(@Body() data: {trueParamEmail: string, editMess: string, inputMess: string, per: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, editMess: data.editMess, inputMess: data.inputMess, per: data.per, email: req.user.email}
        return this.UsersService.editMess(body)
    }

    @Get('get/perm/mess')
    @UseGuards(CookieJwtGuard)
    getPerm(@Request() req) {
        return this.UsersService.getPerm(req.user.email)
    }

    @Patch('new/perm/mess')
    @UseGuards(CookieJwtGuard)
    newMessPerm(@Body() data: {changePerm: string}, @Request() req) {
        const body = {changePerm: data.changePerm, email: req.user.data}
        this.UsersService.newMessPerm(body)
    }

    @Post('get/perm/data')
    @UseGuards(CookieJwtGuard)
    getPermData(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        return this.UsersService.getPermData(body)
    }

    @Post('start/voice')
    @UseGuards(CookieJwtGuard)
    startVoice(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        this.UsersService.startVoice(body)
    }

    @Post('stop/voice')
    @UseGuards(CookieJwtGuard)
    stopVoice(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        this.UsersService.stopVoice(body)
    }

    @Patch('pin/chat')
    @UseGuards(CookieJwtGuard)
    pinChat(@Body() data: {user: string, pin: boolean}, @Request() req) {
        const body = {user: data.user, pin: data.pin, email: req.user.email}
        return this.UsersService.pinChat(body)
    }

    @Patch('pin/mess')
    @UseGuards(CookieJwtGuard)
    pinMess(@Body() data: {trueParamEmail: string, messId: string, pin: boolean}, @Request() req) {
        const body = {...data, email: req.user.email}
        return this.UsersService.pinMess(body)
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

    @Patch('change/notifs')
    @UseGuards(CookieJwtGuard)
    changeNotifs(@Body() data: {notifs: boolean, user: string}, @Request() req) {
        const body = {notifs: data.notifs, user: data.user, trueEmail: req.user.email}
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
    regUser(@Body() body: CreateUser, @Res({ passthrough: true }) response: Response) {
        return this.UsersService.regUser(body, response)
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

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {}

    @Get('google/auth')
    @UseGuards(AuthGuard('google'))
        async googleAuthRedirect(@Request() req, @Res() res: Response) {
        const token = req.user.token
        const refreshToken = req.user.refreshToken
        const regStatus = req.user.reg
        const userEmail = req.user.email
        res.cookie('accessToken', token, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000, 
        });
        res.redirect(`http://localhost:3000/auth/${refreshToken}/${regStatus}/${userEmail}`);
    }

    @Patch('get/new/token')
    getNewToken(@Body() body: {refreshToken: string}, @Res({ passthrough: true }) response: Response) {
        return this.UsersService.getNewToken(body, response)
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

    @Patch('delete/chat')
    @UseGuards(CookieJwtGuard)
    deleteChat(@Body() data: {friendEmail: string, friendDel: boolean}, @Request() req) {
        const body = {email: req.user.email, friendEmail: data.friendEmail, friendDel: data.friendDel}
        return this.UsersService.deleteChat(body)
    }

    @Get('get/bot/mess')
    @UseGuards(CookieJwtGuard)
    getBotMess(@Request() req) {
        return this.UsersService.getBotMess(req.user.email)
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

    @Post('video')
    @UseGuards(CookieJwtGuard)
    async getVideoMess(@Body() data: {videoMessId: string, trueParamEmail: string}, @Request() req, @Res() res: Response) {
        const body = {...data, email: req.user.email}
        const archive = await this.UsersService.getVideoMess(body)
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="file"',
        });
        archive.pipe(res)
    }
    
    @Post('get/friend/mess/count')
    @UseGuards(CookieJwtGuard)
    getFriendMessCount(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {...data, email: req.user.email}
        return this.UsersService.getFriendMessCount(body)
    }

    @Post('read/mess')
    readMess(@Body() body: {targetEmail: string}) {
        this.UsersService.readMess(body)
    }

    @Post('open/chat')
    @UseGuards(CookieJwtGuard)
    openChat(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        this.UsersService.openChat(body)
    }

    @Post('get/file')
    @UseGuards(CookieJwtGuard)
    async getFile(@Body() data: messIdAndTrueParamEmail, @Request() req, @Res() res) {
        const body = {...data, email: req.user.email}
        const file = await this.UsersService.getFile(body)
        res.set({
            'Content-Type': file?.type,
            'Content-Length': file?.file.length,
            'Content-Disposition': 'attachment; filename="file"',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.send(file?.file)
    }

    @Post('big/photos')
    @UseGuards(CookieJwtGuard)
    async getBigPhotos(@Body() data: {messId: string, trueParamEmail: string}, @Request() req, @Res() res: Response) {
        console.log(data)
        const body = {...data, email: req.user.email}
        const archive = await this.UsersService.getBigPhotos(body)
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="photos_${data.messId}.zip"`,
        });
        if (archive) {
            archive.pipe(res)
        }
    }

    @Get('public/keys/:email')
    @UseGuards(CookieJwtGuard)
    getPublicKeys(@Param('email') email: string, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: email}
        return this.UsersService.getPublicKeys(body)
    }

    @Patch('add/public/key')
    @UseGuards(CookieJwtGuard)
    addPublicKey(@Body() data: {publicKey: string}, @Request() req) {
        const body = {email: req.user.email, publicKey: data.publicKey}
        return this.UsersService.addPublicKey(body)
    }

    @Post('mess/length')
    @UseGuards(CookieJwtGuard)
    getMessLength(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.UsersService.messLength(body)
    }

    @Post('big/photo')
    @UseGuards(CookieJwtGuard)
    async getBigPhoto(@Body() data: {trueParamEmail: string, messId: string, photoId: string}, @Request() req, @Res() res: Response) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail, messId: data.messId, photoId: data.photoId}
        const resultBuffer = await this.UsersService.getBigPhoto(body)
        res.setHeader('Content-Type', 'image/jpeg/png')
        return res.send(resultBuffer)
    }

    @Get('get/token')
    async getToken(@Request() req) {
        const token = req.cookies?.accessToken
        return token
    }

    @Get('change/token')
    @UseGuards(CookieJwtGuard)
    async changeToken(@Request() req, @Res({ passthrough: true }) response: Response) {
        const email = req.user.email
        return this.UsersService.changeToken(email, response)
    }

    @Get('add/test/users')
    addTestUsers() {
        this.UsersService.addTestUsers()
    }

    @Get('get/popular/users')
    getPopularUsers() {
        return this.UsersService.getPopularUsers()
    }

    @Post('save/token')
    saveToken(@Body() body: {accessToken: string}, @Res() res: Response) {
        res.cookie('accessToken', body.accessToken, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000, 
        });
        return 'OK'
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

    @Post('enter/test')
    enterTest(@Body() body: {login: string, password: string}) {
        return this.UsersService.enterTest(body)
    }

    @Post('get/email/test')
    getEmailTest(@Body() body: {sessId: string}) {
        return this.UsersService.getEmailTest(body.sessId)
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
