import { RECORD, safePostMessage } from '@extension/shared';

import { redactHeaderValue, redactSensitiveBodyKeys } from './redact.util.js';

interface RequestDetails {
  method: string;
  url: string;
  requestStart: string;
  requestBody: Document | XMLHttpRequestBodyInit | null;
}

interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _requestDetails?: RequestDetails;
}

export const interceptXHR = (): void => {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

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
    originalOpen.apply(this, [method, url, ...rest] as Parameters<XMLHttpRequest['open']>);
  };

  XMLHttpRequest.prototype.send = function (
    this: ExtendedXMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ): void {
    if (this._requestDetails) {
      this._requestDetails.requestBody = body || null;
    }

    // Use addEventListener instead of replacing this.onreadystatechange — otherwise any handler
    // the page assigns to xhr.onreadystatechange AFTER calling .send() is silently dropped.
    const onReadyStateChange = function (this: ExtendedXMLHttpRequest): void {
      if (this.readyState === 4 && this._requestDetails) {
        const endTime = new Date().toISOString();
        const rawHeaders = this.getAllResponseHeaders();
        const responseHeaders = rawHeaders
          .split('\r\n')
          .filter(line => line.includes(':'))
          .map(line => {
            const [key, ...rest] = line.split(':').map(str => str.trim());
            const value = redactHeaderValue(key, rest.join(':'));
            return [key, value];
          });

        const requestBody = redactSensitiveBodyKeys(this._requestDetails.requestBody);

        const contentType = this.getResponseHeader('Content-Type');
        const isBinary =
          contentType?.includes('application/octet-stream') ||
          contentType?.includes('image') ||
          contentType?.includes('audio');
        const isLargeResponse =
          this.getResponseHeader('Content-Length') && parseInt(this.getResponseHeader('Content-Length')!, 10) > 1000000;

        let responseBody: string;
        if (isBinary || isLargeResponse) {
          responseBody = 'BRIE: Binary or Large content - Unable to display';
        } else {
          try {
            responseBody = this.responseText || 'BRIE: No response body';
          } catch (error) {
            console.error('[XHR] Failed to parse response body:', error);
            responseBody = 'BRIE: Error parsing response body';
          }
        }

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
              domain: 'xhr',
            };

            safePostMessage(RECORD.ADD, {
              timestamp,
              recordType: 'network',
              source: 'client',
              ...payload,
            });

            if (this.status >= 400) {
              safePostMessage(RECORD.ADD, {
                type: 'log',
                recordType: 'console',
                source: 'client',
                method: 'error',
                timestamp: Date.now(),
                domain: 'xhr',
                args: [
                  `[XHR] ${this._requestDetails.method} ${this._requestDetails.url} responded with status ${this.status}`,
                  payload,
                ],
                stackTrace: {
                  parsed: 'interceptXHR',
                  raw: '',
                },
                href: window.location.href,
                url: this._requestDetails.url,
              });
            }
          } else {
            console.warn('[XHR] safePostMessage is not supported.');
          }
        } catch (error) {
          console.error('[XHR] Error posting message:', error);
        }
      }
    };

    this.addEventListener('readystatechange', onReadyStateChange);

    originalSend.apply(this, [body]);
  };
};
