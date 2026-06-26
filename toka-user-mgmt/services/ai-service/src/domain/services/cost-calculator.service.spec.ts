import { CostCalculatorService } from './cost-calculator.service';

describe('CostCalculatorService', () => {
  let service: CostCalculatorService;

  beforeEach(() => {
    service = new CostCalculatorService();
  });

  it('should return 0 when both token counts are 0', () => {
    expect(service.calculate(0, 0)).toBe(0);
  });

  it('should calculate cost for 1M input tokens only', () => {
    expect(service.calculate(1_000_000, 0)).toBeCloseTo(0.15);
  });

  it('should calculate cost for 1M output tokens only', () => {
    expect(service.calculate(0, 1_000_000)).toBeCloseTo(0.6);
  });

  it('should calculate combined cost for input and output tokens', () => {
    // 1M input ($0.15) + 1M output ($0.60) = $0.75
    expect(service.calculate(1_000_000, 1_000_000)).toBeCloseTo(0.75);
  });

  it('should calculate cost for typical query (500 input, 200 output tokens)', () => {
    const expected = (500 / 1_000_000) * 0.15 + (200 / 1_000_000) * 0.6;
    expect(service.calculate(500, 200)).toBeCloseTo(expected, 10);
  });
});
