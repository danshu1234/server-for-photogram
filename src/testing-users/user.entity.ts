import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  primaryId: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  age: number;

  @Column()
  id: string;
}