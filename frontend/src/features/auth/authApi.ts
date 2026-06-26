import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, clearCredentials } from './authSlice';

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function decodeJwtPayload(token: string): {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
} {
  const base64 = token.split('.')[1];
  return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/'))) as {
    sub: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthTokens, LoginDto>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const payload = decodeJwtPayload(data.accessToken);
          dispatch(
            setCredentials({
              user: {
                id: payload.sub,
                email: payload.email,
                roles: payload.roles ?? [],
                permissions: payload.permissions ?? [],
              },
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            }),
          );
        } catch {}
      },
    }),

    register: builder.mutation<void, RegisterDto>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clearCredentials());
        } catch {}
      },
    }),

    refreshToken: builder.mutation<AuthTokens, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh', method: 'POST', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
} = authApi;
