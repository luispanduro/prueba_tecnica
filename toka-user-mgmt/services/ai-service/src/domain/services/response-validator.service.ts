import { Injectable } from '@nestjs/common';

@Injectable()
export class ResponseValidatorService {
  validate(
    answer: string,
    avgChunkScore: number,
    chunksRetrieved: number,
    finishReason?: string,
  ): string[] {
    const flags: string[] = [];

    if (answer.trim().length === 0) flags.push('empty_response');
    if (answer.length < 50) flags.push('too_short');
    if (finishReason === 'length') flags.push('max_tokens_reached');
    if (chunksRetrieved > 0 && avgChunkScore < 0.65) flags.push('low_retrieval_score');
    if (chunksRetrieved === 0) flags.push('no_context_found');

    return flags;
  }
}
