import { IsNotEmpty, IsUUID } from 'class-validator';

export class UnassignRoleDto {
  @IsNotEmpty({ message: 'userId is required' })
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId!: string;

  @IsNotEmpty({ message: 'roleId is required' })
  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  roleId!: string;
}
