import { Injectable } from '@nestjs/common';

@Injectable()
export class CostCalculatorService {
  calculate(inputTokens: number, outputTokens: number): number {
    return (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6;
  }
}
