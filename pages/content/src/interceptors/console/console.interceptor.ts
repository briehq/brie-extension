import { safePostMessage, safeStructuredClone, MessageType, RecordType, RecordSource } from '@extension/shared';

export const interceptConsole = () => {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    table: console.table,
  };

  const getStackTrace = () => {
    const error = new Error();
    const stack = error.stack?.split('\n') || [];
    const caller = stack.filter(line => !line.includes('extend.iife')).join('\n') || 'Unknown location';

    return { parsed: caller, raw: error.stack };
  };

  const sanitizeArg = (arg: any): any => {
    if (arg instanceof HTMLElement) {
      return {
        type: 'HTMLElement',
        tag: arg.tagName,
        content: arg.innerText || arg.outerHTML,
      };
    }
    return safeStructuredClone(arg);
  };

  const captureLog = (method: string, args: any[]): void => {
    try {
      const timestamp = Date.now();
      const stackTrace = getStackTrace();
      const pageUrl = window.location.href;

      const sanitizedArgs = args.map(sanitizeArg);

      const logData: Record<string, any> = {
        type: RecordType.CONSOLE,
        recordType: RecordType.CONSOLE,
        source: RecordSource.CLIENT,
        method,
        timestamp,
        args: sanitizedArgs,
        stackTrace,
        pageUrl,
      };

      if (method === 'error' && args && args[0] instanceof Error) {
        logData.error = {
          message: args[0].message,
          stack: args[0].stack,
        };
      }

      safePostMessage(MessageType.ADD_RECORD, logData);
    } catch {
      // Don't throw or break host page
    }
  };

  // Override each console method individually to avoid type issues
  console.log = (...args: any[]) => {
    captureLog('log', args);
    originalConsole.log(...args);
  };

  console.warn = (...args: any[]) => {
    captureLog('warn', args);
    originalConsole.warn(...args);
  };

  console.error = (...args: any[]) => {
    captureLog('error', args);
    originalConsole.error(...args);
  };

  console.info = (...args: any[]) => {
    captureLog('info', args);
    originalConsole.info(...args);
  };

  console.debug = (...args: any[]) => {
    captureLog('debug', args);
    originalConsole.debug(...args);
  };

  console.table = (...args: any[]) => {
    captureLog('table', args);
    originalConsole.table(...args);
  };
};
