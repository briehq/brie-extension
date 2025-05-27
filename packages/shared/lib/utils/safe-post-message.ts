import { safeStructuredClone } from './structured-cloned.util.js';

/**
 * Safely sends a message using `window.postMessage`, ensuring no un-cloneable
 * objects (like DOM nodes) are included in the payload.
 *
 * @param type - A string identifier for the message (e.g. 'ADD_RECORD')
 * @param payload - The data to send. Should be plain and serializable.
 */
export const safePostMessage = (type: string, payload: Record<string, any>) => {
  try {
    const message = {
      type,
      payload: safeStructuredClone(payload),
    };

    window.postMessage(message, '*');
  } catch (e) {
    console.warn(`[Brie] Failed to safePostMessage for "${type}"`, e);
    console.debug('[Brie] Payload that caused failure:', payload);
  }
};
