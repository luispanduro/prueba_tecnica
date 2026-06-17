import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/auth.store';

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null, user: null, isAuthenticated: false,
      isLoading: false, error: null, sessionExpired: false,
    });
  });

  it('should have initial state unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('should set auth on login', () => {
    useAuthStore.getState().setAuth('token-1', { id: 'u1', username: 'admin', roles: ['admin'] });
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('token-1');
    expect(state.user?.username).toBe('admin');
  });

  it('should clear state on logout', () => {
    useAuthStore.getState().setAuth('tok', { id: 'u1', username: 'x', roles: [] });
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });

  it('should handle session expired', () => {
    useAuthStore.getState().setAuth('tok', { id: 'u1', username: 'x', roles: [] });
    useAuthStore.getState().handleSessionExpired();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.sessionExpired).toBe(true);
  });

  it('should set loading', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it('should set error', () => {
    useAuthStore.getState().setError('Bad request');
    expect(useAuthStore.getState().error).toBe('Bad request');
  });

  it('should clear session expired', () => {
    useAuthStore.getState().handleSessionExpired();
    useAuthStore.getState().clearSessionExpired();
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });
});
