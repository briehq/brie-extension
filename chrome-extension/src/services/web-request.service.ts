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
  const clonedRequest = safeStructuredClone(request);

  addOrMergeRecords(clonedRequest.tabId, {
    recordType: 'network',
    source: 'background',
    ...clonedRequest,
  });

  if (clonedRequest.statusCode >= 400) {
    addOrMergeRecords(clonedRequest.tabId, {
      timestamp: Date.now(),
      type: 'log',
      recordType: 'console',
      source: 'background',
      method: 'error',
      args: [
        `[${clonedRequest.type}] ${clonedRequest.method} ${clonedRequest.url} responded with status ${clonedRequest.statusCode}`,
        clonedRequest,
      ],
      stackTrace: {
        parsed: 'interceptFetch',
        raw: '',
      },
      url: clonedRequest.url,
    });
  }
};
