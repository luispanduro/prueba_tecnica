import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  @MaxLength(50, { message: 'name must be at most 50 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
