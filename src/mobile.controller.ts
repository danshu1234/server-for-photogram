import { Controller, Get, Body, Post, Param, Patch, UseInterceptors, UploadedFiles, UseGuards, Request, Res, UnauthorizedException } from '@nestjs/common';
import { UsersServiceService } from 'src/users-service/users-service.service';
import { JwtService } from '@nestjs/jwt';
import getEmailFromToken from './MobileJwtGuard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { OpenAIService } from './openai.service';

@Controller('mobile')
export class MobileControllerController {

  constructor(private readonly UsersService: UsersServiceService, private jwtService: JwtService, private readonly openAIService: OpenAIService){}

  @Post('check/token')
  async checkTokenMobile(@Body() body: {token: string}) {
      try {
        const payload = await this.jwtService.verifyAsync(body.token, {
          secret: process.env.JWT_SECRET,
        });
        return 'OK';
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
  }

  @Patch('get/new/token')
  getNewToken(@Body() body: {refreshToken: string, token: string}, @Res({ passthrough: true }) response: Response) {
      return this.UsersService.getNewToken(body, response)
  }

  @Post('get/email')
  async getUserEmail(@Body() body: {token: string}) {
    const email = await getEmailFromToken(body.token, this.jwtService)
    return email
  }

  @Post('get/chats')
  async getChats(@Body() body: {token: string}) {
    const email = await getEmailFromToken(body.token, this.jwtService)
    return this.UsersService.getChats(email)
  } 

  @Patch('online/status')
  async onlineStatus(@Body() body: {userToken: string}) {
    const email = await getEmailFromToken(body.userToken, this.jwtService)
    this.UsersService.onlineStatus(email)
  }

  @Patch('user/close')
  async userClose(@Body() body: {token: string}) {
    const email = await getEmailFromToken(body.token, this.jwtService)
    this.UsersService.closeUser(email)
  }

  @Patch('add/socket')
  async addSocket(@Body() data: {socketId: string, token: string}) {
    console.log('Data: ')
    console.log(data)
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {socketId: data.socketId, email: email}
    this.UsersService.addSocket(body)
  }

  @Post('get/mess')
  async getMess(@Body() data: {token: string, trueParamEmail: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {trueParamEmail: data.trueParamEmail, email: email}
    return this.UsersService.getMess(body)
  }

  @Post('get/friend/mess/count')
  async getFriendMessCount(@Body() data: {token: string, trueParamEmail: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {trueParamEmail: data.trueParamEmail, email: email}
    return this.UsersService.getFriendMessCount(body)
  }

  @Patch('zero/mess')
  async zeroMess(@Body() data: {token: string, trueParamEmail: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {trueParamEmail: data.trueParamEmail, email: email}
    this.UsersService.zeroMess(body)
  }

  // @Patch('delete/mess')
  // async deleteMess(@Body() data: {trueParamEmail: string, messId: string[], token: string, unreadCount: number}) {
  //   const email = await getEmailFromToken(data.token, this.jwtService)
  //   const body = {email: email, trueParamEmail: data.trueParamEmail, messId: data.messId, unreadCount: data.unreadCount}
  //   return this.UsersService.deleteMess(body)
  // }

  @Patch('new/mess')  
  @UseInterceptors(FilesInterceptor('photo'))
  async newMess(@UploadedFiles() files: any, @Body() body: {user: string, text: string, date: string, id: string, ans: string, type: string, trueParamEmail: string, per: string, origUser: string, origId: string, videoId?: string, token: string, myText: string}) {
    const email = await getEmailFromToken(body.token, this.jwtService)  
    const resultData = {...body, files: files, email: email, text: JSON.parse(body.text), myText: JSON.parse(body.myText)}
    return this.UsersService.newMess(resultData)
  }

  @Patch('new/chat')
  @UseInterceptors(FilesInterceptor('photo'))
  async newChat(@UploadedFiles() files: Express.Multer.File[], @Body() body: {user: string, text: string, date: string, id: string, ans: string, type: string, trueParamEmail: string, per: string, origUser: string, origId: string, videoId?: string, token: string}) {
    const email = await getEmailFromToken(body.token, this.jwtService)  
    const resultData = {...body, files: files, email: email}
    return this.UsersService.newChat(resultData)
  }

  @Post('get/my/ban/mess')
  async getMyBanMess(@Body() body: {token: string}) {
    const email = await getEmailFromToken(body.token, this.jwtService)
    return this.UsersService.getBanMess(email)
  }

  @Post('typing')
  async typing(@Body() data: {trueParamEmail: string, token: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)  
    const body = {trueParamEmail: data.trueParamEmail, email: email}
    this.UsersService.typingUser(body)
  }

  @Post('get/perm/data')
  async getPermData(@Body() data: {trueParamEmail: string, token: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {trueParamEmail: data.trueParamEmail, email: email}
    return this.UsersService.getPermData(body)
  }

  @Patch('edit/mess')
  async editMess(@Body() data: {trueParamEmail: string, editMess: string, inputMess: string, per: string, token: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {trueParamEmail: data.trueParamEmail, editMess: data.editMess, inputMess: data.inputMess, per: data.per, email: email}
    return this.UsersService.editMess(body)
  }
    
  @Post('start/voice')
  async startVoice(@Body() data: {trueParamEmail: string, token: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {trueParamEmail: data.trueParamEmail, email: email}
    this.UsersService.startVoice(body)
  }

  @Post('stop/voice')
  async stopVoice(@Body() data: {trueParamEmail: string, token: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {trueParamEmail: data.trueParamEmail, email: email}
    this.UsersService.stopVoice(body)
  }

  @Patch('delete/chat')
  async deleteChat(@Body() data: {friendEmail: string, friendDel: boolean, token: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {email: email, friendEmail: data.friendEmail, friendDel: data.friendDel}
    return this.UsersService.deleteChat(body)
  }

  @Post('big/photos')
  async getBigPhotos(@Body() data: {messId: string, trueParamEmail: string, token: string}, @Res() res: Response) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {...data, email: email}
    const archive = await this.UsersService.getBigPhotos(body)
    res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="photos_${data.messId}.zip"`,
    });
    if (archive) {
        archive.pipe(res)
    }
  }

  @Post('video')
  async getVideoMess(@Body() data: {videoMessId: string, trueParamEmail: string, token: string}, @Res() res: Response) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {...data, email: email}
    const archive = await this.UsersService.getVideoMess(body)
    res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="file"',
    });
    archive.pipe(res)
  }

  @Post('open/chat')
  async openChat(@Body() data: {trueParamEmail: string, userToken: string}) {
    const email = await getEmailFromToken(data.userToken, this.jwtService)
    const body = {email: email, trueParamEmail: data.trueParamEmail}
    this.UsersService.openChat(body)
  }

  @Get('find/user/:emailUser')
  findUser(@Param('emailUser') user: string) {
    return this.UsersService.findUser(user)
  }

  @Post('user/info')
  async userInfo(@Body() body: {token: string}) {
    const email = await getEmailFromToken(body.token, this.jwtService)
    return this.UsersService.getUserInfo(email)
  }

  @Patch('new/avatar')
  async newAvatar(@Body() data: {token: string, resultAvatar: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {targetEmail: email, newAva: data.resultAvatar}
    this.UsersService.newAvatar(body)
  } 

  @Patch('new/name')
  async newName(@Body() data: {token: string, name: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService) 
    const body = {email: email, name: data.name}
    return this.UsersService.newName(body)
  }

  @Patch('get/bot/mess')
  async getBotMess(@Body() body: {token: string}) {
    const email = await getEmailFromToken(body.token, this.jwtService) 
    return this.UsersService.getBotMess(email)
  }

  @Post('prompt')
  async userPrompt(@Body() data: {token: string, inputPrompt: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService) 
    const body = {email: email, inputPrompt: data.inputPrompt}
    return this.openAIService.userPrompt(body)
  }

  @Patch('add/public/key')
  async addPublicKey(@Body() data: {publicKey: string, token: string}) {
    const email = await getEmailFromToken(data.token, this.jwtService)
    const body = {email: email, publicKey: data.publicKey}
    return this.UsersService.addPublicKey(body)
  }

  
}
