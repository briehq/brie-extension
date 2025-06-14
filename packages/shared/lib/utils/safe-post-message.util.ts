import { safeStructuredClone } from './structured-clone.util';

/**
 * Safely sends a message using `window.postMessage`, ensuring no un-cloneable
 * objects (like DOM nodes) are included in the payload.
 *
 * @param type - A string identifier for the message (e.g. 'ADD_RECORD')
 * @param payload - The data to send. Should be plain and serializable.
 */
export const safePostMessage = (type: string, payload: Record<string, unknown>) => {
  try {
    const message = {
      type,
      payload: safeStructuredClone(payload),
    };

    window.postMessage(message, '*');
  } catch {
    /**
     * @todo
     * implement logs
     */
    // console.warn(`[Brie] Failed to safePostMessage for "${type}"`, e);
    // console.debug('[Brie] Payload that caused failure:', payload);
  }
};
