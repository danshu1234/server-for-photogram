import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class NewUserDto {
    @IsNotEmpty({message: 'Пожалйуста, введите логин'})
    @IsEmail({}, {message: 'Некорректный email'})
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
}