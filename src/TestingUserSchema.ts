import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TestingUserDocument = TestingUser & Document;


@Schema()
export class TestingUser {
    @Prop({ required: true })
    id: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    age: number;
}


export const TestingUserSchema = SchemaFactory.createForClass(TestingUser);