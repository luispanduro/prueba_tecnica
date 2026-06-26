export interface QueryMetricData {
  queryId: string;
  timestamp: Date;
  latencyMs: number;
  embeddingLatencyMs: number;
  retrievalLatencyMs: number;
  llmLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  chunksRetrieved: number;
  avgChunkScore: number;
  qualityFlags: string[];
}

export interface IMetricRepository {
  save(metric: QueryMetricData): Promise<void>;
  findAll(limit: number): Promise<QueryMetricData[]>;
  findById(queryId: string): Promise<QueryMetricData | null>;
}

export const METRIC_REPOSITORY = 'METRIC_REPOSITORY';
