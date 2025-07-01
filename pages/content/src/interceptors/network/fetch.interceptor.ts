import { safePostMessage } from '@extension/shared';

import { extractQueryParams } from '@src/utils';

interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
  body?: BodyInit | null;
}

export const interceptFetch = (): void => {
  if ((window.fetch as any).__isIntercepted) return;

  const originalFetch = window.fetch;

  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: async function (...args: [RequestInfo | URL, FetchOptions?]): Promise<Response> {
      const [input, init] = args;
      const url = input instanceof Request ? input.url : input.toString();
      const method = input instanceof Request ? input.method : init?.method || 'GET';
      const requestHeaders: Record<string, string> = {};

      try {
        new Headers(input instanceof Request ? input.headers : init?.headers || {}).forEach(
          (v, k) => (requestHeaders[k] = v),
        );
      } catch (err) {
        console.error('[Fetch] Error during fetch:', err);
      }

      const requestBody = input instanceof Request ? input.body : init?.body;
      const requestStart = new Date().toISOString();

      let response: Response;
      try {
        response = await originalFetch.apply(this, args);
      } catch (err) {
        console.error('[Fetch] Error during fetch:', err);
        throw err;
      }

      try {
        const requestEnd = new Date().toISOString();
        const queryParams = extractQueryParams(url);

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((v, k) => (responseHeaders[k] = v));

        const contentType = response.headers.get('Content-Type') || '';
        const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
        const encoding = response.headers.get('Content-Encoding') || '';

        let responseBody: string | object = 'BRIE: Not captured';
        if (!response.bodyUsed && contentLength < 1_000_000 && !encoding && !contentType.includes('image')) {
          try {
            const clone = response.clone();
            if (contentType.includes('application/json')) {
              responseBody = await clone.json();
            } else if (contentType.includes('text') || contentType.includes('xml')) {
              responseBody = await clone.text();
            }
          } catch {
            responseBody = 'BRIE: Failed to parse response';
          }
        }

        const timestamp = Date.now();
        const payload = {
          method,
          url,
          queryParams,
          requestHeaders,
          requestBody,
          responseHeaders,
          responseBody,
          requestStart,
          requestEnd,
          status: response.status,
        };

        safePostMessage('ADD_RECORD', {
          recordType: 'network',
          source: 'client',
          timestamp,
          ...payload,
        });

        if (response.status >= 400) {
          safePostMessage('ADD_RECORD', {
            timestamp,
            type: 'log',
            recordType: 'console',
            source: 'client',
            method: 'error',
            args: [`[Fetch] ${method} ${url} responded with status ${response.status}`, payload],
            stackTrace: { parsed: 'interceptFetch', raw: '' },
            pageUrl: window.location.href,
          });
        }
      } catch (err) {
        console.warn('[Fetch] Failed to log fetch:', err);
      }

      return response;
    },
  });

  (window.fetch as any).__isIntercepted = true;
};
