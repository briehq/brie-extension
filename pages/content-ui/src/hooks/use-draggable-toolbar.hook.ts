import type { CSSProperties, PointerEvent as RectPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Position } from '@src/models';

export const useDraggableToolbar = () => {
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const sizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onDragAndDrop = useCallback((e: RectPointerEvent) => {
    if (!containerRef.current) return;

    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    sizeRef.current = { width: rect.width, height: rect.height };
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setDragging(true);
    containerRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handleOnDragEnd = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return;
      setDragging(false);

      if (!containerRef.current || !('releasePointerCapture' in containerRef.current)) {
        return;
      }

      try {
        containerRef.current.releasePointerCapture((e as any).pointerId);
      } catch {
        //
      }
    },
    [dragging],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleOnMove = (e: PointerEvent | RectPointerEvent) => {
      const { width, height } = sizeRef.current;
      const { x: offsetX, y: offsetY } = dragOffsetRef.current;

      const rawX = e.clientX - offsetX;
      const rawY = e.clientY - offsetY;

      const margin = 8;
      const maxX = window.innerWidth - width - margin;
      const maxY = window.innerHeight - height - margin;

      const clampedX = Math.min(Math.max(rawX, margin), Math.max(maxX, margin));
      const clampedY = Math.min(Math.max(rawY, margin), Math.max(maxY, margin));

      setPosition({ x: clampedX, y: clampedY });
    };

    const handleOnUp = (e: PointerEvent) => handleOnDragEnd(e);

    window.addEventListener('pointermove', handleOnMove);
    window.addEventListener('pointerup', handleOnUp);
    window.addEventListener('pointercancel', handleOnUp);

    return () => {
      window.removeEventListener('pointermove', handleOnMove);
      window.removeEventListener('pointerup', handleOnUp);
      window.removeEventListener('pointercancel', handleOnUp);
    };
  }, [dragging, handleOnDragEnd]);

  const styles: CSSProperties = useMemo(() => {
    const base: CSSProperties = {
      position: 'fixed',
      zIndex: 2147483647,
      pointerEvents: 'none',
    };

    if (position) {
      return { ...base, left: position.x, top: position.y };
    }

    return {
      ...base,
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
    };
  }, [position]);

  return {
    ref: containerRef,
    styles,
    onDragAndDrop,
  };
};
