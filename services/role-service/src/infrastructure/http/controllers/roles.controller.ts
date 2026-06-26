import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { UpdateRoleDto } from '../dtos/update-role.dto';
import { AddPermissionDto } from '../dtos/add-permission.dto';
import { CreateRoleCommand } from '../../../application/commands/create-role.command';
import { UpdateRoleCommand } from '../../../application/commands/update-role.command';
import { DeleteRoleCommand } from '../../../application/commands/delete-role.command';
import { AddPermissionCommand } from '../../../application/commands/add-permission.command';
import { RemovePermissionCommand } from '../../../application/commands/remove-permission.command';
import { GetRoleQuery } from '../../../application/queries/get-role.query';
import { GetRolesQuery } from '../../../application/queries/get-roles.query';
import { GetRolePermissionsQuery } from '../../../application/queries/get-role-permissions.query';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  getAll() {
    return this.queryBus.execute(new GetRolesQuery());
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetRoleQuery(id));
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.queryBus.execute(new GetRolePermissionsQuery(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateRoleDto,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(
      new CreateRoleCommand(
        dto.name,
        dto.description ?? '',
        dto.isSystem ?? false,
        correlationId,
      ),
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(
      new UpdateRoleCommand(id, dto.description, correlationId),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(new DeleteRoleCommand(id, correlationId));
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.CREATED)
  addPermission(
    @Param('id') id: string,
    @Body() dto: AddPermissionDto,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(
      new AddPermissionCommand(id, dto.permission, correlationId),
    );
  }

  @Delete(':id/permissions/:perm')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePermission(
    @Param('id') id: string,
    @Param('perm') perm: string,
    @Headers('x-correlation-id') correlationId: string = '',
  ) {
    return this.commandBus.execute(
      new RemovePermissionCommand(id, perm, correlationId),
    );
  }
}
