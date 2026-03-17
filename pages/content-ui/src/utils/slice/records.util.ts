import { runtime } from 'webextension-polyfill';

import { RECORD } from '@extension/shared';

/**
 * Requests all recorded events from the background script.
 *
 * @returns Promise<any[]> - The list of records.
 */
export const getRecords = async (): Promise<any[]> => {
  try {
    const response: { records: any[] } = await runtime.sendMessage({ type: RECORD.GET_ALL });

    return response?.records ?? [];
  } catch (err: any) {
    console.error('[getRecords] Failed:', err?.message || err);
    throw err;
  }
};

/**
 * Instructs the background script to delete all records.
 *
 * @returns Promise<{ status: string }> - The deletion result.
 */
export const deleteRecords = async (): Promise<{ status: string }> => {
  try {
    const response: { status: string } = await runtime.sendMessage({ type: RECORD.DELETE_ALL });

    return response ?? { status: 'unknown' };
  } catch (err: any) {
    console.error('[deleteRecords] Failed:', err?.message || err);
    throw err;
  }
};
