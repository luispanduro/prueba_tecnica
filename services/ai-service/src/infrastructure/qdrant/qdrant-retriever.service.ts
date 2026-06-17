import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';
import { LoggerService } from '@user-management/shared';

export interface RetrievedDocument {
  content: string;
  sourceType: string;
  sourceId: string;
  score: number;
}

@Injectable()
export class QdrantRetrieverService {
  private readonly client: QdrantClient;
  private readonly embeddings: OpenAIEmbeddings;
  private readonly collectionName: string;
  private readonly topK = 5;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const qdrantUrl = this.config.get<string>('QDRANT_URL', 'http://localhost:6333');
    this.collectionName = this.config.get<string>('QDRANT_COLLECTION', 'system_knowledge');

    this.client = new QdrantClient({ url: qdrantUrl });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.config.get<string>('OPENAI_API_KEY'),
      modelName: this.config.get<string>('OPENAI_EMBEDDING_MODEL', 'text-embedding-ada-002'),
    });
  }

  async retrieve(query: string): Promise<RetrievedDocument[]> {
    try {
      // Generate embedding for the query
      const queryVector = await this.embeddings.embedQuery(query);

      // Search Qdrant for similar documents
      const results = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit: this.topK,
        with_payload: true,
      });

      return results.map((result) => ({
        content: (result.payload?.content as string) || '',
        sourceType: (result.payload?.source_type as string) || '',
        sourceId: (result.payload?.source_id as string) || '',
        score: result.score,
      }));
    } catch (error) {
      this.logger.warn('Qdrant retrieval failed, returning empty context', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      return [];
    }
  }
}
