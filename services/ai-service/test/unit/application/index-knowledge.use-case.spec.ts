import { ServiceUnavailableException } from '@nestjs/common';
import { IndexKnowledgeUseCase } from '../../../src/application/use-cases/index-knowledge.use-case';

describe('IndexKnowledgeUseCase', () => {
  let useCase: IndexKnowledgeUseCase;
  let mockUserClient: any;
  let mockRoleClient: any;
  let mockChunker: any;
  let mockIndexer: any;
  let mockLogger: any;

  beforeEach(() => {
    mockUserClient = { getContextData: jest.fn().mockResolvedValue([{ id: 'u1', username: 'john', email: 'j@t.com', firstName: 'J', lastName: 'D', isActive: true }]) };
    mockRoleClient = { getRoles: jest.fn().mockResolvedValue([{ id: 'r1', name: 'admin', description: 'Admin' }]) };
    mockChunker = {
      chunkUsers: jest.fn().mockReturnValue([{ content: 'user chunk', metadata: { source_type: 'user_data', source_id: 'u1', entity_type: 'user', indexed_at: '' } }]),
      chunkRoles: jest.fn().mockReturnValue([{ content: 'role chunk', metadata: { source_type: 'role_data', source_id: 'r1', entity_type: 'role', indexed_at: '' } }]),
    };
    mockIndexer = { index: jest.fn().mockResolvedValue({ documents_fetched: 2, chunks_generated: 2, embeddings_stored: 2, collection: 'system_knowledge', latency_ms: 100 }) };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    useCase = new IndexKnowledgeUseCase(mockUserClient, mockRoleClient, mockChunker, mockIndexer, mockLogger);
  });

  it('should index successfully', async () => {
    const result = await useCase.execute();
    expect(result.documents_fetched).toBe(2);
    expect(result.chunks_generated).toBe(2);
    expect(result.embeddings_stored).toBe(2);
    expect(mockChunker.chunkUsers).toHaveBeenCalled();
    expect(mockChunker.chunkRoles).toHaveBeenCalled();
  });

  it('should throw 503 if User Service fails', async () => {
    mockUserClient.getContextData.mockRejectedValue(new Error('unavailable'));
    await expect(useCase.execute()).rejects.toThrow(ServiceUnavailableException);
  });

  it('should throw 503 if Role Service fails', async () => {
    mockRoleClient.getRoles.mockRejectedValue(new Error('unavailable'));
    await expect(useCase.execute()).rejects.toThrow(ServiceUnavailableException);
  });

  it('should handle empty data', async () => {
    mockUserClient.getContextData.mockResolvedValue([]);
    mockRoleClient.getRoles.mockResolvedValue([]);
    mockChunker.chunkUsers.mockReturnValue([]);
    mockChunker.chunkRoles.mockReturnValue([]);
    const result = await useCase.execute();
    expect(result.chunks_generated).toBe(0);
    expect(mockIndexer.index).not.toHaveBeenCalled();
  });
});
