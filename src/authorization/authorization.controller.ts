import { NewUserDto } from 'src/NewUserDto';
import { AuthorizationService } from './authorization.service';
import { Controller, Get, Body, Post, Param, Patch, UseInterceptors, UploadedFiles, UseGuards, Request, Res, UploadedFile } from '@nestjs/common';
import { CreateUser } from 'src/CreateUser';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CookieJwtGuard } from 'src/cookie-jwt.guard';

@Controller('authorization-controller')
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @Post('enter')
  enter(@Body() body: {login: string, password: string, mobile?: string}, @Res({ passthrough: true }) response: Response) {
    return this.authorizationService.enter(body, response)
  }

  @Post('send/code')
  sendCode(@Body() body: NewUserDto) {
    return this.authorizationService.sendCode(body)
  }

  @Post('reg/user')
  regUser(@Body() body: CreateUser, @Res({ passthrough: true }) response: Response) {
    return this.authorizationService.regUser(body, response)
  }

  @Post('send/enter/code/:email') 
  sendEnterCode(@Param('email') email: string) {
    return this.authorizationService.sendEnterCode(email)
  }

  @Post('email/enter')
  emailEnter(@Body() body: {email: string, code: string}) {
    return this.authorizationService.emailEnter(body)
  }

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
  getNewToken(@Body() data: {refreshToken: string}, @Res({ passthrough: true }) response: Response) {
    const body = {...data, refreshToken: JSON.parse(data.refreshToken)}
    return this.authorizationService.getNewToken(body, response)
  }

  @Get('change/token')
  @UseGuards(CookieJwtGuard)
  async changeToken(@Request() req, @Res({ passthrough: true }) response: Response) {
    const email = req.user.email
    return this.authorizationService.changeToken(email, response)
  }

  @Post('enter/test')
  enterTest(@Body() body: {login: string, password: string}) {
    return this.authorizationService.enterTest(body)
  }

  @Post('get/email/test')
  getEmailTest(@Body() body: {sessId: string}) {
    return this.authorizationService.getEmailTest(body.sessId)
  }

  @Get('get/token')
  async getToken(@Request() req) {
    const token = req.cookies?.accessToken
    return token
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Post('save/token')
  saveToken(@Body() body: {accessToken: string}, @Res() res: Response) {
    res.cookie('accessToken', body.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, 
    });
    return 'OK'
  }

  @Post('check/ban/user')
  @UseGuards(CookieJwtGuard)
  checkBanUser(@Request() req, @Res({ passthrough: true }) response: Response) {
    const body = {email: req.user.email, response: response}
    return this.authorizationService.checkBanUser(body)
  }


}
