import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { animationFrameScheduler } from 'rxjs';

export type NewTestingUserDocument = NewTestingUser & Document;

@Schema()

@Schema()
export class NewTestingUser {
    @Prop({ required: animationFrameScheduler })
    id: string;

}


export const NewTestingUserSchema = SchemaFactory.createForClass(NewTestingUser);

NewTestingUserSchema.index({id: 1})