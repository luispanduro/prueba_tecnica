import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { User, CreateUserRequest, UpdateUserRequest } from '../types/user.types';

const BASE_URL = import.meta.env.VITE_USER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

const userApi = axios.create({ baseURL: BASE_URL, timeout: 15000 });

userApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().handleSessionExpired();
    }
    return Promise.reject(error);
  },
);

export const usersService = {
  async getAll(): Promise<User[]> {
    const response = await userApi.get<User[]>('/users');
    return response.data;
  },

  async getById(id: string): Promise<User> {
    const response = await userApi.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserRequest): Promise<User> {
    const response = await userApi.post<User>('/users', data);
    return response.data;
  },

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await userApi.put<User>(`/users/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await userApi.delete(`/users/${id}`);
  },
};
