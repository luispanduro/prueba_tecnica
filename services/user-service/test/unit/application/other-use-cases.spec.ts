import { NotFoundException, ConflictException } from '@nestjs/common';
import { GetUserUseCase } from '../../../src/application/use-cases/get-user.use-case';
import { ListUsersUseCase } from '../../../src/application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../../src/application/use-cases/update-user.use-case';
import { DeleteUserUseCase } from '../../../src/application/use-cases/delete-user.use-case';

describe('GetUserUseCase', () => {
  let useCase: GetUserUseCase;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = { findById: jest.fn() };
    useCase = new GetUserUseCase(mockRepo);
  });

  it('should return user when found', async () => {
    const user = { id: 'u1', username: { value: 'john' }, email: { value: 'j@t.com' }, firstName: 'J', lastName: 'D', isActive: true, createdAt: new Date(), updatedAt: new Date() };
    mockRepo.findById.mockResolvedValue(user);
    const result = await useCase.execute('u1');
    expect(result).toBe(user);
  });

  it('should throw 404 when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('unknown')).rejects.toThrow(NotFoundException);
  });
});

describe('ListUsersUseCase', () => {
  it('should return all users', async () => {
    const mockRepo = { findAll: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]) };
    const useCase = new ListUsersUseCase(mockRepo as any);
    const result = await useCase.execute();
    expect(result).toHaveLength(2);
  });
});

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      existsByUsername: jest.fn().mockResolvedValue(false),
      existsByEmail: jest.fn().mockResolvedValue(false),
      update: jest.fn(),
    };
    useCase = new UpdateUserUseCase(mockRepo);
  });

  it('should throw 404 if user not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('u1', { firstName: 'X' })).rejects.toThrow(NotFoundException);
  });

  it('should throw 409 if username taken', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'u1', username: { value: 'old' }, email: { value: 'e@t.com' } });
    mockRepo.existsByUsername.mockResolvedValue(true);
    await expect(useCase.execute('u1', { username: 'taken' })).rejects.toThrow(ConflictException);
  });

  it('should update successfully', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'u1', username: { value: 'old' }, email: { value: 'e@t.com' } });
    mockRepo.update.mockResolvedValue({ id: 'u1' });
    const result = await useCase.execute('u1', { firstName: 'New' });
    expect(result).toBeDefined();
  });
});

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = { findById: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
    useCase = new DeleteUserUseCase(mockRepo);
  });

  it('should throw 404 if user not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('u1')).rejects.toThrow(NotFoundException);
  });

  it('should delete successfully', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'u1' });
    await useCase.execute('u1');
    expect(mockRepo.delete).toHaveBeenCalledWith('u1');
  });
});
