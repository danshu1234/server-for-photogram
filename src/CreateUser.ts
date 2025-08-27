import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUser {
    @IsNotEmpty({message: 'Пожалйуста, введите логин'})
    @MinLength(5, {message: 'Логин должен состоять не менее чем из 5 символов'})
    @IsEmail()
    @IsString()
    login: string;

    @IsNotEmpty({message: 'Пожалйуста, введите имя'})
    @IsString()
    name: string;

    @IsNotEmpty({message: 'Пожалйуста, введите пароль'})
    @MinLength(8, {message: 'Пароль должен состоять не менее чем из 8 символов'})
    @IsString()
    firstPass: string;

    @IsNotEmpty({message: 'Пожалйуста, введите пароль повторно'})
    @IsString()
    secondPass: string;

    @IsNotEmpty({message: 'Пожалйуста, введите код'})
    @IsString()
    code: string;
}