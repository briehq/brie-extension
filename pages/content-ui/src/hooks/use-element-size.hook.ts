import { useCallback, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

/**
 * useElementSize
 * Returns a callback ref and the element’s { width, height }.
 *
 * Usage:
 *   const { ref, width, height } = useElementSize<HTMLDivElement>();
 *   return <div ref={ref}>…</div>;
 */
export const useElementSize = <T extends HTMLElement = HTMLDivElement>(): {
  ref: (node: T | null) => void;
  width: number;
  height: number;
} => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node) return;

    const { width, height } = node.getBoundingClientRect();
    setSize({ width: Math.round(width), height: Math.round(height) });

    observerRef.current = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observerRef.current.observe(node);
  }, []);

  return { ref, width: size.width, height: size.height };
};
