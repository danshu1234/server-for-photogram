import { ChatsService } from './chats.service';
import { Controller, Get, Body, Post, Param, Patch, UseInterceptors, UploadedFiles, UseGuards, Request, Res, UploadedFile } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CookieJwtGuard } from 'src/cookie-jwt.guard';
import EmailAndTrueParamEmail from 'src/emailInterface';
import { Response } from 'express';
import { messIdAndTrueParamEmail } from 'src/messIdInter';

@Controller('chats-controller')
export class ChatsController {

    constructor(private readonly chatsService: ChatsService) {}

    @Post('chat/id')
    @UseGuards(CookieJwtGuard)
    getChatId(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.chatsService.getChatId(body)
    }

    @Post('get/notif/mess')
    @UseGuards(CookieJwtGuard)
    getNotifsMess(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.chatsService.getNotifsMess(body)
    }

    @Post('get/users/chat')
    getChatUsers(@Body() body: {trueParamEmail: string}) {
        return this.chatsService.getUsersChat(body.trueParamEmail)
    }

    @Get('chat/name/:id')
    getChatName(@Param('id') id: string) {
        return this.chatsService.getNameChat(id)
    }

    @Post('get/notif/status')
    @UseGuards(CookieJwtGuard)
    getNotifStatus(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.chatsService.getNotifStatus(body)
    }

    @Post('get/group/users')
    @UseGuards(CookieJwtGuard)
    getUsersGroup(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.chatsService.getUsersGroup(body)
    }

    @Patch('delete/particip')
    @UseGuards(CookieJwtGuard)
    deleteParticip(@Body() data: {trueParamEmail: string, particip: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail, particip: data.particip}
        return this.chatsService.deleteParticip(body)
    }
    
    @Patch('add/new/particip')
    @UseGuards(CookieJwtGuard)
    addParticip(@Body() data: {trueParamEmail: string, particip: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail, particip: data.particip}
        return this.chatsService.addParticip(body)
    }

    @Patch('chat/exit')
    @UseGuards(CookieJwtGuard)
    chatExit(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.chatsService.chatExit(body)
    }

    @Patch('group/new/avatar')
    @UseGuards(CookieJwtGuard)
    @UseInterceptors(FileInterceptor('ava'))
    avatarChat(@Body() data: {id: string}, @UploadedFile() ava: Express.Multer.File, @Request() req) {
        const resultEmail: string = req.user.email
        const body = {email: resultEmail, trueParamEmail: data.id, ava: ava}
        this.chatsService.avatarChat(body)
    }

    @Patch('new/reactions')
    @UseGuards(CookieJwtGuard)
    reactions(@Body() data: {reactionsMess: {reaction: string, users: string[]}[], messEmojies: string, trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, ...data}
        this.chatsService.reactions(body)
    }

    @Post('preview/photo')
    @UseGuards(CookieJwtGuard)
    getPreviewPhoto(@Body() data: {messId: string, trueParamEmail: string, indexPhoto: number}, @Request() req) {
        const body = {email: req.user.email, ...data}
        return this.chatsService.previewPhoto(body)
    }

    @Patch('vote/user')
    @UseGuards(CookieJwtGuard)
    voteUser(@Body() data: {messId: string, trueParamEmail: string, voteId: string}, @Request() req) {
        const body = {email: req.user.email, ...data}
        this.chatsService.voteUser(body)
    }

    @Patch('voice/revoke')
    @UseGuards(CookieJwtGuard)
    voiceRevoke(@Body() data: {messId: string, trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, ...data}
        this.chatsService.voiceRevoke(body)
    }

    @Get('get/mess/count/:email')
    getMessCount(@Param('email') email: string) {
        return this.chatsService.getMessCount(email)
    }

    @Patch('change/notifs')
    @UseGuards(CookieJwtGuard)
    changeNotifs(@Body() data: {notifs: boolean, user: string}, @Request() req) {
        const body = {notifs: data.notifs, user: data.user, trueEmail: req.user.email}
        this.chatsService.changeNofifs(body)
    }

    @Get('get/chats')
    @UseGuards(CookieJwtGuard)
    getChats(@Request() req) {
        return this.chatsService.getChats(req.user.email)
    }

    @Post('get/mess')
    @UseGuards(CookieJwtGuard)
    getMess(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        return this.chatsService.getMess(body)
    }

