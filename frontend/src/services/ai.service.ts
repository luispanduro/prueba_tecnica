import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { AiQueryRequest, AiQueryResponse } from '../types/ai.types';

const BASE_URL = import.meta.env.VITE_AI_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

const aiApi = axios.create({ baseURL: BASE_URL, timeout: 60000 }); // Longer timeout for AI

aiApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

aiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().handleSessionExpired();
    }
    return Promise.reject(error);
  },
);

export const aiService = {
  async query(data: AiQueryRequest): Promise<AiQueryResponse> {
    const response = await aiApi.post<AiQueryResponse>('/ai/query', data);
    return response.data;
  },
};
