import type { WebNavigation } from 'webextension-polyfill';

import { deleteRecords } from '@src/utils';

const TARGET_TYPES = ['reload', 'typed'] as WebNavigation.TransitionType[];

export const handleOnCommitted = async (details: WebNavigation.OnCommittedDetailsType) => {
  const { tabId, frameId, transitionType } = details;

  if (frameId !== 0) return;
  if (!TARGET_TYPES.includes(transitionType)) return;

  try {
    await deleteRecords(tabId);
  } catch (err) {
    console.error('[webNavigation] deleteRecords error', err, details);
  }
};
