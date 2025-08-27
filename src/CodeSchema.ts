import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CodeDocument = Code & Document;

@Schema()
export class Code {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    code: string;
}


export const CodeSchema = SchemaFactory.createForClass(Code);