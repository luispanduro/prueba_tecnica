import { ListAuditEventsUseCase } from '../../../src/application/use-cases/list-audit-events.use-case';

describe('ListAuditEventsUseCase', () => {
  let useCase: ListAuditEventsUseCase;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = { findRecent: jest.fn().mockResolvedValue([{ id: 'e1', eventType: 'test' }]) };
    useCase = new ListAuditEventsUseCase(mockRepo);
  });

  it('should return recent events with default limit', async () => {
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(mockRepo.findRecent).toHaveBeenCalledWith(100);
  });

  it('should respect custom limit', async () => {
    await useCase.execute(50);
    expect(mockRepo.findRecent).toHaveBeenCalledWith(50);
  });

  it('should cap limit at 100', async () => {
    await useCase.execute(500);
    expect(mockRepo.findRecent).toHaveBeenCalledWith(100);
  });

  it('should use default for invalid limit', async () => {
    await useCase.execute(0);
    expect(mockRepo.findRecent).toHaveBeenCalledWith(100);
  });
});
