import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';
import { Message } from './UserSchema';

export type PlanMessDocument = PlanMess & Document;

@Schema()

@Schema()
export class PlanMess {
    @Prop({ required: animationFrameScheduler })
    id: string;

    @Prop({ required: animationFrameScheduler })
    message: Message;

    @Prop({ required: animationFrameScheduler })
    sender: string;

    @Prop({ required: animationFrameScheduler })
    targetUser: string;

    @Prop({ required: animationFrameScheduler })
    time: number;

}


export const PlanMessSchema = SchemaFactory.createForClass(PlanMess);