import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  JwtAuthGuard,
  RoleGuard,
  Roles,
  CurrentUser,
  AuthenticatedUser,
  AuditPublisherService,
  ROUTING_KEYS,
  AuditEventMessage,
} from '@user-management/shared';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { GetRoleUseCase } from '../../application/use-cases/get-role.use-case';
import { DeleteRoleUseCase } from '../../application/use-cases/delete-role.use-case';
import { AssignRoleUseCase } from '../../application/use-cases/assign-role.use-case';
import { UnassignRoleUseCase } from '../../application/use-cases/unassign-role.use-case';
import { GetUserRolesUseCase } from '../../application/use-cases/get-user-roles.use-case';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { AssignRoleDto } from '../dtos/assign-role.dto';
import { UnassignRoleDto } from '../dtos/unassign-role.dto';
import { RedisCacheService } from '../../infrastructure/cache/redis-cache.service';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly unassignRoleUseCase: UnassignRoleUseCase,
    private readonly getUserRolesUseCase: GetUserRolesUseCase,
    private readonly cacheService: RedisCacheService,
    private readonly auditPublisher: AuditPublisherService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const role = await this.createRoleUseCase.execute({
      name: dto.name,
      description: dto.description,
    });

    // Invalidate roles list cache
    await this.cacheService.del('roles:list');

    await this.publishAuditEvent(ROUTING_KEYS.ROLE_CREATED, 'role.created', 'create', role.id, actor, req);

    return {
      id: role.id,
      name: role.name.value,
      description: role.description,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    // Check cache
    const cached = await this.cacheService.get<unknown[]>('roles:list');
    if (cached) return cached;

    const roles = await this.listRolesUseCase.execute();
    const result = roles.map((role) => ({
      id: role.id,
      name: role.name.value,
      description: role.description,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    }));

    await this.cacheService.set('roles:list', result);
    return result;
  }

  @Get('user/:userId')
  async getUserRoles(@Param('userId') userId: string) {
    // Check cache
    const cached = await this.cacheService.get<{ roles: string[] }>(`user:${userId}:roles`);
    if (cached) return cached;

    const roles = await this.getUserRolesUseCase.execute(userId);
    const result = { roles };

    await this.cacheService.set(`user:${userId}:roles`, result);
    return result;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const role = await this.getRoleUseCase.execute(id);
    return {
      id: role.id,
      name: role.name.value,
      description: role.description,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.deleteRoleUseCase.execute(id);

    // Invalidate roles list cache
    await this.cacheService.del('roles:list');

    await this.publishAuditEvent(ROUTING_KEYS.ROLE_DELETED, 'role.deleted', 'delete', id, actor, req);
  }

  @Post('assign')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async assign(
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const userRole = await this.assignRoleUseCase.execute({
      userId: dto.userId,
      roleId: dto.roleId,
      assignedBy: actor.user_id,
    });

    // Invalidate user roles cache
    await this.cacheService.del(`user:${dto.userId}:roles`);

    await this.publishAuditEvent(ROUTING_KEYS.ROLE_ASSIGNED, 'role.assigned', 'assign', dto.roleId, actor, req, {
      userId: dto.userId,
    });

    return {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      assignedAt: userRole.assignedAt.toISOString(),
    };
  }

  @Post('unassign')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async unassign(
    @Body() dto: UnassignRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.unassignRoleUseCase.execute({
      userId: dto.userId,
      roleId: dto.roleId,
    });

    // Invalidate user roles cache
    await this.cacheService.del(`user:${dto.userId}:roles`);

    await this.publishAuditEvent(ROUTING_KEYS.ROLE_UNASSIGNED, 'role.unassigned', 'unassign', dto.roleId, actor, req, {
      userId: dto.userId,
    });

    return { message: 'Role unassigned successfully' };
  }

  private async publishAuditEvent(
    routingKey: string,
    eventType: string,
    action: string,
    resourceId: string,
    actor: AuthenticatedUser,
    req: Request,
    details: Record<string, unknown> = {},
  ): Promise<void> {
    const correlationId = (req.headers['x-correlation-id'] as string) || '';

    const event: AuditEventMessage = {
      event_type: eventType,
      actor_id: actor.user_id,
      actor_username: actor.username,
      resource_type: 'role',
      resource_id: resourceId,
      action,
      details,
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      service_origin: 'role-service',
    };

    await this.auditPublisher.publish(routingKey, event);
  }
}
