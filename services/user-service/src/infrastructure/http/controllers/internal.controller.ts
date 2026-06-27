import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UserTypeormEntity } from '../../persistence/typeorm/entities/user.typeorm-entity';

interface RoleDto {
  id: string;
  name: string;
  permissions: string[];
}

@Controller('internal')
export class InternalController {
  private readonly roleServiceUrl: string;

  constructor(
    @InjectRepository(UserTypeormEntity)
    private readonly userRepo: Repository<UserTypeormEntity>,
    private readonly config: ConfigService,
  ) {
    this.roleServiceUrl = config.get<string>('ROLE_SERVICE_URL') ?? 'http://role-service:3003';
  }

  @Get('users/permissions')
  async getPermissionsByEmail(
    @Query('email') email: string,
  ): Promise<{ roleIds: string[]; permissions: string[] }> {
    if (!email) return { roleIds: [], permissions: [] };

    const user = await this.userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return { roleIds: [], permissions: [] };

    const roleIds = (user.roleIds ?? []).filter((r) => r.trim() !== '');
    if (roleIds.length === 0) return { roleIds: [], permissions: [] };

    const permissions: string[] = [];
    try {
      const { data: allRoles } = await axios.get<RoleDto[]>(
        `${this.roleServiceUrl}/internal/roles`,
        { timeout: 3000 },
      );
      for (const role of allRoles) {
        if (roleIds.includes(role.id)) {
          permissions.push(...(role.permissions ?? []));
        }
      }
    } catch {
      // role-service unavailable — return roleIds without permissions
    }

    return { roleIds, permissions: [...new Set(permissions)] };
  }
}
