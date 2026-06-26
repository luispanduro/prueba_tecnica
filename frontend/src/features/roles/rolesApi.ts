import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateRoleDto {
  name: string;
  description?: string;
  permissions?: string[];
}

interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
}

export const rolesApi = createApi({
  reducerPath: 'rolesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as { auth: { accessToken: string | null } }).auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Role'],
  endpoints: (builder) => ({
    getRoles: builder.query<Role[], void>({
      query: () => '/roles',
      providesTags: ['Role'],
    }),

    getRole: builder.query<Role, string>({
      query: (id) => `/roles/${id}`,
      providesTags: ['Role'],
    }),

    createRole: builder.mutation<Role, CreateRoleDto>({
      query: (body) => ({ url: '/roles', method: 'POST', body }),
      invalidatesTags: ['Role'],
    }),

    updateRole: builder.mutation<Role, { id: string } & UpdateRoleDto>({
      query: ({ id, ...body }) => ({ url: `/roles/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Role'],
    }),

    deleteRole: builder.mutation<void, string>({
      query: (id) => ({ url: `/roles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Role'],
    }),

    addPermission: builder.mutation<Role, { roleId: string; permission: string }>({
      query: ({ roleId, permission }) => ({
        url: `/roles/${roleId}/permissions`,
        method: 'POST',
        body: { permission },
      }),
      invalidatesTags: ['Role'],
    }),

    removePermission: builder.mutation<void, { roleId: string; permission: string }>({
      query: ({ roleId, permission }) => ({
        url: `/roles/${roleId}/permissions/${permission}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Role'],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAddPermissionMutation,
  useRemovePermissionMutation,
} = rolesApi;
