import axios, { type InternalAxiosRequestConfig } from 'axios';
import { store } from '../../app/store';
import { setCredentials, clearCredentials } from '../../features/auth/authSlice';

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const axiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as { response?: { status: number }; config: RetryableConfig };
    const originalRequest = axiosError.config;

    if (axiosError.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = store.getState().auth.refreshToken;
        const { data } = await axios.post<{ accessToken: string }>(
          '/api/auth/refresh',
          { refreshToken },
        );
        const currentUser = store.getState().auth.user;
        if (currentUser) {
          store.dispatch(setCredentials({ user: currentUser, accessToken: data.accessToken }));
        }
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return axiosInstance(originalRequest);
      } catch {
        store.dispatch(clearCredentials());
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
