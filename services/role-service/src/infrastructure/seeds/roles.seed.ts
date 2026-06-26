import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoleTypeormEntity } from '../persistence/typeorm/entities/role.typeorm-entity';

const logger = new Logger('RolesSeed');

const SYSTEM_ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'Acceso completo al sistema',
    permissions: [
      'users:read', 'users:write', 'users:delete',
      'roles:read', 'roles:write', 'roles:delete',
      'audit:read', 'ai:admin',
    ],
    isSystem: true,
  },
  {
    name: 'ADMIN',
    description: 'Administrador del sistema',
    permissions: ['users:read', 'users:write', 'users:delete', 'roles:read', 'audit:read'],
    isSystem: true,
  },
  {
    name: 'USER',
    description: 'Usuario estándar',
    permissions: ['users:read'],
    isSystem: true,
  },
  {
    name: 'AUDITOR',
    description: 'Auditor del sistema',
    permissions: ['audit:read', 'users:read'],
    isSystem: true,
  },
];

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(RoleTypeormEntity);
  for (const roleData of SYSTEM_ROLES) {
    const existing = await repo.findOne({ where: { name: roleData.name } });
    if (existing) {
      logger.log({ action: 'seed.role.exists', name: roleData.name });
      continue;
    }
    const role = repo.create(roleData);
    await repo.save(role);
    logger.log({ action: 'seed.role.created', name: roleData.name });
  }
}
