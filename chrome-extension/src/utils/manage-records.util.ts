import { v4 as uuidv4 } from 'uuid';

import { deepRedactSensitiveInfo } from '@extension/shared';

const restricted = ['https://api.briehq.com', 'https://sandbox-api.briehq.com']; // 'extend.iife',  'kbmbnelnoppneadncmmkfikbcgmilbao'  Note: it blocks the logs
const invalidRecord = (entity: string) => restricted.some(word => entity.includes(word));

const tabRecordsMap = new Map<number, Map<string, any>>();

export type RecordType = 'events' | 'network' | 'console' | 'cookies';

export interface Record {
  recordType: RecordType;
  url?: string;
  requestBody?: {
    raw: { bytes: ArrayBuffer }[];
  };
  [key: string]: any;
}

export const deleteRecords = async (tabId: number) => {
  if (!tabId && !tabRecordsMap.has(tabId)) return;

  tabRecordsMap.delete(tabId);
};

export const getRecords = async (tabId: number): Promise<Record[]> => {
  return tabId && tabRecordsMap.has(tabId) ? Array.from(tabRecordsMap.get(tabId)!.values()) : [];
};

export const addOrMergeRecords = async (tabId: number, record: Record | any): Promise<void> => {
  if (!tabId || tabId === -1) {
    console.log('[addOrMergeRecords] SKIPPED: Invalid TabId (null OR -1)');
    return;
  }

  if (invalidRecord(record?.url || '')) {
    console.log('[addOrMergeRecords] SKIPPED: Invalid URL');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
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

    const { url, ...rest } = record;

    if (!url) {
      console.warn('[addOrMergeRecords] Missing URL for network record.');
      return;
    }

    const redactedRest = deepRedactSensitiveInfo(rest, tabUrl);

    if (!recordsMap.has(url)) {
      recordsMap.set(url, { uuid, url, ...redactedRest });
    }

    const recordData = recordsMap.get(url);

    if (!recordData) {
      console.warn("[addOrMergeRecords] Record with this URL doesn't exist.");
    }

    for (const [key, value] of Object.entries(redactedRest)) {
      if (!recordData[key]) {
        recordData[key] = value;
      }

      if (key === 'requestBody' && recordData[key]?.raw) {
        const rawRequestBody = recordData[key].raw;

        if (!rawRequestBody.length) {
          recordData[key].parsed = null;
          continue;
        }

        const rawBytes = rawRequestBody[0].bytes;
        const byteArray = new Uint8Array(rawBytes);
        const decoder = new TextDecoder('utf-8');
        const decodedBody = decoder.decode(byteArray);

        try {
          recordData[key].parsed = typeof decodedBody !== 'string' && deepRedactSensitiveInfo(decodedBody, tabUrl);
        } catch (e) {
          console.error('[addOrMergeRecords] Failed to parse JSON:', e);
        }
      }
    }
  } catch (e) {
    console.error('[addOrMergeRecords] Primary: Failed to parse JSON:', e);
  }
};