    @Patch('new/mess')  
    @UseGuards(CookieJwtGuard)
    @UseInterceptors(FilesInterceptor('photo'))
    newMess(@UploadedFiles() files: Express.Multer.File[], @Body() body: {user: string, text: string, date: string, id: string, ans: string, type: string, trueParamEmail: string, per: string, origUser: string, origId: string, origChatId: string, videoId?: string, previewVideo?: string, options?: string}, @Request() req) {
        let resultData: any = ''
        if (body.options) {
            resultData = {...body, files: files, email: req.user.email, text: JSON.parse(body.text), ans: JSON.parse(body.ans), options: JSON.parse(body.options)}
        } else {
            if (body.type !== 'video' && body.type !== 'voice') {
                resultData = {...body, files: files, email: req.user.email, text: JSON.parse(body.text), ans: JSON.parse(body.ans)}
            } else {
                resultData = {...body, files: files, email: req.user.email, text: body.text, myText: body.text, previewVideo: body.previewVideo, ans: JSON.parse(body.ans)}
            }
        }
        return this.chatsService.newMess(resultData)
    }
    
    @Patch('new/chat')
    @UseGuards(CookieJwtGuard)
    @UseInterceptors(FilesInterceptor('photo'))
    newChat(@UploadedFiles() files: Express.Multer.File[], @Body() body: {user: string, text: string, date: string, id: string, ans: string, type: string, trueParamEmail: string, per: string, origUser: string, origId: string, users: string, videoId?: string, groupName?: string}, @Request() req) {
        const resultData = {...body, files: files, email: req.user.email, text: JSON.parse(body.text), users: JSON.parse(body.users), ans: JSON.parse(body.ans)}
        return this.chatsService.newChat(resultData)
    }

    @Patch('zero/mess')
    @UseGuards(CookieJwtGuard)
    zeroMess(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        this.chatsService.zeroMess(body)
    }

    @Post('typing')
    @UseGuards(CookieJwtGuard)
    typing(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        this.chatsService.typingUser(body)
    }

    @Get('get/ban/mess/:trueParamEmail')
    getBanMess(@Param('trueParamEmail') trueParamEmail: string) {
        return this.chatsService.getBanMess(trueParamEmail)
    }

    @Get('get/my/ban/mess')
    @UseGuards(CookieJwtGuard)
    getMyBanMess(@Request() req) {
        return this.chatsService.getBanMess(req.user.email)
    }

