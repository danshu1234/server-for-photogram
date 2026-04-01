import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { AnimationFrameScheduler } from 'rxjs/internal/scheduler/AnimationFrameScheduler';
import { KeyWord } from './PhotoSchema';

export type UserDocument = User & Document;

@Schema()
export class EncryptMess {
  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  nonce: string;

  @Prop({ required: true })
  encPublicKey: string;
}

@Schema({ _id: false })
export class OnlineStatus {
  @Prop({ required: false })
  status: string;

  @Prop({ required: true })
  plat: string;
}

@Schema()
export class PhotoMess {
  @Prop({ required: false })
  id: string;

  @Prop({ required: true })
  base64: string;
}

@Schema()
export class BotMess {
  @Prop({ required: true })
  type: string;

  @Prop({ required: false })
  text: string;
}

@Schema()
export class Preview {
  @Prop({ required: true })
  id: string;
}

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

  @Prop({ type: mongoose.Schema.Types.Mixed })
  text: EncryptMess[] | string;

  @Prop({ required: AnimationFrameScheduler })
  photos: PhotoMess[] | Buffer[] | Preview[];

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  id: string;

  @Prop({ required: false })
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

  @Prop({ required: false })
  password: string;

  @Prop({ required: true })
  subscribes: string[];

  @Prop({ required: true })
  name: string;

  @Prop({ type: [Notification], required: true })
  notifs: Notification[];

  @Prop({ required: false })
  socket: string[];

  @Prop({ required: false })
  peerId: string;

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

  @Prop({ required: true })
  botMess: BotMess[];

  @Prop({ required: true })
  onlineStatus: OnlineStatus;

  @Prop({ required: true })
  publicKeys: string[];

  @Prop({ required: true })
  versionToken: number;  

  @Prop({ required: false })
  userNotifs: string[];
  
  @Prop({ required: false })
  keyWords: KeyWord[];
}


export const UserSchema = SchemaFactory.createForClass(User);