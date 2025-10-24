import type { AppEventType } from '@src/constants';

import type { ElementDescriptor } from './element-descriptor.interface';

export interface TrackedEvent {
  event: AppEventType;
  timestamp: number;
  url?: string;
  element?: ElementDescriptor;
  extra?: Record<string, unknown>;
}
