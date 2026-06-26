import { IsString, Matches } from 'class-validator';

export class AddPermissionDto {
  @IsString()
  @Matches(/^[a-z_]+:[a-z_*]+$/, {
    message: 'permission must match format resource:action',
  })
  permission!: string;
}
