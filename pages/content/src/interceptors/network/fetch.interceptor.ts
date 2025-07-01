import { safePostMessage } from '@extension/shared';

import { extractQueryParams } from '@src/utils';

interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
  body?: BodyInit | null;
}

interface ParsedResponse {
  recordType: string;
  source: string;
  method: string;
  url: string;
  queryParams: Record<string, string | string[]>;
  requestHeaders: HeadersInit;
  requestBody: BodyInit | null;
  responseHeaders: Record<string, string>;
  responseBody: string | object;
  requestStart: string;
  requestEnd: string;
  status: number;
}

// Fetch Interceptor
export const interceptFetch = (): void => {
  const originalFetch = window.fetch;

  window.fetch = async function (...args: [RequestInfo | URL, FetchOptions?]): Promise<Response> {
    const [url, options] = args;
    const startTime = new Date().toISOString();

    try {
      const method = options?.method || 'GET';
      const requestHeaders = options?.headers || {};
      const queryParams = extractQueryParams(url.toString());
      const requestBody = options?.body || null;

      // Initiate the fetch request
      const response = await originalFetch.apply(this, args);
      const endTime = new Date().toISOString();

      // Check if the response is large or a binary stream before cloning
      const contentType = response.headers.get('Content-Type');
      const isBinary =
        contentType?.includes('application/octet-stream') ||
        contentType?.includes('image') ||
        contentType?.includes('audio');
      const isLargeResponse =
        response.headers.get('Content-Length') && parseInt(response.headers.get('Content-Length')!, 10) > 1000000; // Arbitrary size limit (1MB)

      // Clone the response for body parsing (only for non-binary and small responses)
      const responseClone = response.clone();

      let responseBody: string | object;
      if (isBinary || isLargeResponse) {
        // Don't clone large or binary responses to save resources
        responseBody = 'BRIE: Binary or Large content - Unable to display';
      } else {
        try {
          // Handle content types for JSON, text, and other responses
          if (contentType?.includes('application/json')) {
            responseBody = await responseClone.json();
          } else if (contentType?.includes('text')) {
            responseBody = await responseClone.text();
          } else if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
            responseBody = await responseClone.text();
          } else {
            responseBody = 'BRIE: Unsupported content type';
          }
        } catch (error) {
          console.error('Failed to parse fetch response body:', error);
          responseBody = 'BRIE: Error parsing response body';
        }
      }

      // Post message to main thread (ensure compatibility)
      try {
        const serializedHeaders: Record<string, string> = {};
        responseClone?.headers?.forEach((value, key) => {
          serializedHeaders[key] = value;
        });

        if (typeof window !== 'undefined') {
          const timestamp = Date.now();
          const payload = {
            method,
            url: url.toString(),
            queryParams,
            requestHeaders,
            requestBody,
            responseHeaders: serializedHeaders,
            responseBody,
            requestStart: startTime,
            requestEnd: endTime,
            status: responseClone.status,
          };

          safePostMessage('ADD_RECORD', {
            recordType: 'network',
            source: 'client',
            timestamp,
            ...payload,
          });

          if (responseClone.status >= 400) {
            safePostMessage('ADD_RECORD', {
              timestamp,
              type: 'log',
              recordType: 'console',
              source: 'client',
              method: 'error',
              args: [`[Fetch] ${method} ${url} responded with status ${responseClone.status}`, payload],
              stackTrace: {
                parsed: 'interceptFetch',
                raw: '',
              },
              pageUrl: window.location.href,
            });
          }
        } else {
          console.warn('[Fetch] safePostMessage is not supported.');
        }
      } catch (error) {
        console.error('[Fetch] Error posting message:', error);
      }

      return response;
    } catch (error) {
      console.error('[Fetch] Error intercepting:', error);
      return originalFetch.apply(this, args);
    }
  };
};
