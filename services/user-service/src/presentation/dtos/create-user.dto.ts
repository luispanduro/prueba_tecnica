import { IsNotEmpty, IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'username is required' })
  @IsString()
  @MinLength(3, { message: 'username must be at least 3 characters' })
  @MaxLength(100, { message: 'username must be at most 100 characters' })
  username!: string;

  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  @IsNotEmpty({ message: 'firstName is required' })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsNotEmpty({ message: 'lastName is required' })
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsNotEmpty({ message: 'password is required' })
  @IsString()
  @MinLength(6, { message: 'password must be at least 6 characters' })
  password!: string;
}
