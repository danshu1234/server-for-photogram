import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { CookieJwtGuard } from './cookie-jwt.guard';
import { Request } from '@nestjs/common';

@Controller('openai')
export class OpenAIController {
  constructor(private readonly openAIService: OpenAIService) {}

  @Post('prompt')
  @UseGuards(CookieJwtGuard)
  userPrompt(@Body() data: {inputPrompt: string}, @Request() req) {
    const body = {email: req.user.email, inputPrompt: data.inputPrompt}
    return this.openAIService.userPrompt(body)
  }

}