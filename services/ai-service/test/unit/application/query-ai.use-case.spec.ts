import { QueryAiUseCase } from '../../../src/application/use-cases/query-ai.use-case';

describe('QueryAiUseCase', () => {
  let useCase: QueryAiUseCase;
  let mockRetriever: any;
  let mockPromptBuilder: any;
  let mockLlmClient: any;
  let mockLogger: any;

  beforeEach(() => {
    mockRetriever = { retrieve: jest.fn().mockResolvedValue([{ content: 'ctx', sourceType: 'user', sourceId: 'u1', score: 0.9 }]) };
    mockPromptBuilder = { build: jest.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'user q' }) };
    mockLlmClient = { invoke: jest.fn().mockResolvedValue({ content: 'AI answer', tokensIn: 100, tokensOut: 50, model: 'gpt-3.5-turbo' }) };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    useCase = new QueryAiUseCase(mockRetriever, mockPromptBuilder, mockLlmClient, mockLogger);
  });

  it('should return answer with metadata', async () => {
    const result = await useCase.execute({ query: 'Who is admin?' });
    expect(result.answer).toBe('AI answer');
    expect(result.context_count).toBe(1);
    expect(result.model).toBe('gpt-3.5-turbo');
    expect(result.tokens_in).toBe(100);
    expect(result.tokens_out).toBe(50);
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('should calculate cost estimate', async () => {
    const result = await useCase.execute({ query: 'test' });
    expect(result.cost_estimate).not.toBeNull();
  });

  it('should log metrics', async () => {
    await useCase.execute({ query: 'test', userId: 'u1', correlationId: 'c1' });
    expect(mockLogger.info).toHaveBeenCalledWith('AI query processed', expect.objectContaining({
      user_id: 'u1',
      correlation_id: 'c1',
    }));
  });

  it('should handle empty context', async () => {
    mockRetriever.retrieve.mockResolvedValue([]);
    const result = await useCase.execute({ query: 'test' });
    expect(result.context_count).toBe(0);
  });
});
