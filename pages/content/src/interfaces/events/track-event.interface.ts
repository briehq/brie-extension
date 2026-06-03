import type { AppEventType } from '@src/constants';

import type { ElementDescriptor } from './element-descriptor.interface';

export interface TrackedEvent {
  event: AppEventType;
  timestamp: number;
  url?: string | null;
  element?: ElementDescriptor | null;
  extra?: Record<string, unknown> | null;
}
