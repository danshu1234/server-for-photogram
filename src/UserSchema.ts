import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class Notification {
  @Prop({ required: true })
  notif: string;

  @Prop({ required: true })
  photoId: string;
}

@Schema()
export class User {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  subscribes: string[];

  @Prop({ required: true })
  name: string;

  @Prop({ type: [Notification], required: true })
  notifs: Notification[];

  @Prop({ required: false })
  socket: string;
}


export const UserSchema = SchemaFactory.createForClass(User);