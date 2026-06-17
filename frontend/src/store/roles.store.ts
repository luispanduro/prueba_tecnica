import { create } from 'zustand';
import { Role, CreateRoleRequest, AssignRoleRequest, UnassignRoleRequest } from '../types/role.types';
import { rolesService } from '../services/roles.service';

interface RolesStore {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  fetchRoles: () => Promise<void>;
  createRole: (data: CreateRoleRequest) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  assignRole: (data: AssignRoleRequest) => Promise<void>;
  unassignRole: (data: UnassignRoleRequest) => Promise<void>;
  clearError: () => void;
}

export const useRolesStore = create<RolesStore>((set, get) => ({
  roles: [],
  isLoading: false,
  error: null,

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const roles = await rolesService.getAll();
      set({ roles, isLoading: false });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      set({ error: msg, isLoading: false });
    }
  },

  createRole: async (data: CreateRoleRequest) => {
    set({ isLoading: true, error: null });
    try {
      await rolesService.create(data);
      await get().fetchRoles();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteRole: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await rolesService.remove(id);
      await get().fetchRoles();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  assignRole: async (data: AssignRoleRequest) => {
    set({ isLoading: true, error: null });
    try {
      await rolesService.assign(data);
      set({ isLoading: false });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  unassignRole: async (data: UnassignRoleRequest) => {
    set({ isLoading: true, error: null });
    try {
      await rolesService.unassign(data);
      set({ isLoading: false });
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
