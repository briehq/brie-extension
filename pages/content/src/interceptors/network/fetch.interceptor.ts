import { safePostMessage } from '@extension/shared';

import { extractQueryParams } from '@src/utils';

type FetchArgs = [RequestInfo | URL, RequestInit?];

const REDACT_HEADER_KEYS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
const REDACT_BODY_KEYS = ['password', 'pass', 'token', 'secret', 'authorization', 'auth'];
const MAX_BODY_BYTES = 100_000; // 100KB cap for request/response previews
const BINARY_CT = /(octet-stream|pdf|zip|gzip|image|audio|video)\b/i;
const SELF_ENDPOINT_REGEX = /\/add-record|\/telemetry|\/analytics/; // adjust to your endpoints

const truncate = (s: string, max = MAX_BODY_BYTES) => (s.length > max ? s.slice(0, max) + '…[truncated]' : s);

const redactHeader = (k: string, v: string) => (REDACT_HEADER_KEYS.includes(k.toLowerCase()) ? '***redacted***' : v);

const headersInitToRecord = (h?: HeadersInit): Record<string, string> => {
  if (!h) return {};
  if (h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((v, k) => (out[k] = v));
    return out;
  }
  if (Array.isArray(h)) {
    return h.reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});
  }
  return { ...(h as Record<string, string>) };
};

const redactHeaders = (h: Record<string, string>) => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) out[k] = redactHeader(k, v);
  return out;
};

const previewRequestBodyFromRequest = async (req: Request): Promise<{ text?: string; bytes?: number }> => {
  try {
    if (req.bodyUsed) return { text: '[unavailable: body already used]' };
    const clone = req.clone();
    // If no body, this resolves empty string
    const text = await clone.text();
    if (!text) return {};
    return previewRequestBodyFromInit(text);
  } catch {
    return { text: '[unavailable]' };
  }
};

const previewRequestBodyFromInit = (body?: BodyInit | null): { text?: string; bytes?: number } => {
  if (!body) return {};
  try {
    if (typeof body === 'string') {
      const trimmed = body.trim();
      // try redact JSON keys if JSON-like
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const obj = JSON.parse(trimmed);
          const redact = (o: any): any =>
            Array.isArray(o)
              ? o.map(redact)
              : o && typeof o === 'object'
                ? Object.fromEntries(
                    Object.entries(o).map(([k, v]) => [
                      k,
                      REDACT_BODY_KEYS.some(x => k.toLowerCase().includes(x))
                        ? '***redacted***'
                        : typeof v === 'string'
                          ? truncate(v)
                          : redact(v),
                    ]),
                  )
                : o;
          const redacted = JSON.stringify(redact(obj));
          return { text: truncate(redacted), bytes: redacted.length };
        } catch {
          /* fallthrough */
        }
      }
      return { text: truncate(body), bytes: body.length };
    }
    if (body instanceof URLSearchParams) {
      const rec: Record<string, string> = {};
      body.forEach(
        (v, k) =>
          (rec[k] = REDACT_BODY_KEYS.some(x => k.toLowerCase().includes(x)) ? '***redacted***' : truncate(v, 10_000)),
      );
      const text = JSON.stringify(rec);
      return { text: truncate(text), bytes: text.length };
    }
    if (body instanceof FormData) {
      const parts: string[] = [];
      body.forEach((v, k) => {
        const safe = REDACT_BODY_KEYS.some(x => k.toLowerCase().includes(x))
          ? '***redacted***'
          : typeof v === 'string'
            ? truncate(v, 10_000)
            : `[file:${(v as File).name ?? 'blob'}:${(v as File).size ?? '?'}B]`;
        parts.push(`${k}=${safe}`);
      });
      const joined = parts.join('&');
      return { text: truncate(joined), bytes: joined.length };
    }
    if (body instanceof Blob) return { text: `[blob:${body.size}B]`, bytes: body.size };
    if (body instanceof ArrayBuffer) return { text: `[arraybuffer:${body.byteLength}B]`, bytes: body.byteLength };
    if ((body as any).stream) return { text: '[stream]' };
  } catch {
    /* ignore */
  }
  return { text: '[unserializable body]' };
};

const isBinaryContentType = (ct: string | null) => {
  if (!ct) return false;
  return BINARY_CT.test(ct);
};

