import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AnimationFrameScheduler } from 'rxjs/internal/scheduler/AnimationFrameScheduler';

export type UserDocument = User & Document;

@Schema()
export class Notification {
  @Prop({ required: true })
  type: string;

  @Prop({ required: false })
  photoId: string;

  @Prop({ required: true })
  user: string;
}

@Schema()
export class Message {
  @Prop({ required: true })
  user: string;

  @Prop({ required: false })
  text: string;

  @Prop({ required: AnimationFrameScheduler })
  photos: Buffer[];

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  ans: string;

  @Prop({ required: false })
  edit: boolean;

  @Prop({ required: true })
  typeMess: string;

  @Prop({ required: false })
  per: string;

  @Prop({ required: true })
  pin: boolean;
}

@Schema()
export class Messages {
  @Prop({ required: true })
  user: string;

  @Prop({ required: false })
  messages: Message[];

  @Prop({ required: true })
  messCount: number;

  @Prop({ required: true })
  pin: boolean;

  @Prop({ required: true })
  notifs: boolean;
}

@Schema()
export class User {

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  subscribes: string[];

  @Prop({ required: true })
  name: string;

  @Prop({ type: [Notification], required: true })
  notifs: Notification[];

  @Prop({ required: false })
  socket: string;

  @Prop({ required: true })
  usersBan: string[];

  @Prop({ required: false })
  visits: string[];

  @Prop({required: false})
  reports: string[];

  @Prop({required: false})
  avatar: string;

  @Prop({required: true})
  open: boolean;

  @Prop({required: false})
  permUsers: [String | boolean];
  
  @Prop({ required: false })
  messages: Messages[];

  @Prop({ required: true })
  banMess: string[];

  @Prop({ required: true })
  permMess: string;

  @Prop({ required: false })
  birthday: string;

  @Prop({ required: true })
  savePosts: string[];
}


export const UserSchema = SchemaFactory.createForClass(User);