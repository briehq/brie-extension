import type { Organization } from './organization.interface';
import type { Space } from './space.interface';
import type { User } from './user.interface';
import type { Workspace } from './workspace.interface';
import type { SlicePriority, SliceStatus, SliceType } from '../constants';

export interface Slice {
  assignee: User | null;
  assigneeId: string | null;
  reporter: User;
  reporterId: string;
  id: string;
  externalId: string;
  internalId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  dueAt: Date | null;
  summary: string;
  description: string | null;
  slug: string | null;
  organization: Organization;
  organizationId: string;
  workspace: Workspace;
  workspaceId: string;
  isFlagged: boolean;
  labels: unknown[];
  epicId: string | null;
  type: SliceType;
  status: SliceStatus;
  priority: SlicePriority | null;
  spaceId: string;
  space: Space;
  notes?: string;
  attachments: {
    name: string;
    size: number;
    type: string;
    externalId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    preview?: string;
    base64?: string;
  }[];
}
