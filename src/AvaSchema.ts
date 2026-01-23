import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';

export type AvaDocument = Ava & Document;

@Schema()

@Schema()
export class Ava {
    @Prop({ required: animationFrameScheduler })
    email: string;

    @Prop({ required: animationFrameScheduler })
    avatar: string;

}


export const AvaSchema = SchemaFactory.createForClass(Ava);
