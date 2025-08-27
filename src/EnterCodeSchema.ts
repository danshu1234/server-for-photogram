import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnterCodeDocument = EnterCode & Document;

@Schema()
export class EnterCode {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    code: string;
}


export const EnterCodeSchema = SchemaFactory.createForClass(EnterCode);