import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'usernameOrEmail is required' })
  @IsString()
  usernameOrEmail!: string;

  @IsNotEmpty({ message: 'password is required' })
  @IsString()
  @MinLength(1)
  password!: string;
}
