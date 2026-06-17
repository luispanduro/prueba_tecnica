import { create } from 'zustand';
import { AuthUser } from '../types/auth.types';

interface AuthStore {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpired: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  handleSessionExpired: () => void;
  clearSessionExpired: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpired: false,

  setAuth: (token: string, user: AuthUser) =>
    set({
      token,
      user,
      isAuthenticated: true,
      error: null,
      sessionExpired: false,
    }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error, isLoading: false }),

  logout: () =>
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null,
      sessionExpired: false,
    }),

  handleSessionExpired: () =>
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      sessionExpired: true,
    }),

  clearSessionExpired: () => set({ sessionExpired: false }),
}));
