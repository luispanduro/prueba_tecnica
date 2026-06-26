import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '../features/auth/authSlice';
import { usersApi } from '../features/users/usersApi';
import { rolesApi } from '../features/roles/rolesApi';
import { auditApi } from '../features/audit/auditApi';
import { aiApi } from '../features/ai/aiApi';
import { authApi } from '../features/auth/authApi';

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'accessToken', 'isAuthenticated'],
};

export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer) as unknown as typeof authReducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [rolesApi.reducerPath]: rolesApi.reducer,
    [auditApi.reducerPath]: auditApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      usersApi.middleware,
      rolesApi.middleware,
      auditApi.middleware,
      aiApi.middleware,
      authApi.middleware,
    ),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
