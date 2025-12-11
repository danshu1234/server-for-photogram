import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';

export type VideoDocument = Video & Document;

@Schema()

@Schema()
export class Video {
    @Prop({ required: animationFrameScheduler })
    id: string;

    @Prop({ required: animationFrameScheduler })
    name: string;

    @Prop({ required: animationFrameScheduler })
    video: Buffer;

}


export const VideoSchema = SchemaFactory.createForClass(Video);

VideoSchema.index({id: 1})