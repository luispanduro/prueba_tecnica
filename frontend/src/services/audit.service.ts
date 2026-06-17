import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { AuditEvent } from '../types/audit.types';

const BASE_URL = import.meta.env.VITE_AUDIT_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004';

const auditApi = axios.create({ baseURL: BASE_URL, timeout: 15000 });

auditApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

auditApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().handleSessionExpired();
    }
    return Promise.reject(error);
  },
);

export const auditService = {
  async getEvents(): Promise<AuditEvent[]> {
    const response = await auditApi.get<AuditEvent[]>('/audit/events');
    return response.data;
  },
};
