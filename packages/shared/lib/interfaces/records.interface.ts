export type RecordType = 'network' | 'console';
export type RecordSource = 'background' | 'client';
export type FrameType = 'outermost_frame' | string;
export type DocumentLifecycle = 'active' | string;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | string;

export type HeaderKV = { name: string; value: string };
export type HeadersMap = Record<string, string>;

export type BaseRecord = {
  uuid: string;
  recordType: RecordType;
  source: RecordSource;
  timestamp: number;
  type: string;
  url: string;
  domain?: string;
  href?: string;
};

export type NetworkRecord = BaseRecord & {
  recordType: 'network';
  requestId: string;
  method: HttpMethod;
  documentId: string;
  documentLifecycle: DocumentLifecycle;
  frameId: number;
  frameType: FrameType;
  parentFrameId: number;
  tabId: number;
  initiator?: string;
  ip?: string;
  requestHeaders?: HeaderKV[];
  requestBodyBytes?: number;
  statusCode?: number;
  status?: number;
  statusLine?: string;
  responseURL?: string;
  responseHeaders?: Record<string, unknown>;
  responseBody?: unknown;
  queryParams?: Record<string, string>;
  requestStart?: string;
  requestEnd?: string;
  durationMs?: number;
};

export type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace' | string;

export type StackTrace = {
  parsed?: string;
  raw?: string;
};

export type ConsoleRecord = BaseRecord & {
  recordType: 'console';
  method: ConsoleMethod;
  args: unknown[];
  stackTrace?: StackTrace;
  domain?: string;
};

export type RecordLike = NetworkRecord | ConsoleRecord;
