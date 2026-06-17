import { Injectable } from '@nestjs/common';
import { UserContextData } from '../http-clients/user-service.client';
import { RoleData } from '../http-clients/role-service.client';

export interface DocumentChunk {
  content: string;
  metadata: {
    source_type: string;
    source_id: string;
    entity_type: string;
    indexed_at: string;
    [key: string]: string;
  };
}

@Injectable()
export class ChunkerService {
  chunkUsers(users: UserContextData[]): DocumentChunk[] {
    const now = new Date().toISOString();

    return users.map((user) => ({
      content: `Usuario: ${user.username}. Nombre completo: ${user.firstName} ${user.lastName}. Email: ${user.email}. Estado: ${user.isActive ? 'activo' : 'inactivo'}.`,
      metadata: {
        source_type: 'user_data',
        source_id: user.id,
        entity_type: 'user',
        username: user.username,
        indexed_at: now,
      },
    }));
  }

  chunkRoles(roles: RoleData[]): DocumentChunk[] {
    const now = new Date().toISOString();

    return roles.map((role) => ({
      content: `Rol: ${role.name}. Descripción: ${role.description || 'Sin descripción'}.`,
      metadata: {
        source_type: 'role_data',
        source_id: role.id,
        entity_type: 'role',
        role_name: role.name,
        indexed_at: now,
      },
    }));
  }
}
