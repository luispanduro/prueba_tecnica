import {
  Controller,
  Get,
  Post,
  Put,
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
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { RedisCacheService } from '../../infrastructure/cache/redis-cache.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly cacheService: RedisCacheService,
    private readonly auditPublisher: AuditPublisherService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    // Extract JWT token from request to forward to Auth Service
    const authHeader = req.headers.authorization || '';
    const jwtToken = authHeader.replace('Bearer ', '');

    const user = await this.createUserUseCase.execute({
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      jwtToken,
    });

    await this.publishAuditEvent(
      ROUTING_KEYS.USER_CREATED,
      'user.created',
      'create',
      user.id,
      actor,
      req,
    );

    return UserResponseDto.fromDomain(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.listUsersUseCase.execute();
    return users.map(UserResponseDto.fromDomain);
  }

  @Get('context')
  async getContext(): Promise<UserResponseDto[]> {
    const users = await this.listUsersUseCase.execute();
    return users.map(UserResponseDto.fromDomain);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    // Check cache first
    const cached = await this.cacheService.get<UserResponseDto>(`user:${id}`);
    if (cached) {
      return cached;
    }

    const user = await this.getUserUseCase.execute(id);
    const response = UserResponseDto.fromDomain(user);

    // Store in cache
    await this.cacheService.set(`user:${id}`, response);

    return response;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const user = await this.updateUserUseCase.execute(id, {
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: dto.isActive,
    });

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    await this.publishAuditEvent(
      ROUTING_KEYS.USER_UPDATED,
      'user.updated',
      'update',
      id,
      actor,
      req,
    );

    return UserResponseDto.fromDomain(user);
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
    await this.deleteUserUseCase.execute(id);

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    await this.publishAuditEvent(
      ROUTING_KEYS.USER_DELETED,
      'user.deleted',
      'delete',
      id,
      actor,
      req,
    );
  }

  private async publishAuditEvent(
    routingKey: string,
    eventType: string,
    action: string,
    resourceId: string,
    actor: AuthenticatedUser,
    req: Request,
  ): Promise<void> {
    const correlationId = (req.headers['x-correlation-id'] as string) || '';

    const event: AuditEventMessage = {
      event_type: eventType,
      actor_id: actor.user_id,
      actor_username: actor.username,
      resource_type: 'user',
      resource_id: resourceId,
      action,
      details: {},
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      service_origin: 'user-service',
    };

    await this.auditPublisher.publish(routingKey, event);
  }
}
