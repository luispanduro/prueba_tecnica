import { create } from 'zustand';
import { User, CreateUserRequest, UpdateUserRequest } from '../types/user.types';
import { usersService } from '../services/users.service';

interface UsersStore {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (data: CreateUserRequest) => Promise<void>;
  updateUser: (id: string, data: UpdateUserRequest) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await usersService.getAll();
      set({ users, isLoading: false });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      set({ error: msg, isLoading: false });
    }
  },

  createUser: async (data: CreateUserRequest) => {
    set({ isLoading: true, error: null });
    try {
      await usersService.create(data);
      await get().fetchUsers();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateUser: async (id: string, data: UpdateUserRequest) => {
    set({ isLoading: true, error: null });
    try {
      await usersService.update(id, data);
      await get().fetchUsers();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteUser: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await usersService.remove(id);
      await get().fetchUsers();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  clearError: () => set({ error: null }),
}));

function getErrorMessage(err: unknown): string {
  const axErr = err as { response?: { status?: number; data?: { message?: string } } };
  const status = axErr.response?.status;
  const msg = axErr.response?.data?.message;
  if (status === 409) return msg || 'Resource already exists';
  if (status === 404) return msg || 'Resource not found';
  if (status === 403) return 'Insufficient permissions';
  if (status === 503) return 'Service unavailable. Please try again later.';
  return msg || 'An unexpected error occurred';
}
