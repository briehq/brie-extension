import { v4 as uuidv4 } from 'uuid';
import { tabs } from 'webextension-polyfill';

import { deepRedactSensitiveInfo } from '@extension/shared';

import type { Record } from '@src/types';

import { decodeRequestBody } from './decode-request-body.util';

const RESTRICTED = [
  'https://api.briehq.com',
  'https://sandbox-api.briehq.com',
  'http://localhost:3006',
  'fhfdkpfdkimboffigpggibbgggeimpfd', // brie's local uuid
  'kbmbnelnoppneadncmmkfikbcgmilbao',
];

const invalidRecord = (entity: string) => RESTRICTED.some(word => entity.includes(word));

const tabRecordsMap = new Map<number, Map<string, any>>();
const tabUrlToRequestId = new Map<number, Map<string, string>>();

const getOrCreateUrlMap = (tabId: number): Map<string, string> => {
  let urlMap = tabUrlToRequestId.get(tabId);

  if (!urlMap) {
    urlMap = new Map<string, string>();
    tabUrlToRequestId.set(tabId, urlMap);
  }

  return urlMap;
};

export const deleteRecords = async (tabId: number) => {
  if (!tabId && !tabRecordsMap.has(tabId)) return;

  tabRecordsMap.delete(tabId);
  tabUrlToRequestId.delete(tabId);
};

export const getRecords = async (tabId: number): Promise<Record[]> => {
  return tabId && tabRecordsMap.has(tabId) ? Array.from(tabRecordsMap.get(tabId)!.values()) : [];
};

export const addOrMergeRecords = async (tabId: number, record: Record): Promise<void> => {
  if (!tabId || tabId === -1) {
    console.log('[addOrMergeRecords] SKIPPED: Invalid TabId (null OR -1)');
    return;
  }

  if (invalidRecord(record?.url || record?.pageUrl || '')) {
    console.log('[addOrMergeRecords] SKIPPED: Invalid URL');
    return;
  }

  const [tab] = await tabs.query({ active: true, lastFocusedWindow: true });
  const tabUrl = tab?.url || record?.url;

  if (!tabRecordsMap.has(tabId)) {
    tabRecordsMap.set(tabId, new Map());
  }

  const recordsMap = tabRecordsMap.get(tabId)!;
  const uuid = uuidv4();

  try {
    if (record.recordType !== 'network') {
      recordsMap.set(uuid, { uuid, ...deepRedactSensitiveInfo(record, tabUrl) });
      return;
    }

    const { url, requestId, timeStamp, requestBody: rawRequestBody, type, domain, ...rest } = record;

    if (!url) {
      console.warn('[addOrMergeRecords] Missing URL for network record.');
      return;
    }

    const urlMap = getOrCreateUrlMap(tabId);
    let finalRequestId = requestId;

    if (type === 'xmlhttprequest' && requestId) {
      urlMap.set(url, requestId);
    }

    if (domain && ['fetch', 'xhr'].includes(domain) && !finalRequestId) {
      const urlMapValue = urlMap.get(url);

      if (urlMapValue) {
        finalRequestId = urlMapValue;
        urlMap.delete(url);
      }
    }

    const recordKey = finalRequestId ?? uuid;
    const decodedRequestBody = decodeRequestBody(rawRequestBody);
    const baseRecord: Record = {
      url,
      requestId: finalRequestId,
      type,
      domain,
      ...rest,
    };

    if (decodedRequestBody) {
      baseRecord.requestBody = {
        raw: rawRequestBody?.raw,
        decoded: decodedRequestBody.decoded,
        parsed: decodedRequestBody.parsed,
      };
    }
    const { requestBody: baseRequestBody, ...restForRedaction } = baseRecord;

    const redactedRest = deepRedactSensitiveInfo(restForRedaction, tabUrl);
    let safeRequestBody: any = undefined;

    if (baseRequestBody?.parsed || baseRequestBody?.decoded) {
      safeRequestBody = {
        ...(baseRequestBody?.raw ? { raw: baseRequestBody.raw } : {}),
        parsed: deepRedactSensitiveInfo(baseRequestBody.parsed ?? baseRequestBody.decoded, tabUrl),
      };
    }

    const redactedRecord = {
      ...redactedRest,
      ...(safeRequestBody ? { requestBody: safeRequestBody } : {}),
      ...(timeStamp ? { timestamp: timeStamp } : {}),
    };

    if (!recordsMap.has(recordKey)) {
      recordsMap.set(recordKey, { uuid, url, ...redactedRecord });
      return;
    }

    const recordData = recordsMap.get(recordKey);

    if (!recordData) {
      console.warn("[addOrMergeRecords] Record with this key doesn't exist");
      return;
    }

    for (const [key, value] of Object.entries(redactedRecord)) {
      if (!value) continue;

      if (key === 'requestBody') {
        const existing = recordData.requestBody || {};
        recordData.requestBody = { ...existing, ...value };
        continue;
      }

      if (!recordData[key]) {
        recordData[key] = value;
      }
    }
  } catch (e) {
    console.error('[addOrMergeRecords] Primary: Failed to process network record:', e);
  }
};
