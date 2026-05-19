export type IntegrationProvider = 'LINEAR' | 'JIRA' | 'GITHUB' | 'AZURE_DEVOPS';

export interface IntegrationConnection {
  id: string;
  provider: IntegrationProvider;
  name: string | null;
  defaultTeamId?: string | null;
  defaultProjectId?: string | null;
  settings?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LinkedRepository {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  workspaceId: string;
  provider: IntegrationProvider;
  externalRepositoryId: string;
  owner: string;
  name: string;
  defaultBranch: string | null;
  isActive: boolean;
  integrationId: string;
}

export interface CreateExternalIssuePayload {
  sliceId: string;
  title: string;
  description?: string;
  brieFields?: Record<string, unknown>;
  projectId?: string;
  issueTypeId?: string;
  workspaceId: string;
}

export interface ExternalIssueResponse {
  id: string;
  provider: IntegrationProvider;
  externalId: string;
  key: string;
  url: string;
  status: string | null;
  title: string | null;
  createdAt: string;
}

export interface GithubIssueResponse {
  id: string;
  key: string;
  url: string;
  title: string;
  status: string;
}

export type CreateActionKey = 'link' | 'linear' | 'jira' | 'github';

export type CreateAction =
  | { key: 'link'; nameKey: 'createLink'; icon: 'LinkIcon' }
  | { key: 'linear'; nameKey: 'createLinear'; icon: 'LinearIcon'; integrationId: string; workspaceId: string }
  | { key: 'jira'; nameKey: 'createJira'; icon: 'JiraIcon'; integrationId: string; workspaceId: string }
  | { key: 'github'; nameKey: 'createGithub'; icon: 'GithubIcon'; repositoryId: string; workspaceId: string };
