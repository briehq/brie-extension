import type { Slice } from './slice.interface.js';
import type { Space } from './space.interface.js';

export interface Workspace {
  externalId: string;
  id: string;
  key: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  name: string;
  slug: string | null;
  avatarId: string | null;
  description: string | null;
  metadata: string | null;
  organizationId: string;
  slices: Slice[];
  isFavorite: boolean;
  spaces: Space[];
}
