import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PhotoDocument = Photo & Document;

@Schema()
class Comment {
  @Prop({required: true})
  user: string;
  comment: string;
  userName: string;
}

@Schema()
export class Photo {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  url: string[];

  @Prop({ required: true })
  likes: string[];

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: false })
  descript: string;

  @Prop({ required: false })
  comments: Comment[];

  @Prop({ required: false })
  commentsPerm: boolean;
}

export const PhotoSchema = SchemaFactory.createForClass(Photo);