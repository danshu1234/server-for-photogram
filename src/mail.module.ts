import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule], 
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'daniilsundeev2@gmail.com', 
            pass: configService.get('MAIL_PASS'), 
          },
        },
        defaults: {
          from: 'Photogram',
        },
      }),
      inject: [ConfigService], 
    }),
  ],
})
export class MailModule {}