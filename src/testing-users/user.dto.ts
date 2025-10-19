import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UserDto {
    @IsNotEmpty({message: 'Пожалйуста, введите логин'})
    @MinLength(5, {message: 'Логин должен состоять не менее чем из 5 символов'})
    @IsString()
    login: string;

    @IsNotEmpty({message: 'Пожалйуста, введите пароль'})
    @MinLength(8, {message: 'Пароль должен состоять не менее чем из 8 символов'})
    @IsString()
    password: string;

}