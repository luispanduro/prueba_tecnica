export interface AiQueryRequest {
  query: string;
}

export interface AiQueryMetadata {
  context_count: number;
  model: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number | null;
}

export interface AiQueryResponse {
  answer: string;
  metadata: AiQueryMetadata;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: AiQueryMetadata;
  timestamp: string;
}
