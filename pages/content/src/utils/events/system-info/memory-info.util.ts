import type { MemoryInfo } from '@src/interfaces';

export const getMemoryInfo = (): MemoryInfo | null => {
  const memory = (performance as any).memory;
  return memory
    ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      }
    : null;
};
