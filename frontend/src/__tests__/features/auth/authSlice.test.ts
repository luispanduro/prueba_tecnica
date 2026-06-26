import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setCredentials, clearCredentials } from '../../../features/auth/authSlice';

const mockUser = {
  id: '123',
  email: 'test@example.com',
  roles: ['ADMIN'],
  permissions: ['users:read'],
};

const makeStore = () => configureStore({ reducer: { auth: authReducer } });

describe('authSlice', () => {
  it('setCredentials updates user, accessToken and isAuthenticated', () => {
    const store = makeStore();
    store.dispatch(setCredentials({ user: mockUser, accessToken: 'tok123', refreshToken: 'ref123' }));
    const { auth } = store.getState();
    expect(auth.user).toEqual(mockUser);
    expect(auth.accessToken).toBe('tok123');
    expect(auth.isAuthenticated).toBe(true);
  });

  it('clearCredentials resets all fields to null/false', () => {
    const store = makeStore();
    store.dispatch(setCredentials({ user: mockUser, accessToken: 'tok123' }));
    store.dispatch(clearCredentials());
    const { auth } = store.getState();
    expect(auth.user).toBeNull();
    expect(auth.accessToken).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
  });
});
