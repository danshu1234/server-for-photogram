import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Field, ObjectType, ID } from '@nestjs/graphql';

export type ExperimUserDocument = ExperimUser & Document;

@ObjectType()  
@Schema({ collection: 'experimusers' })  
export class ExperimUser {
    @Field(() => ID)  
    id: string;      

    @Field()          
    @Prop()           
    email: string;

    @Field()          
    @Prop()           
    name: string;

    @Prop()           
    password: string;

    @Field(() => [String])
    @Prop()
    friends: string[];

    @Field(() => [ExperimUser])
    friendsUsers: ExperimUser[];
}

export const ExperimUserSchema = SchemaFactory.createForClass(ExperimUser);