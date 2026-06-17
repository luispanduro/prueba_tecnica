import { Injectable, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LoggerService } from '@user-management/shared';
import { BuiltPrompt } from './prompt-builder.service';

export interface LlmResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

@Injectable()
export class LlmClientService {
  private readonly chat: ChatOpenAI;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.model = this.config.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo');

    this.chat = new ChatOpenAI({
      openAIApiKey: this.config.get<string>('OPENAI_API_KEY'),
      modelName: this.model,
      maxTokens: this.config.get<number>('AI_MAX_TOKENS', 1024),
      temperature: this.config.get<number>('AI_TEMPERATURE', 0.3),
    });
  }

  async invoke(prompt: BuiltPrompt): Promise<LlmResponse> {
    try {
      const response = await this.chat.invoke([
        new SystemMessage(prompt.systemPrompt),
        new HumanMessage(prompt.userPrompt),
      ]);

      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      const usage = response.usage_metadata;
      const tokensIn = usage?.input_tokens || 0;
      const tokensOut = usage?.output_tokens || 0;

      return {
        content,
        tokensIn,
        tokensOut,
        model: this.model,
      };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };

      if (err.status === 429) {
        throw new HttpException(
          'AI service is temporarily rate limited. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.error(
        'LLM invocation failed',
        error instanceof Error ? error.stack : undefined,
        { model: this.model },
      );

      throw new ServiceUnavailableException(
        'AI service is currently unavailable. Please try again later.',
      );
    }
  }
}
