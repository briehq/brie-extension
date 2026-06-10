import type { WebRequest } from 'webextension-polyfill';

import type { Record } from '@src/types';
import { addOrMergeRecords } from '@src/utils';

export const handleOnBeforeRequest = (request: WebRequest.OnBeforeRequestDetailsType) => {
  addOrMergeRecords(request.tabId, {
    recordType: 'network',
    source: 'background',
    ...request,
  } as unknown as Record);
};

export const handleOnBeforeSendHeaders = (request: WebRequest.OnBeforeSendHeadersDetailsType) => {
  addOrMergeRecords(request.tabId, {
    recordType: 'network',
    source: 'background',
    ...request,
  } as unknown as Record);
};

export const handleOnCompleted = (request: WebRequest.OnCompletedDetailsType) => {
  addOrMergeRecords(request.tabId, {
    recordType: 'network',
    source: 'background',
    ...request,
  } as unknown as Record);

  if (request.statusCode >= 400) {
    addOrMergeRecords(request.tabId, {
      timestamp: Date.now(),
      type: 'log',
      recordType: 'console',
      source: 'background',
      method: 'error',
      args: [
        `[${request.type}] ${request.method} ${request.url} responded with status ${request.statusCode}`,
        { ...request },
      ],
      stackTrace: {
        parsed: 'interceptFetch',
        raw: '',
      },
      url: request.url,
    } as unknown as Record);
  }
};
