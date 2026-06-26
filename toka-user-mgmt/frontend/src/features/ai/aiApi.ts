import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface AIQueryDto {
  query: string;
  userId?: string;
  sessionId?: string;
}

export interface AIQueryResult {
  queryId: string;
  answer: string;
  chunksRetrieved: number;
  avgChunkScore: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
  qualityFlags: string[];
  sources?: { source: string; score: number }[];
}

export interface AIMetric {
  queryId: string;
  timestamp: string;
  latencyMs: number;
  llmLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  chunksRetrieved: number;
  avgChunkScore: number;
  estimatedCostUSD: number;
  qualityFlags: string[];
}

export const aiApi = createApi({
  reducerPath: 'aiApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as { auth: { accessToken: string | null } }).auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    queryAI: builder.mutation<AIQueryResult, AIQueryDto>({
      query: (body) => ({ url: '/ai/query', method: 'POST', body }),
    }),

    getAIMetrics: builder.query<AIMetric[], void>({
      query: () => '/ai/metrics',
    }),
  }),
});

export const { useQueryAIMutation, useGetAIMetricsQuery } = aiApi;
