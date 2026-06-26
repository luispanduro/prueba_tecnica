import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CreateUserHandler } from './commands/create-user.command';
import { UpdateUserHandler } from './commands/update-user.command';
import { DeleteUserHandler } from './commands/delete-user.command';
import { AssignRoleHandler } from './commands/assign-role.command';
import { RemoveRoleHandler } from './commands/remove-role.command';
import { GetUserHandler } from './queries/get-user.query';
import { GetUsersHandler } from './queries/get-users.query';
import { GetUserRolesHandler } from './queries/get-user-roles.query';
import { RoleServiceClient } from '../infrastructure/http-clients/role-service.client';

const CommandHandlers = [
  CreateUserHandler,
  UpdateUserHandler,
  DeleteUserHandler,
  AssignRoleHandler,
  RemoveRoleHandler,
];

const QueryHandlers = [GetUserHandler, GetUsersHandler, GetUserRolesHandler];

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
  providers: [...CommandHandlers, ...QueryHandlers, RoleServiceClient],
  exports: [CqrsModule, RoleServiceClient],
})
export class UserApplicationModule {}
