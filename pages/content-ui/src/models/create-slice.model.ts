import type { LabelItem, SlicePriority } from '@extension/shared';

export type HandleOnCreateArgs = {
  labels?: LabelItem[];
  priority: SlicePriority;
  attachments?: File[] | readonly File[];
  description?: string;
  spaceId?: string;
};
