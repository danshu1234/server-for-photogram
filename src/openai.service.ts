import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from 'src/UserSchema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class OpenAIService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=AIzaSyCAPFB2qdSO-A54VDXzLIoU3013IFstKhU';

  constructor(private configService: ConfigService, @InjectModel(User.name) private userModel: Model<UserDocument>) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }
    this.apiKey = apiKey;
  }

  async userPrompt(body: {email: string, inputPrompt: string}) {
    const responseAi = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: body.inputPrompt }]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      }),
    })
    if (!responseAi.ok) {
      const errorData = await responseAi.text();
      console.error('Gemini API error:', errorData);
      throw new HttpException(
        `Gemini API error: ${responseAi.status} ${responseAi.statusText}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    const resultResponseAi = await responseAi.json()
    const findtThisUser = await this.userModel.findOne({email: body.email})
    if (findtThisUser) {
      const newUserMessBot = [...findtThisUser?.botMess, {type: 'user', text: body.inputPrompt}, {type: 'bot', text: resultResponseAi.candidates[0]?.content?.parts[0]?.text}]
      await this.userModel.findOneAndUpdate({email: body.email}, {botMess: newUserMessBot}, {new: true})
      return resultResponseAi.candidates[0]?.content?.parts[0]?.text
    }
  }

}