import { ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from '../../../src/application/use-cases/create-user.use-case';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepo: any;
  let mockAuthClient: any;
  let mockLogger: any;

  beforeEach(() => {
    mockRepo = {
      existsByUsername: jest.fn().mockResolvedValue(false),
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockAuthClient = { createCredentials: jest.fn().mockResolvedValue(undefined) };
    mockLogger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };
    useCase = new CreateUserUseCase(mockRepo, mockAuthClient, mockLogger);
  });

  it('should create user successfully', async () => {
    const result = await useCase.execute({
      username: 'newuser', email: 'new@test.com',
      firstName: 'New', lastName: 'User', password: 'pass123', jwtToken: 'tok',
    });
    expect(result.username.value).toBe('newuser');
    expect(mockAuthClient.createCredentials).toHaveBeenCalled();
  });

  it('should throw 409 if username exists', async () => {
    mockRepo.existsByUsername.mockResolvedValue(true);
    await expect(useCase.execute({
      username: 'taken', email: 'x@t.com', firstName: 'A', lastName: 'B', password: 'p', jwtToken: 't',
    })).rejects.toThrow(ConflictException);
  });

  it('should compensate if Auth Service fails', async () => {
    mockAuthClient.createCredentials.mockRejectedValue(new Error('Auth failed'));
    await expect(useCase.execute({
      username: 'user1', email: 'u@t.com', firstName: 'A', lastName: 'B', password: 'p', jwtToken: 't',
    })).rejects.toThrow();
    expect(mockRepo.delete).toHaveBeenCalled();
  });
});
