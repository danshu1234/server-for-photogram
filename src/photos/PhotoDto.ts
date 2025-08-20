import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class PhotoDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsString()
    @IsNotEmpty()
    @IsEmail()
    resultEmail: string;

    @IsString()
    @IsNotEmpty()
    img: string;

    @IsString()
    @IsNotEmpty()
    date: string;

    @IsString()
    descript: string;
}