import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';
import { Message } from './UserSchema';

export type ChatDocument = Chat & Document;


@Schema()
export class Chat {  
    @Prop({ required: true })
    id: string;

    @Prop({ required: true })
    users: string[];

    @Prop({ required: false })
    messages: Message[];
}


export const ChatSchema = SchemaFactory.createForClass(Chat);
