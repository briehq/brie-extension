import { safePostMessage } from '@extension/shared';

import { extractQueryParams } from '@src/utils';

interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
  body?: BodyInit | null;
}

// Fetch Interceptor
const interceptFetch = (): void => {
  const originalFetch = window.fetch;

  window.fetch = async function (...args: [RequestInfo | URL, FetchOptions?]): Promise<Response> {
    const [url, options] = args;
    const startTime = new Date().toISOString();
    const startTimestamp = performance.now();

    try {
      const method = options?.method || 'GET';
      const requestHeaders = options?.headers || {};
      const queryParams = extractQueryParams(url.toString());
      const requestBody = options?.body || null;

      // Calculate request size
      const requestSize = calculateRequestSize(requestBody, requestHeaders);

      // Initiate the fetch request
      const response = await originalFetch.apply(this, args);
      const endTime = new Date().toISOString();
      const endTimestamp = performance.now();
      const duration = endTimestamp - startTimestamp;

      // Check if the response is large or a binary stream before cloning
      const contentType = response.headers.get('Content-Type');
      const isBinary =
        contentType?.includes('application/octet-stream') ||
        contentType?.includes('image') ||
        contentType?.includes('audio');
      const isLargeResponse =
        response.headers.get('Content-Length') && parseInt(response.headers.get('Content-Length')!, 10) > 1000000; // Arbitrary size limit (1MB)

      // Calculate response size
      const responseSize = calculateResponseSize(response);

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
            // Enhanced waterfall data
            duration,
            requestSize,
            responseSize,
            timing: {
              requestStart: startTimestamp,
              requestEnd: endTimestamp,
              duration,
            },
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

// Helper function to calculate request size
const calculateRequestSize = (body: BodyInit | null, headers: HeadersInit): number => {
  let size = 0;

  if (body) {
    if (typeof body === 'string') {
      size = new Blob([body]).size;
    } else if (body instanceof FormData) {
      // Approximate size for FormData (not exact due to boundaries)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries = Array.from((body as any).entries()) as [string, string | File][];
        size = entries.reduce((total: number, [key, value]) => {
          const keySize = new Blob([key]).size;
          const valueSize = typeof value === 'string' ? new Blob([value]).size : (value as File)?.size || 0;
          return total + keySize + valueSize;
        }, 0);
      } catch {
        // Fallback if FormData.entries() is not available
        size = 0;
      }
    } else if (body instanceof Blob) {
      size = body.size;
    } else if (body instanceof ArrayBuffer) {
      size = body.byteLength;
    } else if (body instanceof URLSearchParams) {
      size = new Blob([body.toString()]).size;
    }
  }

  // Add approximate header size
  if (headers) {
    try {
      const headersObj =
        headers instanceof Headers
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.fromEntries((headers as any).entries())
          : (headers as Record<string, string>);
      size += Object.entries(headersObj).reduce((total, [key, value]) => {
        return total + new Blob([`${key}: ${value}\r\n`]).size;
      }, 0);
    } catch {
      // Fallback if headers processing fails
      console.warn('Failed to calculate header size');
    }
  }

  return size;
};

// Helper function to calculate response size
const calculateResponseSize = (response: Response): number => {
  const contentLength = response.headers.get('Content-Length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }

  // If no Content-Length header, we can't determine size without consuming the response
  // Return 0 and let the waterfall view handle unknown sizes
  return 0;
};

export { interceptFetch };
