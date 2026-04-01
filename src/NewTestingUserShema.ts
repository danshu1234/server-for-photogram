import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';

export type NewTestingUserDocument = NewTestingUser & Document;


@Schema()
export class NewTestingUser {
    @Prop()
    token: string;

    @Prop()
    email: string;

}


export const NewTestingUserSchema = SchemaFactory.createForClass(NewTestingUser);

NewTestingUserSchema.index({id: 1})