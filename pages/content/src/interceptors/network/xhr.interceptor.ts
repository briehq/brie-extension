import { safePostMessage } from '@extension/shared';

// Define interfaces for request details and payload
interface RequestDetails {
  method: string;
  url: string;
  requestStart: string;
  requestBody: Document | XMLHttpRequestBodyInit | null;
  requestStartTimestamp: number;
}

// Extend the XMLHttpRequest type to include custom properties
interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _requestDetails?: RequestDetails;
}

// XMLHttpRequest Interceptor
const interceptXHR = (): void => {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  // Intercept XMLHttpRequest open method
  XMLHttpRequest.prototype.open = function (
    this: ExtendedXMLHttpRequest,
    method: string,
    url: string | URL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rest: any[]
  ): void {
    this._requestDetails = {
      method,
      url: url.toString(),
      requestStart: new Date().toISOString(),
      requestBody: null,
      requestStartTimestamp: performance.now(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (originalOpen as any).apply(this, [method, url, ...rest]);
  };

  // Intercept XMLHttpRequest send method
  XMLHttpRequest.prototype.send = function (
    this: ExtendedXMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ): void {
    if (this._requestDetails) {
      this._requestDetails.requestBody = body || null;
    }

    const originalOnReadyStateChange = this.onreadystatechange;

    this.onreadystatechange = function (this: ExtendedXMLHttpRequest, event: Event): void {
      if (this.readyState === 4 && this._requestDetails) {
        // Request completed
        const endTime = new Date().toISOString();
        const endTimestamp = performance.now();
        const duration = endTimestamp - this._requestDetails.requestStartTimestamp;

        const rawHeaders = this.getAllResponseHeaders();
        const responseHeaders = rawHeaders
          .split('\r\n')
          .filter(line => line.includes(':'))
          .map(line => line.split(':').map(str => str.trim()));

        const { requestBody } = this._requestDetails;

        // Calculate request size
        const requestSize = calculateXHRRequestSize(requestBody);

        // Calculate response size
        const responseSize = calculateXHRResponseSize(this);

        // Check for large or binary content (skip cloning and parsing for binary data)
        const contentType = this.getResponseHeader('Content-Type');
        const isBinary =
          contentType?.includes('application/octet-stream') ||
          contentType?.includes('image') ||
          contentType?.includes('audio');
        const isLargeResponse =
          this.getResponseHeader('Content-Length') && parseInt(this.getResponseHeader('Content-Length')!, 10) > 1000000; // Arbitrary 1MB size limit

        let responseBody: string;
        if (isBinary || isLargeResponse) {
          // Don't clone large or binary responses
          responseBody = 'BRIE: Binary or Large content - Unable to display';
        } else {
          // Parse the response as JSON or text for non-binary/small responses
          try {
            responseBody = this.responseText || 'BRIE: No response body';
          } catch (error) {
            console.error('[XHR] Failed to parse response body:', error);
            responseBody = 'BRIE: Error parsing response body';
          }
        }

        // Ensure message posting is supported
        try {
          if (typeof window !== 'undefined') {
            const timestamp = Date.now();
            const payload = {
              ...this._requestDetails,
              requestBody,
              requestEnd: endTime,
              status: this.status,
              responseHeaders,
              responseBody,
              // Enhanced waterfall data
              duration,
              requestSize,
              responseSize,
              timing: {
                requestStart: this._requestDetails.requestStartTimestamp,
                requestEnd: endTimestamp,
                duration,
              },
            };

            safePostMessage('ADD_RECORD', {
              timestamp,
              recordType: 'network',
              source: 'client',
              ...payload,
            });

            if (this.status >= 400) {
              safePostMessage('ADD_RECORD', {
                type: 'log',
                recordType: 'console',
                source: 'client',
                method: 'error',
                timestamp: Date.now(),
                args: [
                  `[XHR] ${this._requestDetails.method} ${this._requestDetails.url} responded with status ${this.status}`,
                  payload,
                ],
                stackTrace: {
                  parsed: 'interceptXHR',
                  raw: '',
                },
                pageUrl: window.location.href,
              });
            }
          } else {
            console.warn('[XHR] safePostMessage is not supported.');
          }
        } catch (error) {
          console.error('[XHR] Error posting message:', error);
        }
      }

      // Call the original onreadystatechange handler if defined
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.call(this, event);
      }
    };

    originalSend.apply(this, [body]);
  };
};

// Helper function to calculate XHR request size
const calculateXHRRequestSize = (body: Document | XMLHttpRequestBodyInit | null): number => {
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
    } else if (body instanceof Document) {
      // For XML documents, serialize to get approximate size
      size = new Blob([new XMLSerializer().serializeToString(body)]).size;
    }
  }

  return size;
};

// Helper function to calculate XHR response size
const calculateXHRResponseSize = (xhr: XMLHttpRequest): number => {
  const contentLength = xhr.getResponseHeader('Content-Length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }

  // If no Content-Length header, try to estimate from response text
  if (xhr.responseText) {
    return new Blob([xhr.responseText]).size;
  }

  // Return 0 for unknown sizes
  return 0;
};

export { interceptXHR };