export const interceptFetch = (): void => {
  if ((window as any).__BRIE_FETCH_PATCHED__) return;
  (window as any).__BRIE_FETCH_PATCHED__ = true;

  const originalFetch = window.fetch;

  window.fetch = async function (...args: FetchArgs): Promise<Response> {
    const startISO = new Date().toISOString();
    const startPerf = performance.now();

    // Normalize URL
    let urlStr: string;
    let req: Request | undefined;
    let init: RequestInit | undefined;

    try {
      if (args[0] instanceof Request) {
        req = args[0] as Request;
        urlStr = req.url;
        init = args[1];
      } else {
        urlStr = typeof args[0] === 'string' ? args[0] : (args[0] as URL).toString();
        init = args[1] || {};
      }
    } catch {
      // fallback
      urlStr = String(args[0]);
    }

    // Skip non-http(s) & self endpoints
    if (!/^https?:\/\//i.test(urlStr) || SELF_ENDPOINT_REGEX.test(urlStr)) {
      return originalFetch.apply(this, args as any);
    }

    const method = (req?.method || init?.method || 'GET').toUpperCase();

    // Request headers
    const outgoingHeaders = req ? headersInitToRecord(req.headers) : headersInitToRecord(init?.headers);
    const requestHeaders = redactHeaders(outgoingHeaders);

    // Request body preview
    const bodyPreview = req ? await previewRequestBodyFromRequest(req) : previewRequestBodyFromInit(init?.body ?? null);

    // Query params (your helper)
    const queryParams = extractQueryParams(urlStr);

    let response: Response;
    try {
      response = await originalFetch.apply(this, args as any);
    } catch (err) {
      // Network error (no Response)
      const endISO = new Date().toISOString();
      const durationMs = performance.now() - startPerf;

      safePostMessage('ADD_RECORD', {
        domain: 'fetch',
        recordType: 'network',
        source: 'client',
        timestamp: Date.now(),
        method,
        url: urlStr,
        responseURL: urlStr,
        queryParams,
        requestHeaders,
        requestBody: bodyPreview.text,
        requestBodyBytes: bodyPreview.bytes,
        responseHeaders: {},
        responseBody: '[network error]',
        requestStart: startISO,
        requestEnd: endISO,
        durationMs,
        status: 0,
        outcome: 'error',
      });

      safePostMessage('ADD_RECORD', {
        type: 'log',
        recordType: 'console',
        source: 'client',
        method: 'error',
        timestamp: Date.now(),
        domain: 'fetch',
        args: [`[Fetch] ${method} ${urlStr} network error`, String(err)],
        stackTrace: { parsed: 'interceptFetch', raw: '' },
        href: location.href,
        url: urlStr,
      });

      throw err; // preserve behavior
    }

    const endISO = new Date().toISOString();
    const durationMs = performance.now() - startPerf;

    // Opaque / CORS no-cors responses
    if (response.type === 'opaque') {
      safePostMessage('ADD_RECORD', {
        domain: 'fetch',
        recordType: 'network',
        source: 'client',
        timestamp: Date.now(),
        method,
        url: urlStr,
        responseURL: response.url || urlStr,
        queryParams,
        requestHeaders,
        requestBody: bodyPreview.text,
        requestBodyBytes: bodyPreview.bytes,
        responseHeaders: { '(opaque)': '' },
        responseBody: '[opaque]',
        requestStart: startISO,
        requestEnd: endISO,
        durationMs,
        status: 0,
        outcome: 'opaque',
      });
      return response;
    }

    // Normal responses: clone and read safely
    const ct = response.headers.get('Content-Type');
    const looksBinary = isBinaryContentType(ct);
    const clone = response.clone();

    const serializedHeaders: Record<string, string> = {};
    clone.headers.forEach((value, key) => (serializedHeaders[key] = value));

    let responseBody: string | object = '';
    try {
      if (looksBinary) {
        responseBody = `[binary:${serializedHeaders['content-length'] ?? '?'}B]`;
      } else if (ct?.includes('application/json')) {
        const text = await clone.text(); // read text first to cap
        const capped = truncate(text);
        try {
          responseBody = JSON.parse(capped);
        } catch {
          responseBody = capped; // malformed JSON → keep as text
        }
      } else if (ct?.includes('text') || ct?.includes('xml')) {
        const text = await clone.text();
        responseBody = truncate(text);
      } else {
        responseBody = 'BRIE: Unsupported content type';
      }
    } catch {
      responseBody = 'BRIE: Error parsing response body';
    }

    const payload = {
      method,
      url: urlStr,
      responseURL: response.url || urlStr,
      queryParams,
      requestHeaders,
      requestBody: bodyPreview.text,
      requestBodyBytes: bodyPreview.bytes,
      responseHeaders: serializedHeaders,
      responseBody,
      requestStart: startISO,
      requestEnd: endISO,
      durationMs,
      status: response.status,
    };

    try {
      safePostMessage('ADD_RECORD', {
        domain: 'fetch',
        recordType: 'network',
        source: 'client',
        timestamp: Date.now(),
        ...payload,
      });

      if (response.status >= 400) {
        safePostMessage('ADD_RECORD', {
          timestamp: Date.now(),
          domain: 'fetch',
          type: 'log',
          recordType: 'console',
          source: 'client',
          method: 'error',
          args: [`[Fetch] ${method} ${urlStr} responded with status ${response.status}`, payload],
          stackTrace: { parsed: 'interceptFetch', raw: '' },
          url: urlStr,
          href: location.href,
        });
      }
    } catch (err) {
      console.error('[Fetch] Error posting message:', err);
    }

    return response;
  };
};
