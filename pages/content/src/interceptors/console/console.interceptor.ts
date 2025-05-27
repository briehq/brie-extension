import { safePostMessage } from '@extension/shared';

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
    const stack = error.stack.split('\n');
    const caller = stack[3] || 'Unknown location'; // Get the caller (file, line, column)

    return { parsed: caller.trim(), raw: error.stack };
  };

  // Function to capture and send logs to the background
  const captureLog = (method, args) => {
    const timestamp = Date.now();
    const stackTrace = getStackTrace();
    const pageUrl = window.location.href;
    const logData = {
      type: 'log',
      recordType: 'console',
      source: 'client',
      method, // 'log', 'warn', 'error', etc.
      timestamp, // ISO timestamp of the log
      args, // Arguments passed to the console method
      stackTrace, // Where the log was called from (file, line, column)
      pageUrl, // Page URL where the log was generated
      // Add user info and performance metrics as needed
    };

    if (method === 'error' && args[0] instanceof Error) {
      const error = args[0];
      logData.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    if (args[0] instanceof HTMLElement) {
      logData.element = {
        type: 'HTMLElement',
        tag: args[0].tagName,
        content: args[0].innerText, // or outerHTML, depending on the data you need
      };
    }

    safePostMessage('ADD_RECORD', logData);
  };

  // Overriding console methods without altering their behavior
  ['log', 'warn', 'error', 'info', 'debug', 'table'].forEach(method => {
    console[method] = (...args) => {
      // Capture the log
      captureLog(method, args);

      // Call the original method to ensure normal behavior (using the cloned method)
      originalConsole[method](...args);
    };
  });
};
