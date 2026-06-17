import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateTokenDto {
  @IsNotEmpty({ message: 'token is required' })
  @IsString()
  token!: string;
}
