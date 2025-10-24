/** Safe CSS.escape fallback for older engines. */
export const cssEscape = (s: string) =>
  (window as any).CSS?.escape
    ? (window as any).CSS.escape(s)
    : // eslint-disable-next-line no-useless-escape
      s.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
