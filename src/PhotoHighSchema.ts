import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';

export type PhotoHighDocument = PhotoHigh & Document;

@Schema()
export class PhotoHigh {
    @Prop()
    id: string;

    @Prop()
    photo: Buffer;

}


export const PhotoHighSchema = SchemaFactory.createForClass(PhotoHigh);