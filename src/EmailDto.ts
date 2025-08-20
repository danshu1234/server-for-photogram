import { IsEmail, IsString } from 'class-validator';

export class EmailDto {
    @IsEmail()
    email: string;
}
