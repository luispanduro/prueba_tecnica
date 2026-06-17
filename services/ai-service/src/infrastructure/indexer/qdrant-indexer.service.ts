import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';
import { LoggerService } from '@user-management/shared';
import { DocumentChunk } from './chunker.service';
import { v4 as uuidv4 } from 'uuid';

export interface IndexResult {
  documents_fetched: number;
  chunks_generated: number;
  embeddings_stored: number;
  collection: string;
  latency_ms: number;
}

@Injectable()
export class QdrantIndexerService {
  private readonly client: QdrantClient;
  private readonly embeddings: OpenAIEmbeddings;
  private readonly collectionName: string;
  private readonly vectorSize = 1536;

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

  async index(chunks: DocumentChunk[]): Promise<IndexResult> {
    const startTime = Date.now();

    // Ensure collection exists
    await this.ensureCollection();

    // Generate embeddings for all chunks
    const contents = chunks.map((c) => c.content);
    const vectors = await this.embeddings.embedDocuments(contents);

    // Upsert points into Qdrant
    const points = chunks.map((chunk, i) => ({
      id: uuidv4(),
      vector: vectors[i],
      payload: {
        content: chunk.content,
        ...chunk.metadata,
      },
    }));

    await this.client.upsert(this.collectionName, { points });

    const latencyMs = Date.now() - startTime;

    this.logger.info('Indexation completed', {
      chunks_count: chunks.length,
      embeddings_stored: points.length,
      collection: this.collectionName,
      latency_ms: latencyMs,
    });

    return {
      documents_fetched: chunks.length,
      chunks_generated: chunks.length,
      embeddings_stored: points.length,
      collection: this.collectionName,
      latency_ms: latencyMs,
    };
  }

  private async ensureCollection(): Promise<void> {
    try {
      await this.client.getCollection(this.collectionName);
    } catch {
      // Collection doesn't exist, create it
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
      });
      this.logger.info('Created Qdrant collection', { collection: this.collectionName });
    }
  }
}
