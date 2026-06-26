import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CreateRoleHandler } from './commands/create-role.command';
import { UpdateRoleHandler } from './commands/update-role.command';
import { DeleteRoleHandler } from './commands/delete-role.command';
import { AddPermissionHandler } from './commands/add-permission.command';
import { RemovePermissionHandler } from './commands/remove-permission.command';
import { GetRoleHandler } from './queries/get-role.query';
import { GetRolesHandler } from './queries/get-roles.query';
import { GetRolePermissionsHandler } from './queries/get-role-permissions.query';

const CommandHandlers = [
  CreateRoleHandler,
  UpdateRoleHandler,
  DeleteRoleHandler,
  AddPermissionHandler,
  RemovePermissionHandler,
];

const QueryHandlers = [
  GetRoleHandler,
  GetRolesHandler,
  GetRolePermissionsHandler,
];

@Module({
  imports: [
    CqrsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '900s' },
      }),
    }),
  ],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [CqrsModule],
})
export class RoleApplicationModule {}
