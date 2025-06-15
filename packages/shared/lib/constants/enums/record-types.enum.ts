export enum RecordType {
  EVENTS = 'events',
  NETWORK = 'network',
  CONSOLE = 'console',
  COOKIES = 'cookies',
  LOCAL_STORAGE = 'local-storage',
  SESSION_STORAGE = 'session-storage',
}

export enum RecordSource {
  BACKGROUND = 'background',
  CONTENT_SCRIPT = 'content-script',
  CLIENT = 'client',
}

export enum LogMethod {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  LOG = 'log',
}
