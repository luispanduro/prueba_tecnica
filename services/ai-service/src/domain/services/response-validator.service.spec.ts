import { ResponseValidatorService } from './response-validator.service';

describe('ResponseValidatorService', () => {
  let service: ResponseValidatorService;

  beforeEach(() => {
    service = new ResponseValidatorService();
  });

  it('should return no flags for a good response', () => {
    const flags = service.validate(
      'El rol ADMIN tiene los permisos users:read, users:write, users:delete, roles:read y audit:read.',
      0.85,
      3,
    );
    expect(flags).toHaveLength(0);
  });

  it('should flag empty_response when answer is empty', () => {
    const flags = service.validate('', 0.85, 3);
    expect(flags).toContain('empty_response');
    expect(flags).toContain('too_short');
  });

  it('should flag empty_response when answer is only whitespace', () => {
    const flags = service.validate('   ', 0.85, 3);
    expect(flags).toContain('empty_response');
  });

  it('should flag too_short when answer is less than 50 characters', () => {
    const flags = service.validate('Corta.', 0.85, 3);
    expect(flags).toContain('too_short');
    expect(flags).not.toContain('empty_response');
  });

  it('should flag max_tokens_reached when finishReason is length', () => {
    const longAnswer = 'A'.repeat(100);
    const flags = service.validate(longAnswer, 0.85, 3, 'length');
    expect(flags).toContain('max_tokens_reached');
  });

  it('should NOT flag max_tokens_reached when finishReason is stop', () => {
    const longAnswer = 'A'.repeat(100);
    const flags = service.validate(longAnswer, 0.85, 3, 'stop');
    expect(flags).not.toContain('max_tokens_reached');
  });

  it('should flag low_retrieval_score when avgChunkScore < 0.65 and chunks > 0', () => {
    const answer = 'Esta es una respuesta suficientemente larga para no ser marcada como corta.';
    const flags = service.validate(answer, 0.6, 3);
    expect(flags).toContain('low_retrieval_score');
  });

  it('should NOT flag low_retrieval_score when chunksRetrieved is 0', () => {
    const answer = 'Esta es una respuesta suficientemente larga para no ser marcada como corta.';
    const flags = service.validate(answer, 0.0, 0);
    expect(flags).not.toContain('low_retrieval_score');
    expect(flags).toContain('no_context_found');
  });

  it('should flag no_context_found when chunksRetrieved is 0', () => {
    const answer = 'Esta es una respuesta suficientemente larga para no ser marcada como corta.';
    const flags = service.validate(answer, 0.0, 0);
    expect(flags).toContain('no_context_found');
  });

  it('should accumulate multiple flags', () => {
    const flags = service.validate('', 0.5, 0);
    expect(flags).toContain('empty_response');
    expect(flags).toContain('too_short');
    expect(flags).toContain('no_context_found');
  });
});
