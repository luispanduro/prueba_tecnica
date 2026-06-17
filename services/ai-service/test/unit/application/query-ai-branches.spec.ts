import { QueryAiUseCase } from '../../../src/application/use-cases/query-ai.use-case';

describe('QueryAiUseCase - Branch coverage', () => {
  let useCase: QueryAiUseCase;
  let mockRetriever: any;
  let mockPromptBuilder: any;
  let mockLlmClient: any;
  let mockLogger: any;

  beforeEach(() => {
    mockRetriever = { retrieve: jest.fn().mockResolvedValue([]) };
    mockPromptBuilder = { build: jest.fn().mockReturnValue({ systemPrompt: 'sys', userPrompt: 'q' }) };
    mockLlmClient = { invoke: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    useCase = new QueryAiUseCase(mockRetriever, mockPromptBuilder, mockLlmClient, mockLogger);
  });

  it('should return null cost when tokens are 0', async () => {
    mockLlmClient.invoke.mockResolvedValue({ content: 'answer', tokensIn: 0, tokensOut: 0, model: 'gpt-3.5-turbo' });
    const result = await useCase.execute({ query: 'test' });
    expect(result.cost_estimate).toBeNull();
  });

  it('should calculate cost when tokens > 0', async () => {
    mockLlmClient.invoke.mockResolvedValue({ content: 'answer', tokensIn: 1000, tokensOut: 500, model: 'gpt-3.5-turbo' });
    const result = await useCase.execute({ query: 'test' });
    expect(result.cost_estimate).toBeGreaterThan(0);
  });

  it('should pass correlationId and userId to logger', async () => {
    mockLlmClient.invoke.mockResolvedValue({ content: 'x', tokensIn: 10, tokensOut: 5, model: 'm' });
    await useCase.execute({ query: 'q', userId: 'u1', correlationId: 'c1' });
    expect(mockLogger.info).toHaveBeenCalledWith(
      'AI query processed',
      expect.objectContaining({ user_id: 'u1', correlation_id: 'c1' }),
    );
  });

  it('should handle no userId/correlationId gracefully', async () => {
    mockLlmClient.invoke.mockResolvedValue({ content: 'x', tokensIn: 10, tokensOut: 5, model: 'm' });
    const result = await useCase.execute({ query: 'q' });
    expect(result.answer).toBe('x');
  });
});
