import { createApi } from '@reduxjs/toolkit/query/react';

import type { Pagination, Workspace } from '@extension/shared';

import { baseQueryWithReauth } from '../../services/index.js';

export const workspacesPrivateAPI = createApi({
  reducerPath: 'workspaces-private',
  tagTypes: ['WORKSPACES', 'WORKSPACE'],
  baseQuery: baseQueryWithReauth,
  endpoints: build => ({
    getWorkspaces: build.query<{ items: Workspace[]; total: number; hasItems: boolean }, Pagination>({
      providesTags: ['WORKSPACES'],
      query: params => ({
        url: '/workspaces',
        params,
      }),
    }),

    createWorkspace: build.mutation<Workspace, Partial<Workspace>>({
      invalidatesTags: ['WORKSPACES'],
      query: body => ({
        url: '/workspaces',
        method: 'POST',
        body,
      }),
    }),

    getWorkspaceById: build.query<Workspace, { id: string }>({
      providesTags: ['WORKSPACE'],
      query: ({ id }) => ({
        url: `/workspaces/${id}`,
      }),
    }),
  }),
});
