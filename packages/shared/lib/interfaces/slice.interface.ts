import type { Organization } from './organization.interface.js';
import type { Space } from './space.interface.js';
import type { User } from './user.interface.js';
import type { Workspace } from './workspace.interface.js';
import type { SlicePriority } from '../constants/enums/slices/slice-priority.enum.js';
import type { SliceState } from '../constants/enums/slices/slice-state.enum.js';
import type { SliceStatus } from '../constants/enums/slices/slice-status.enum.js';
import type { SliceType } from '../constants/enums/slices/slice-type.enum.js';

interface Option {
  name: string;
  id?: string;
  order?: number;
}

export interface LabelItem {
  id: string;
  text: string;
}

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
  labels: LabelItem[];
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

export interface UpdateSliceState {
  id: string;
  state: SliceState;
}

export interface InitSliceRequest {
  summary?: string;
  workspaceId?: string;
  labels?: any;
  spaceId?: string;
  screenshots: Option[];
  attachments: Option[];
  includeRecords: boolean;
  includeAnnotations?: boolean;
}

export interface AssetOption {
  id: string;
  uploaded: boolean;
}

export interface InitSliceResponse {
  id: string;
  externalId: string;
  status: string;
  assets: {
    screenshots: AssetOption[];
    attachments?: AssetOption[];
    records: AssetOption;
    annotations?: AssetOption;
  };
}

export type AssetUploadResponse = AssetOption;
