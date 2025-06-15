import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { API_BASE_URL } from '@extension/env';
import type { Workspace } from '@extension/shared';

export const workspacesPublicAPI = createApi({
  reducerPath: 'workspaces-public',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: build => ({
    getWorkspacePublicById: build.query<Workspace, { id: string }>({
      query: ({ id }) => ({
        url: `/workspaces/public/${id}`,
      }),
    }),
  }),
});
