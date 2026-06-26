import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';

export class MetricsCallback extends BaseCallbackHandler {
  name = 'MetricsCallback';

  private startTime = 0;
  llmLatencyMs = 0;
  promptTokens = 0;
  completionTokens = 0;
  finishReason: string | undefined;

  handleLLMStart(): void {
    this.startTime = Date.now();
  }

  handleLLMEnd(output: LLMResult): void {
    this.llmLatencyMs = Date.now() - this.startTime;
    const usage = output.llmOutput?.tokenUsage as
      | { promptTokens?: number; completionTokens?: number }
      | undefined;
    if (usage) {
      this.promptTokens = usage.promptTokens ?? 0;
      this.completionTokens = usage.completionTokens ?? 0;
    }
    this.finishReason =
      (output.generations?.[0]?.[0]?.generationInfo?.finish_reason as string | undefined) ??
      undefined;
  }
}
