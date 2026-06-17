import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { LoginUseCase } from '../../../src/application/use-cases/login.use-case';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockRepo: any;
  let mockPasswordService: any;
  let mockJwtService: any;
  let mockRoleClient: any;

  beforeEach(() => {
    mockRepo = {
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
    };
    mockPasswordService = { verify: jest.fn() };
    mockJwtService = { generate: jest.fn() };
    mockRoleClient = { getUserRoles: jest.fn() };
    useCase = new LoginUseCase(mockRepo, mockPasswordService, mockJwtService, mockRoleClient);
  });

  it('should throw 401 when user not found', async () => {
    mockRepo.findByUsername.mockResolvedValue(null);
    mockRepo.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute({ usernameOrEmail: 'unknown', password: 'pass' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('should throw 401 when user inactive', async () => {
    mockRepo.findByUsername.mockResolvedValue({ id: '1', username: 'u', isActive: false, passwordHash: 'h' });
    await expect(useCase.execute({ usernameOrEmail: 'u', password: 'pass' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('should throw 401 when password invalid', async () => {
    mockRepo.findByUsername.mockResolvedValue({ id: '1', username: 'u', isActive: true, passwordHash: 'h' });
    mockPasswordService.verify.mockResolvedValue(false);
    await expect(useCase.execute({ usernameOrEmail: 'u', password: 'wrong' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('should throw 503 when role service fails', async () => {
    mockRepo.findByUsername.mockResolvedValue({ id: '1', username: 'u', isActive: true, passwordHash: 'h' });
    mockPasswordService.verify.mockResolvedValue(true);
    mockRoleClient.getUserRoles.mockRejectedValue(new Error('unavailable'));
    await expect(useCase.execute({ usernameOrEmail: 'u', password: 'pass' }))
      .rejects.toThrow(ServiceUnavailableException);
  });

  it('should return token on success', async () => {
    mockRepo.findByUsername.mockResolvedValue({ id: '1', username: 'admin', isActive: true, passwordHash: 'h' });
    mockPasswordService.verify.mockResolvedValue(true);
    mockRoleClient.getUserRoles.mockResolvedValue(['admin']);
    mockJwtService.generate.mockReturnValue({ access_token: 'tok', token_type: 'Bearer', expires_in: 3600 });
    mockRepo.updateLastLogin.mockResolvedValue(undefined);

    const result = await useCase.execute({ usernameOrEmail: 'admin', password: 'pass' });
    expect(result.access_token).toBe('tok');
    expect(result.user.roles).toEqual(['admin']);
  });
});