    @Patch('ban/unban/user')
    @UseGuards(CookieJwtGuard)
    banUser(@Body() data: {trueParamEmail: string, banStatus: boolean}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, banStatus: data.banStatus, email: req.user.email}
        this.chatsService.banUser(body)
    }

    @Patch('delete/mess')
    @UseGuards(CookieJwtGuard)
    deleteMess(@Body() data: {trueParamEmail: string, messId: string[], unreadMess: {user: string, unreadCount: number}[]}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail, messId: data.messId, unreadMess: data.unreadMess}
        return this.chatsService.deleteMess(body)
    }

    @Post('get/mess/count')
    messCount(@Body()  body: EmailAndTrueParamEmail) {
        return this.chatsService.messCount(body)
    }

    @Patch('edit/mess')
    @UseGuards(CookieJwtGuard)
    editMess(@Body() data: {trueParamEmail: string, editMess: string, inputMess: string, per: string, text: string, myText: string}, @Request() req) {
        console.log('Text: ')
        const body = {trueParamEmail: data.trueParamEmail, editMess: data.editMess, inputMess: data.inputMess, per: data.per, email: req.user.email, text: JSON.parse(data.text)}
        return this.chatsService.editMess(body)
    }

    @Get('get/perm/mess')
    @UseGuards(CookieJwtGuard)
    getPerm(@Request() req) {
        return this.chatsService.getPerm(req.user.email)
    }

    @Patch('new/perm/mess')
    @UseGuards(CookieJwtGuard)
    newMessPerm(@Body() data: {changePerm: string}, @Request() req) {
        const body = {changePerm: data.changePerm, email: req.user.data}
        this.chatsService.newMessPerm(body)
    }

    @Post('get/perm/data')
    @UseGuards(CookieJwtGuard)
    getPermData(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        return this.chatsService.getPermData(body)
    }

    @Post('mess/length')
    @UseGuards(CookieJwtGuard)
    getMessLength(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        return this.chatsService.messLength(body)
    }

    @Post('start/voice')
    @UseGuards(CookieJwtGuard)
    startVoice(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        this.chatsService.startVoice(body)
    }

    @Post('stop/voice')
    @UseGuards(CookieJwtGuard)
    stopVoice(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {trueParamEmail: data.trueParamEmail, email: req.user.email}
        this.chatsService.stopVoice(body)
    }

    @Patch('pin/chat')
    @UseGuards(CookieJwtGuard)
    pinChat(@Body() data: {user: string, pin: boolean}, @Request() req) {
        const body = {user: data.user, pin: data.pin, email: req.user.email}
        this.chatsService.pinChat(body)
    }

    @Patch('pin/mess')
    @UseGuards(CookieJwtGuard)
    pinMess(@Body() data: {trueParamEmail: string, messId: string, pin: boolean}, @Request() req) {
        const body = {...data, email: req.user.email}
        return this.chatsService.pinMess(body)
    }

    @Patch('delete/chat')
    @UseGuards(CookieJwtGuard)
    deleteChat(@Body() data: {friendEmail: string, friendDel: boolean}, @Request() req) {
        const body = {email: req.user.email, friendEmail: data.friendEmail, friendDel: data.friendDel}
        return this.chatsService.deleteChat(body)
    }

    @Get('get/bot/mess')
    @UseGuards(CookieJwtGuard)
    getBotMess(@Request() req) {
        return this.chatsService.getBotMess(req.user.email)
    }

    @Post('video')
    @UseGuards(CookieJwtGuard)
    async getVideoMess(@Body() data: {videoMessId: string, trueParamEmail: string}, @Request() req, @Res() res: Response) {
        const body = {...data, email: req.user.email}
        const archive = await this.chatsService.getVideoMess(body)
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="file"',
        });
        archive.pipe(res)
    }
    
    @Post('get/friend/mess/count')
    @UseGuards(CookieJwtGuard)
    getFriendMessCount(@Body() data: {trueParamEmail: string}, @Request() req) {
        console.log('Here')
        const body = {...data, email: req.user.email}
        return this.chatsService.getFriendMessCount(body)
    }

    @Post('read/mess')
    readMess(@Body() body: {targetEmail: string}) {
        this.chatsService.readMess(body)
    }

    @Post('open/chat')
    @UseGuards(CookieJwtGuard)
    openChat(@Body() data: {trueParamEmail: string}, @Request() req) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail}
        this.chatsService.openChat(body)
    }

    @Post('get/file')
    @UseGuards(CookieJwtGuard)
    async getFile(@Body() data: messIdAndTrueParamEmail, @Request() req, @Res() res) {
        const body = {...data, email: req.user.email}
        const file = await this.chatsService.getFile(body)
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
    async getBigPhotos(@Body() data: {messId: string, trueParamEmail: string, photoId: string}, @Request() req, @Res() res: Response) {
        const body = {...data, email: req.user.email, photoId: data.photoId}
        const photoBuffer = await this.chatsService.getBigPhotos(body)
        if (photoBuffer) {
            res.setHeader('Content-Type', 'image/jpeg/png')
            res.setHeader('Content-Length', photoBuffer.photo.length)
            res.setHeader('X-Metadata', JSON.stringify(photoBuffer.id))
            return res.send(photoBuffer.photo)
        }
    }

    @Post('public/keys')
    @UseGuards(CookieJwtGuard)
    getPublicKeys(@Body() body: {usersChat: string[]}) {
        return this.chatsService.getPublicKeys(body.usersChat)
    }

    @Patch('add/public/key')
    @UseGuards(CookieJwtGuard)
    addPublicKey(@Body() data: {publicKey: string}, @Request() req) {
        const body = {email: req.user.email, publicKey: data.publicKey}
        return this.chatsService.addPublicKey(body)
    }

    @Post('big/photo')
    @UseGuards(CookieJwtGuard)
    async getBigPhoto(@Body() data: {trueParamEmail: string, messId: string, photoId: string}, @Request() req, @Res() res: Response) {
        const body = {email: req.user.email, trueParamEmail: data.trueParamEmail, messId: data.messId, photoId: data.photoId}
        const resultBuffer = await this.chatsService.getBigPhoto(body)
        res.setHeader('Content-Type', 'image/jpeg/png')
        return res.send(resultBuffer)
    }

}
