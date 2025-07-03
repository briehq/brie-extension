import { safePostMessage, safeStructuredClone } from '@extension/shared';

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
        type: 'log',
        recordType: 'console',
        source: 'client',
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

      safePostMessage('ADD_RECORD', logData);
    } catch {
      // Don't throw or break host page
    }
  };

  (['log', 'warn', 'error', 'info', 'debug', 'table'] as const).forEach(method => {
    const original = originalConsole[method];
    if (typeof original !== 'function') return;

    Object.defineProperty(console, method, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function (...args: any[]) {
        try {
          captureLog(method, args);
        } catch {
          // Silently fail
        }
        original.apply(console, args);
      },
    });
  });
};
