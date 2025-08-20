import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TestingUserDocument = TestingUser & Document;


@Schema()
export class TestingUser {
    @Prop({ required: true })
    login: string;

    @Prop()
    password: string;

    @Prop()
    name: string;

    @Prop()
    age: number;
}


export const TestingUserSchema = SchemaFactory.createForClass(TestingUser);