import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RecPhotoDocument = RecPhoto & Document;

@Schema()
export class RecPhoto {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  id: string[];

  @Prop({ required: true })
  time: number;
}

export const RecPhotoSchema = SchemaFactory.createForClass(RecPhoto);