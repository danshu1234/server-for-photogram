import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  subscribes: string[];

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  notifs: string[];

  @Prop({ required: false })
  socket: string;
}

export const UserSchema = SchemaFactory.createForClass(User);