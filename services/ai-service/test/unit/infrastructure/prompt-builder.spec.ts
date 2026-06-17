import { PromptBuilderService } from '../../../src/infrastructure/llm/prompt-builder.service';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  beforeEach(() => {
    service = new PromptBuilderService();
  });

  it('should build prompt with context', () => {
    const docs = [
      { content: 'User admin is active', sourceType: 'user_data', sourceId: 'u1', score: 0.9 },
    ];
    const result = service.build('Who is admin?', docs);
    expect(result.systemPrompt).toContain('basándote en el contexto');
    expect(result.userPrompt).toContain('User admin is active');
    expect(result.userPrompt).toContain('Who is admin?');
  });

  it('should handle empty context', () => {
    const result = service.build('Hello', []);
    expect(result.userPrompt).toContain('No hay contexto disponible');
  });
});
