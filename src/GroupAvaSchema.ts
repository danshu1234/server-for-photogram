import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';

export type GroupAvaDocument = GroupAva & Document;

@Schema()

@Schema()
export class GroupAva {
    @Prop({ required: animationFrameScheduler })
    id: string;

    @Prop({ required: animationFrameScheduler })
    avatar: string;

}


export const GroupAvaSchema = SchemaFactory.createForClass(GroupAva);
