import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PhotoDocument = Photo & Document;

@Schema()
export class Photo {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  likes: string[];

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  date: string;
}

export const PhotoSchema = SchemaFactory.createForClass(Photo);