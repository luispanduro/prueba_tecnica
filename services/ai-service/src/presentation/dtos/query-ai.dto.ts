import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class QueryAiDto {
  @IsNotEmpty({ message: 'query is required' })
  @IsString()
  @MinLength(1, { message: 'query must not be empty' })
  query!: string;
}
