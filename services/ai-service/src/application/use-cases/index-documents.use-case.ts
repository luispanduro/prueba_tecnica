import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { Document } from '@langchain/core/documents';
import { TokenTextSplitter } from '@langchain/textsplitters';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class IndexDocumentsUseCase {
  private readonly logger = new Logger(IndexDocumentsUseCase.name);

  constructor(private readonly config: ConfigService) {}

  async execute(force = false): Promise<void> {
    const qdrantUrl = this.config.get<string>('QDRANT_URL')!;
    const collectionName = this.config.get<string>('QDRANT_COLLECTION')!;
    const client = new QdrantClient({ url: qdrantUrl });

    if (!force) {
      try {
        const info = await client.getCollection(collectionName);
        const vectorCount = (info.indexed_vectors_count as number | undefined) ?? 0;
        if (vectorCount > 0) {
          this.logger.log({
            action: 'indexing.skipped',
            reason: 'collection_has_vectors',
            vectorsCount: vectorCount,
          });
          return;
        }
      } catch {
        // collection does not exist yet — proceed with indexing
      }
    } else {
      try {
        await client.deleteCollection(collectionName);
      } catch {
        // collection didn't exist, nothing to delete
      }
    }

    const docsDir = path.join(__dirname, '../../docs');
    const entries = await fs.readdir(docsDir);
    const mdFiles = entries.filter((f) => f.endsWith('.md'));

    const splitter = new TokenTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const allChunks: Document[] = [];

    for (const filename of mdFiles) {
      const content = await fs.readFile(path.join(docsDir, filename), 'utf-8');
      const doc = new Document({ pageContent: content, metadata: { source: filename } });
      const chunks = await splitter.splitDocuments([doc]);
      chunks.forEach((chunk: Document, i: number) => {
        chunk.metadata = {
          content: chunk.pageContent,
          source: filename,
          chunkIndex: i,
        };
      });
      allChunks.push(...chunks);
    }

    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: this.config.get<string>('OPENAI_API_KEY')!,
    });

    await QdrantVectorStore.fromDocuments(allChunks, embeddings, {
      url: qdrantUrl,
      collectionName,
    });

    this.logger.log({
      action: 'indexing.completed',
      chunksIndexed: allChunks.length,
      documentsProcessed: mdFiles.length,
    });
  }
}
