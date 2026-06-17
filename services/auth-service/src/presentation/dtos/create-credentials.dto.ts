import { IsNotEmpty, IsString, IsEmail, IsUUID, MinLength } from 'class-validator';

export class CreateCredentialsDto {
  @IsNotEmpty({ message: 'userId is required' })
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId!: string;

  @IsNotEmpty({ message: 'username is required' })
  @IsString()
  username!: string;

  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'email must be a valid email' })
  email!: string;

  @IsNotEmpty({ message: 'password is required' })
  @IsString()
  @MinLength(6, { message: 'password must be at least 6 characters' })
  password!: string;
}
