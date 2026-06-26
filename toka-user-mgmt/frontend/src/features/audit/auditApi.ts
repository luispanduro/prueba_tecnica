import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface AuditLog {
  id: string;
  userId: string;
  eventType: string;
  service: string;
  status: 'success' | 'failure';
  metadata: Record<string, unknown>;
  timestamp: string;
}

interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  eventType?: string;
  service?: string;
  status?: string;
}

interface AuditStats {
  totalEvents: number;
  successRate: number;
  topEventTypes: { eventType: string; count: number }[];
  topServices: { service: string; count: number }[];
}

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as { auth: { accessToken: string | null } }).auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getAuditLogs: builder.query<PaginatedAuditLogs, GetAuditLogsParams>({
      query: ({ page = 1, limit = 20, ...filters } = {}) => ({
        url: '/audit/logs',
        params: { page, limit, ...filters },
      }),
    }),

    getAuditLog: builder.query<AuditLog, string>({
      query: (id) => `/audit/logs/${id}`,
    }),

    getAuditStats: builder.query<AuditStats, void>({
      query: () => '/audit/logs/stats',
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetAuditLogQuery,
  useGetAuditStatsQuery,
} = auditApi;
