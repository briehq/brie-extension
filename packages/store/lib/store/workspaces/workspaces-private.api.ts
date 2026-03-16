import { createApi } from '@reduxjs/toolkit/query/react';

import type { Pagination, Workspace } from '@extension/shared';

import { TAG_TYPE } from '../../constants/tag-type.const.js';
import { baseQueryWithReauth } from '../../services/index.js';

export const workspacesPrivateAPI = createApi({
  reducerPath: 'workspaces-private',
  tagTypes: [TAG_TYPE.WORKSPACES, TAG_TYPE.WORKSPACE],
  baseQuery: baseQueryWithReauth,
  endpoints: build => ({
    getWorkspaces: build.query<{ items: Workspace[]; total: number; hasItems: boolean }, Pagination>({
      providesTags: [TAG_TYPE.WORKSPACES],
      query: params => ({
        url: '/workspaces',
        params,
      }),
    }),

    createWorkspace: build.mutation<Workspace, Partial<Workspace>>({
      invalidatesTags: [TAG_TYPE.WORKSPACES],
      query: body => ({
        url: '/workspaces',
        method: 'POST',
        body,
      }),
    }),

    getWorkspaceById: build.query<Workspace, { id: string }>({
      providesTags: [TAG_TYPE.WORKSPACE],
      query: ({ id }) => ({
        url: `/workspaces/${id}`,
      }),
    }),
  }),
});
