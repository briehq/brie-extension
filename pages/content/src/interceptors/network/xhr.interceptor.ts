import { safePostMessage } from '@extension/shared';

// Define interfaces for request details and payload
interface RequestDetails {
  method: string;
  url: string;
  requestStart: string;
  requestBody: Document | XMLHttpRequestBodyInit | null;
}

// Extend the XMLHttpRequest type to include custom properties
interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _requestDetails?: RequestDetails;
}

// XMLHttpRequest Interceptor
export const interceptXHR = (): void => {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  // Intercept XMLHttpRequest open method
  XMLHttpRequest.prototype.open = function (
    this: ExtendedXMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: any[]
  ): void {
    this._requestDetails = {
      method,
      url: url.toString(),
      requestStart: new Date().toISOString(),
      requestBody: null,
    };
    originalOpen.apply(this, [method, url, ...rest]);
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

    this.onreadystatechange = function (this: ExtendedXMLHttpRequest, ...args: any[]): void {
      if (this.readyState === 4 && this._requestDetails) {
        // Request completed
        const endTime = new Date().toISOString();
        const rawHeaders = this.getAllResponseHeaders();
        const responseHeaders = rawHeaders
          .split('\r\n')
          .filter(line => line.includes(':'))
          .map(line => line.split(':').map(str => str.trim()));

        const { requestBody } = this._requestDetails;

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
            safePostMessage('ADD_RECORD', {
              recordType: 'network',
              source: 'client',
              ...this._requestDetails,
              requestBody,
              requestEnd: endTime,
              status: this.status,
              responseHeaders,
              responseBody,
            });
          } else {
            console.warn('[XHR] safePostMessage is not supported.');
          }
        } catch (error) {
          console.error('[XHR] Error posting message:', error);
        }
      }

      // Call the original onreadystatechange handler if defined
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, args);
      }
    };

    originalSend.apply(this, [body]);
  };
};
