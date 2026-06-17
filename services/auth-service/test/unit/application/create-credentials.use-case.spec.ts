import { ConflictException } from '@nestjs/common';
import { CreateCredentialsUseCase } from '../../../src/application/use-cases/create-credentials.use-case';

describe('CreateCredentialsUseCase', () => {
  let useCase: CreateCredentialsUseCase;
  let mockRepo: any;
  let mockPasswordService: any;

  beforeEach(() => {
    mockRepo = {
      existsByUsername: jest.fn().mockResolvedValue(false),
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    mockPasswordService = { hash: jest.fn().mockResolvedValue('$2b$hashed') };
    useCase = new CreateCredentialsUseCase(mockRepo, mockPasswordService);
  });

  it('should create credentials successfully', async () => {
    const result = await useCase.execute({
      userId: 'uid-1', username: 'newuser', email: 'new@test.com', password: 'pass123',
    });
    expect(result.userId).toBe('uid-1');
    expect(result.username).toBe('newuser');
    expect(mockPasswordService.hash).toHaveBeenCalledWith('pass123');
  });

  it('should throw 409 if username exists', async () => {
    mockRepo.existsByUsername.mockResolvedValue(true);
    await expect(useCase.execute({
      userId: 'u1', username: 'taken', email: 'x@t.com', password: 'p',
    })).rejects.toThrow(ConflictException);
  });

  it('should throw 409 if email exists', async () => {
    mockRepo.existsByEmail.mockResolvedValue(true);
    await expect(useCase.execute({
      userId: 'u1', username: 'new', email: 'taken@t.com', password: 'p',
    })).rejects.toThrow(ConflictException);
  });
});
