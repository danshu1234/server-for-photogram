import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';

export type NewTestingUserDocument = NewTestingUser & Document;

@Schema()
class Message{
    @Prop()
    message: string;

    @Prop()
    nonce: string

}


@Schema()
export class NewTestingUser {
    @Prop({ required: animationFrameScheduler })
    name: string;

    @Prop()
    messages: Message[][];

    @Prop()
    messKey: string[];

}


export const NewTestingUserSchema = SchemaFactory.createForClass(NewTestingUser);

NewTestingUserSchema.index({id: 1})