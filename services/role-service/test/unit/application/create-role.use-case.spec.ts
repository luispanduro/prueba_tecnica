import { ConflictException } from '@nestjs/common';
import { CreateRoleUseCase } from '../../../src/application/use-cases/create-role.use-case';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      existsByName: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
    };
    useCase = new CreateRoleUseCase(mockRepo);
  });

  it('should create role', async () => {
    const result = await useCase.execute({ name: 'editor', description: 'Editor role' });
    expect(result.name.value).toBe('editor');
  });

  it('should throw 409 if name exists', async () => {
    mockRepo.existsByName.mockResolvedValue(true);
    await expect(useCase.execute({ name: 'admin' })).rejects.toThrow(ConflictException);
  });

  it('should normalize name to lowercase', async () => {
    const result = await useCase.execute({ name: 'ADMIN' });
    expect(result.name.value).toBe('admin');
  });
});
