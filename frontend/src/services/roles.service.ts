import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { Role, CreateRoleRequest, AssignRoleRequest, UnassignRoleRequest } from '../types/role.types';

const BASE_URL = import.meta.env.VITE_ROLE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003';

const roleApi = axios.create({ baseURL: BASE_URL, timeout: 15000 });

roleApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

roleApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().handleSessionExpired();
    }
    return Promise.reject(error);
  },
);

export const rolesService = {
  async getAll(): Promise<Role[]> {
    const response = await roleApi.get<Role[]>('/roles');
    return response.data;
  },

  async create(data: CreateRoleRequest): Promise<Role> {
    const response = await roleApi.post<Role>('/roles', data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await roleApi.delete(`/roles/${id}`);
  },

  async assign(data: AssignRoleRequest): Promise<void> {
    await roleApi.post('/roles/assign', data);
  },

  async unassign(data: UnassignRoleRequest): Promise<void> {
    await roleApi.post('/roles/unassign', data);
  },

  async getUserRoles(userId: string): Promise<{ roles: string[] }> {
    const response = await roleApi.get<{ roles: string[] }>(`/roles/user/${userId}`);
    return response.data;
  },
};
