import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LoggerService } from '@user-management/shared';
import { UserServiceClient } from '../../infrastructure/http-clients/user-service.client';
import { RoleServiceClient } from '../../infrastructure/http-clients/role-service.client';
import { ChunkerService } from '../../infrastructure/indexer/chunker.service';
import { QdrantIndexerService, IndexResult } from '../../infrastructure/indexer/qdrant-indexer.service';

@Injectable()
export class IndexKnowledgeUseCase {
  constructor(
    private readonly userServiceClient: UserServiceClient,
    private readonly roleServiceClient: RoleServiceClient,
    private readonly chunker: ChunkerService,
    private readonly indexer: QdrantIndexerService,
    private readonly logger: LoggerService,
  ) {}

  async execute(): Promise<IndexResult> {
    // 1. Fetch data from User Service
    let users;
    try {
      users = await this.userServiceClient.getContextData();
    } catch (error) {
      throw new ServiceUnavailableException(
        'Unable to fetch data from User Service for indexation.',
      );
    }

    // 2. Fetch data from Role Service
    let roles;
    try {
      roles = await this.roleServiceClient.getRoles();
    } catch (error) {
      throw new ServiceUnavailableException(
        'Unable to fetch data from Role Service for indexation.',
      );
    }

    this.logger.info('Data fetched for indexation', {
      users_count: users.length,
      roles_count: roles.length,
    });

    // 3. Generate chunks
    const userChunks = this.chunker.chunkUsers(users);
    const roleChunks = this.chunker.chunkRoles(roles);
    const allChunks = [...userChunks, ...roleChunks];

    if (allChunks.length === 0) {
      return {
        documents_fetched: 0,
        chunks_generated: 0,
        embeddings_stored: 0,
        collection: 'system_knowledge',
        latency_ms: 0,
      };
    }

    // 4. Index in Qdrant
    const result = await this.indexer.index(allChunks);

    return {
      ...result,
      documents_fetched: users.length + roles.length,
    };
  }
}
