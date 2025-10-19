import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TestingUserDocument = TestingUser & Document;

@Schema()

@Schema()
export class TestingUser {
    @Prop({ required: true })
    token: string;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    timeStamp: number;
}


export const TestingUserSchema = SchemaFactory.createForClass(TestingUser);