import { IsString } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  description!: string;
}
