import { NotFoundException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { ListRolesUseCase } from '../../../src/application/use-cases/list-roles.use-case';
import { GetRoleUseCase } from '../../../src/application/use-cases/get-role.use-case';
import { DeleteRoleUseCase } from '../../../src/application/use-cases/delete-role.use-case';
import { AssignRoleUseCase } from '../../../src/application/use-cases/assign-role.use-case';
import { UnassignRoleUseCase } from '../../../src/application/use-cases/unassign-role.use-case';
import { GetUserRolesUseCase } from '../../../src/application/use-cases/get-user-roles.use-case';

describe('ListRolesUseCase', () => {
  it('should list all roles', async () => {
    const mockRepo = { findAll: jest.fn().mockResolvedValue([{ id: 'r1' }]) };
    const useCase = new ListRolesUseCase(mockRepo as any);
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
  });
});

describe('GetRoleUseCase', () => {
  it('should return role', async () => {
    const mockRepo = { findById: jest.fn().mockResolvedValue({ id: 'r1' }) };
    const useCase = new GetRoleUseCase(mockRepo as any);
    expect(await useCase.execute('r1')).toEqual({ id: 'r1' });
  });

  it('should throw 404', async () => {
    const mockRepo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new GetRoleUseCase(mockRepo as any);
    await expect(useCase.execute('r1')).rejects.toThrow(NotFoundException);
  });
});

describe('DeleteRoleUseCase', () => {
  it('should delete role', async () => {
    const mockRoleRepo = { findById: jest.fn().mockResolvedValue({ id: 'r1' }), delete: jest.fn() };
    const mockUserRoleRepo = { deleteByRoleId: jest.fn() };
    const useCase = new DeleteRoleUseCase(mockRoleRepo as any, mockUserRoleRepo as any);
    await useCase.execute('r1');
    expect(mockRoleRepo.delete).toHaveBeenCalledWith('r1');
  });

  it('should throw 404 if role not found', async () => {
    const mockRoleRepo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new DeleteRoleUseCase(mockRoleRepo as any, {} as any);
    await expect(useCase.execute('r1')).rejects.toThrow(NotFoundException);
  });
});

describe('AssignRoleUseCase', () => {
  let mockRoleRepo: any, mockUserRoleRepo: any, mockUserClient: any;

  beforeEach(() => {
    mockRoleRepo = { findById: jest.fn().mockResolvedValue({ id: 'r1' }) };
    mockUserRoleRepo = { exists: jest.fn().mockResolvedValue(false), assign: jest.fn().mockImplementation((ur) => Promise.resolve(ur)) };
    mockUserClient = { userExists: jest.fn().mockResolvedValue(true) };
  });

  it('should assign role', async () => {
    const useCase = new AssignRoleUseCase(mockRoleRepo, mockUserRoleRepo, mockUserClient);
    const result = await useCase.execute({ userId: 'u1', roleId: 'r1', assignedBy: 'admin' });
    expect(result.userId).toBe('u1');
  });

  it('should throw 404 if role not found', async () => {
    mockRoleRepo.findById.mockResolvedValue(null);
    const useCase = new AssignRoleUseCase(mockRoleRepo, mockUserRoleRepo, mockUserClient);
    await expect(useCase.execute({ userId: 'u1', roleId: 'r1', assignedBy: 'a' })).rejects.toThrow(NotFoundException);
  });

  it('should throw 404 if user not found', async () => {
    mockUserClient.userExists.mockResolvedValue(false);
    const useCase = new AssignRoleUseCase(mockRoleRepo, mockUserRoleRepo, mockUserClient);
    await expect(useCase.execute({ userId: 'u1', roleId: 'r1', assignedBy: 'a' })).rejects.toThrow(NotFoundException);
  });

  it('should throw 409 if already assigned', async () => {
    mockUserRoleRepo.exists.mockResolvedValue(true);
    const useCase = new AssignRoleUseCase(mockRoleRepo, mockUserRoleRepo, mockUserClient);
    await expect(useCase.execute({ userId: 'u1', roleId: 'r1', assignedBy: 'a' })).rejects.toThrow(ConflictException);
  });

  it('should throw 503 if user service unavailable', async () => {
    mockUserClient.userExists.mockRejectedValue(new ServiceUnavailableException('unavailable'));
    const useCase = new AssignRoleUseCase(mockRoleRepo, mockUserRoleRepo, mockUserClient);
    await expect(useCase.execute({ userId: 'u1', roleId: 'r1', assignedBy: 'a' })).rejects.toThrow();
  });
});

describe('UnassignRoleUseCase', () => {
  it('should unassign role', async () => {
    const mockRoleRepo = { findById: jest.fn().mockResolvedValue({ id: 'r1' }) };
    const mockUserRoleRepo = { exists: jest.fn().mockResolvedValue(true), unassign: jest.fn() };
    const useCase = new UnassignRoleUseCase(mockRoleRepo as any, mockUserRoleRepo as any);
    await useCase.execute({ userId: 'u1', roleId: 'r1' });
    expect(mockUserRoleRepo.unassign).toHaveBeenCalled();
  });

  it('should throw 404 if assignment not found', async () => {
    const mockRoleRepo = { findById: jest.fn().mockResolvedValue({ id: 'r1' }) };
    const mockUserRoleRepo = { exists: jest.fn().mockResolvedValue(false) };
    const useCase = new UnassignRoleUseCase(mockRoleRepo as any, mockUserRoleRepo as any);
    await expect(useCase.execute({ userId: 'u1', roleId: 'r1' })).rejects.toThrow(NotFoundException);
  });
});

describe('GetUserRolesUseCase', () => {
  it('should return roles for user', async () => {
    const mockRepo = { findRolesByUserId: jest.fn().mockResolvedValue(['admin', 'user']) };
    const useCase = new GetUserRolesUseCase(mockRepo as any);
    const result = await useCase.execute('u1');
    expect(result).toEqual(['admin', 'user']);
  });
});
