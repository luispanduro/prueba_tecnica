import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';

export async function createVectorStore(config: ConfigService): Promise<QdrantVectorStore> {
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    openAIApiKey: config.get<string>('OPENAI_API_KEY'),
  });
  return QdrantVectorStore.fromExistingCollection(embeddings, {
    url: config.get<string>('QDRANT_URL'),
    collectionName: config.get<string>('QDRANT_COLLECTION'),
  });
}
