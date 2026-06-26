import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../guards/permissions.guard';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { AssignRoleDto } from '../dtos/assign-role.dto';
import { CreateUserCommand } from '../../../application/commands/create-user.command';
import { UpdateUserCommand } from '../../../application/commands/update-user.command';
import { DeleteUserCommand } from '../../../application/commands/delete-user.command';
import { AssignRoleCommand } from '../../../application/commands/assign-role.command';
import { RemoveRoleCommand } from '../../../application/commands/remove-role.command';
import { GetUserQuery } from '../../../application/queries/get-user.query';
import { GetUsersQuery } from '../../../application/queries/get-users.query';
import { GetUserRolesQuery } from '../../../application/queries/get-user-roles.query';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermissions('users:read')
  getAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: string,
    @Query('email') email?: string,
  ) {
    return this.queryBus.execute(
      new GetUsersQuery(Number(page), Number(limit), status, email),
    );
  }

  @Get(':id')
  @RequirePermissions('users:read')
  getOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetUserQuery(id));
  }

  @Get(':id/roles')
  @RequirePermissions('users:read')
  getRoles(@Param('id') id: string) {
    return this.queryBus.execute(new GetUserRolesQuery(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('users:write')
  create(
    @Body() dto: CreateUserDto,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(
      new CreateUserCommand(
        dto.firstName,
        dto.lastName,
        dto.email,
        dto.roleIds ?? [],
        correlationId,
      ),
    );
  }

  @Put(':id')
  @RequirePermissions('users:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(
      new UpdateUserCommand(id, dto.firstName, dto.lastName, dto.email, correlationId),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users:delete')
  delete(
    @Param('id') id: string,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(new DeleteUserCommand(id, correlationId));
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('users:write')
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(
      new AssignRoleCommand(id, dto.roleId, correlationId),
    );
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users:write')
  removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(
      new RemoveRoleCommand(id, roleId, correlationId),
    );
  }
}
