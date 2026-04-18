import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';
import { Message } from './UserSchema';

export type ChatDocument = Chat & Document;

interface PinChat{
    user: string;
    pin: boolean;
}

interface NotifsUser{
    user: string;
    notifs: boolean;
}

interface MessCount{
    user: string;
    countMess: number;
}

@Schema()
export class Chat {  
    @Prop({ required: true })
    id: string;

    @Prop({ required: true })
    users: string[];

    @Prop({ required: false })
    messages: Message[];

    @Prop({ required: false })
    messCount: MessCount[];

    @Prop({ required: false })
    notifs: NotifsUser[];

    @Prop({ required: false })
    pin: PinChat[];
}


export const ChatSchema = SchemaFactory.createForClass(Chat);
