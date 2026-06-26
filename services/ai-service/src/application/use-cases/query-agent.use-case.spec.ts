import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { QueryAgentUseCase } from './query-agent.use-case';
import { METRIC_REPOSITORY } from '../../domain/repositories/metric.repository.interface';
import { CostCalculatorService } from '../../domain/services/cost-calculator.service';
import { ResponseValidatorService } from '../../domain/services/response-validator.service';
import { UserServiceClient } from '../../infrastructure/http-clients/user-service.client';
import { PromptBuilder } from '../prompts/prompt-builder';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid-1234') }));

const mockSearch = jest.fn();
const mockEmbedQuery = jest.fn();
const mockInvoke = jest.fn();

jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({
    search: mockSearch,
  })),
}));

jest.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedQuery: mockEmbedQuery,
  })),
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockInvoke,
  })),
}));

describe('QueryAgentUseCase', () => {
  let useCase: QueryAgentUseCase;
  let metricRepo: { save: jest.Mock; findAll: jest.Mock; findById: jest.Mock };
  let userServiceClient: { getUserById: jest.Mock };

  const defaultSearchResult = [
    {
      score: 0.9,
      payload: {
        content: 'El rol ADMIN tiene permisos: users:read, users:write.',
        source: 'roles-permissions-reference.md',
      },
    },
  ];

  const longAnswer = 'El rol ADMIN tiene los siguientes permisos: users:read, users:write, users:delete, roles:read, audit:read. Estos permisos permiten gestión completa de usuarios.';

  beforeEach(async () => {
    metricRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    userServiceClient = { getUserById: jest.fn().mockResolvedValue(null) };

    mockSearch.mockResolvedValue(defaultSearchResult);
    mockEmbedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
    mockInvoke.mockResolvedValue({ content: longAnswer });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryAgentUseCase,
        CostCalculatorService,
        ResponseValidatorService,
        PromptBuilder,
        { provide: METRIC_REPOSITORY, useValue: metricRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const cfg: Record<string, string> = {
                QDRANT_URL: 'http://qdrant:6333',
                QDRANT_COLLECTION: 'system_knowledge',
                OPENAI_API_KEY: 'test-api-key',
                USER_SERVICE_URL: 'http://user-service:3002',
              };
              return cfg[key];
            }),
          },
        },
        { provide: UserServiceClient, useValue: userServiceClient },
      ],
    }).compile();

    useCase = module.get<QueryAgentUseCase>(QueryAgentUseCase);
  });

  it('should return queryId, answer, sources and metrics', async () => {
    const result = await useCase.execute({ query: '¿Qué permisos tiene ADMIN?' });

    expect(result.queryId).toBe('test-uuid-1234');
    expect(result.answer).toBe(longAnswer);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      content: 'El rol ADMIN tiene permisos: users:read, users:write.',
      source: 'roles-permissions-reference.md',
      score: 0.9,
    });
    expect(result.metrics).toMatchObject({
      latencyMs: expect.any(Number),
      inputTokens: expect.any(Number),
      outputTokens: expect.any(Number),
      estimatedCostUSD: expect.any(Number),
      qualityFlags: expect.any(Array),
    });
  });

  it('should persist metrics after a successful query', async () => {
    await useCase.execute({ query: '¿Qué permisos tiene ADMIN?' });

    expect(metricRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        queryId: 'test-uuid-1234',
        chunksRetrieved: 1,
        avgChunkScore: 0.9,
      }),
    );
  });

  it('should continue pipeline when userId is not found in User Service', async () => {
    userServiceClient.getUserById.mockResolvedValue(null);

    const result = await useCase.execute({
      query: '¿Cuál es el estado del usuario?',
      userId: 'nonexistent-id',
    });

    expect(result.queryId).toBe('test-uuid-1234');
    expect(userServiceClient.getUserById).toHaveBeenCalledWith('nonexistent-id');
  });

  it('should include user data in context when userId resolves to a user', async () => {
    userServiceClient.getUserById.mockResolvedValue({
      id: 'user-1',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@test.com',
      status: 'ACTIVE',
      roleIds: ['role-admin'],
    });

    const result = await useCase.execute({
      query: '¿Qué roles tiene este usuario?',
      userId: 'user-1',
    });

    expect(result.queryId).toBe('test-uuid-1234');
    expect(userServiceClient.getUserById).toHaveBeenCalledWith('user-1');
  });

  it('should skip User Service call when no userId is provided', async () => {
    await useCase.execute({ query: '¿Qué permisos tiene ADMIN?' });
    expect(userServiceClient.getUserById).not.toHaveBeenCalled();
  });

  it('should flag no_context_found when Qdrant returns no results', async () => {
    mockSearch.mockResolvedValue([]);

    const result = await useCase.execute({ query: '¿Qué permisos tiene ADMIN?' });

    expect(result.metrics.qualityFlags).toContain('no_context_found');
    expect(result.sources).toHaveLength(0);
  });

  it('should throw ServiceUnavailableException on 429 from OpenAI LLM', async () => {
    mockInvoke.mockRejectedValue({
      status: 429,
      response: { headers: { 'retry-after': '5' } },
    });

    await expect(useCase.execute({ query: '¿Qué permisos tiene ADMIN?' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw ServiceUnavailableException on generic OpenAI error', async () => {
    mockInvoke.mockRejectedValue(new Error('Connection timeout'));

    await expect(useCase.execute({ query: '¿Qué permisos tiene ADMIN?' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw ServiceUnavailableException when embedQuery fails with 429', async () => {
    mockEmbedQuery.mockRejectedValue({ status: 429, response: { headers: {} } });

    await expect(useCase.execute({ query: '¿Qué permisos tiene ADMIN?' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
