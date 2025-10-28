import type { WebRequest } from 'webextension-polyfill';

import { safeStructuredClone } from '@extension/shared';

import { addOrMergeRecords } from '@src/utils';

export const handleOnBeforeRequest = (request: WebRequest.OnBeforeRequestDetailsType) => {
  addOrMergeRecords(request.tabId, {
    recordType: 'network',
    source: 'background',
    ...safeStructuredClone(request),
  });
};

export const handleOnBeforeSendHeaders = (request: WebRequest.OnBeforeSendHeadersDetailsType) => {
  addOrMergeRecords(request.tabId, {
    recordType: 'network',
    source: 'background',
    ...safeStructuredClone(request),
  });
};

export const handleOnCompleted = (request: WebRequest.OnCompletedDetailsType) => {
  const clonedrequest = safeStructuredClone(request);

  addOrMergeRecords(clonedrequest.tabId, {
    recordType: 'network',
    source: 'background',
    ...clonedrequest,
  });

  if (clonedrequest.statusCode >= 400) {
    addOrMergeRecords(clonedrequest.tabId, {
      timestamp: Date.now(),
      type: 'log',
      recordType: 'console',
      source: 'background',
      method: 'error',
      args: [
        `[${clonedrequest.type}] ${clonedrequest.method} ${clonedrequest.url} responded with status ${clonedrequest.statusCode}`,
        clonedrequest,
      ],
      stackTrace: {
        parsed: 'interceptFetch',
        raw: '',
      },
      url: clonedrequest.url,
    });
  }
};
