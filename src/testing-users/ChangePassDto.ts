import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class ChangePassDto {
    @IsString()
    oldPass: string;

    @IsString()
    @MinLength(8, {message: 'Password must be 8 or more length'})
    newPass: string;

    @IsString()
    token: string;
    
}