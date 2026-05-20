import type { CreateAction, IntegrationConnection, LinkedRepository } from '@extension/store';

export const LINK_ACTION: CreateAction = {
  key: 'link',
  nameKey: 'createLink',
  icon: 'LinkIcon',
};

export const PROVIDER_LABEL: Record<Exclude<CreateAction['key'], 'link'>, string> = {
  linear: 'Linear',
  jira: 'Jira',
  github: 'GitHub',
};

export const buildCreateActions = ({
  integrations,
  linkedRepos,
  isGuest,
  workspaceId,
}: {
  integrations?: IntegrationConnection[];
  linkedRepos?: LinkedRepository[];
  isGuest: boolean;
  workspaceId: string;
}): CreateAction[] => {
  if (isGuest || !workspaceId) return [LINK_ACTION];

  const actions: CreateAction[] = [LINK_ACTION];

  const sorted = [...(integrations ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const seen = new Set<string>();
  for (const conn of sorted) {
    if (seen.has(conn.provider)) continue;

    if (conn.provider === 'LINEAR') {
      actions.push({
        key: 'linear',
        nameKey: 'createLinear',
        icon: 'LinearIcon',
        integrationId: conn.id,
        workspaceId,
      });
      seen.add(conn.provider);
    } else if (conn.provider === 'JIRA') {
      actions.push({
        key: 'jira',
        nameKey: 'createJira',
        icon: 'JiraIcon',
        integrationId: conn.id,
        workspaceId,
      });
      seen.add(conn.provider);
    }
  }

  const githubConnected = sorted.some(conn => conn.provider === 'GITHUB');
  const firstRepo = linkedRepos?.[0];
  if (githubConnected && firstRepo) {
    actions.push({
      key: 'github',
      nameKey: 'createGithub',
      icon: 'GithubIcon',
      repositoryId: firstRepo.id,
      workspaceId: firstRepo.workspaceId || workspaceId,
    });
  }

  return actions;
};
