import { safePostMessage } from '@extension/shared';

import { AppEventType } from '@src/constants';
import type { TrackedEvent } from '@src/interfaces/events';

import { buildDescriptor } from './build-descriptor.util';
import { pickDefined } from './pick-defined.util';

/**
 * Emits a structured tracking event.
 * @param event - Event name.
 * @param el - Related element (optional).
 * @param extra - Additional fields to include (optional).
 * @returns void
 */
export const sendEvent = (event: AppEventType, el?: Element | null, extra?: Record<string, unknown>) => {
  const baseTimestamp = Date.now();
  const timestamp = event === AppEventType.Navigate ? baseTimestamp + 1000 : baseTimestamp;

  const payload: TrackedEvent = pickDefined({
    event,
    timestamp,
    url: location.href,
    element: buildDescriptor(el ?? null),
    extra: extra && Object.keys(extra).length ? extra : null,
  });

  safePostMessage('ADD_RECORD', {
    type: 'event',
    recordType: 'events',
    source: 'client',
    ...payload,
  });
};
