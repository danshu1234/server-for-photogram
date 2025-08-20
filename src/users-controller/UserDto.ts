import { IsString, IsEmail, IsNotEmpty, IsNumber } from "class-validator";

export class UserDto {
    @IsEmail()
    @IsNotEmpty()
    resultEmail: string;

    @IsNotEmpty()
    code: string;

    @IsNotEmpty()
    resultName: string;

    @IsString()
    country: string;

    @IsNumber()
    latitude: number;

    @IsNumber()
    longitude: number;
}