export class GenerateUsersDto {
  postgre: Array<{
    id: string;
    name: string;
    age: number; 
  }>;

  mongo: Array<{
    id: string;
    name: string;
    age: number;
  }>;
}