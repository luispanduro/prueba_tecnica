import { ChunkerService } from '../../../src/infrastructure/indexer/chunker.service';

describe('ChunkerService', () => {
  let service: ChunkerService;

  beforeEach(() => {
    service = new ChunkerService();
  });

  it('should chunk users', () => {
    const users = [{ id: 'u1', username: 'john', email: 'j@t.com', firstName: 'John', lastName: 'Doe', isActive: true }];
    const chunks = service.chunkUsers(users);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('john');
    expect(chunks[0].metadata.source_type).toBe('user_data');
  });

  it('should chunk roles', () => {
    const roles = [{ id: 'r1', name: 'admin', description: 'Admin role' }];
    const chunks = service.chunkRoles(roles);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('admin');
    expect(chunks[0].metadata.source_type).toBe('role_data');
  });

  it('should return empty for empty input', () => {
    expect(service.chunkUsers([])).toHaveLength(0);
    expect(service.chunkRoles([])).toHaveLength(0);
  });
});
