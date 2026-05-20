import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  CreateExternalIssuePayload,
  ExternalIssueResponse,
  GithubIssueResponse,
  IntegrationConnection,
  LinkedRepository,
} from './integrations.types.js';
import { TAG_TYPE } from '../../constants/tag-type.const.js';
import { baseQueryWithReauth } from '../../services/index.js';

export const integrationsAPI = createApi({
  reducerPath: 'integrations',
  baseQuery: baseQueryWithReauth,
  tagTypes: [TAG_TYPE.WORKSPACE_INTEGRATIONS, TAG_TYPE.LINKED_REPOS],
  endpoints: build => ({
    getIntegrationsByWorkspaceId: build.query<IntegrationConnection[], { workspaceId: string }>({
      providesTags: [TAG_TYPE.WORKSPACE_INTEGRATIONS],
      query: ({ workspaceId }) => ({ url: `/workspaces/${workspaceId}/integrations` }),
    }),

    getLinkedGithubRepos: build.query<LinkedRepository[], { workspaceId: string }>({
      providesTags: [TAG_TYPE.LINKED_REPOS],
      query: ({ workspaceId }) => ({
        url: `/integrations/${workspaceId}/github/repositories/linked`,
      }),
    }),

    createExternalIssue: build.mutation<
      ExternalIssueResponse,
      { integrationId: string; body: CreateExternalIssuePayload }
    >({
      query: ({ integrationId, body }) => ({
        url: '/slices/external',
        method: 'POST',
        body: { ...body, integrationId },
      }),
    }),

    createGithubIssue: build.mutation<
      GithubIssueResponse,
      { workspaceId: string; sliceId: string; repositoryId: string }
    >({
      query: ({ workspaceId, sliceId, repositoryId }) => ({
        url: `/integrations/${workspaceId}/github/issues`,
        method: 'POST',
        body: { sliceId, repositoryId },
      }),
    }),
  }),
});

export const {
  useGetIntegrationsByWorkspaceIdQuery,
  useGetLinkedGithubReposQuery,
  useCreateExternalIssueMutation,
  useCreateGithubIssueMutation,
} = integrationsAPI;
