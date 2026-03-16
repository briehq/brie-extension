import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { VIDEO } from '@extension/shared';

import type { Position } from '@src/models';

type Point = Position;
interface HighlighterLayerProps {
  active: boolean;
}
interface Stroke {
  id: string;
  points: Point[];
  d: string;
  fading?: boolean;
}

const VISIBLE_DURATION_MS = 3_000;

const buildPathFromPoints = (points: Point[]) => {
  if (points.length === 0) return '';

  const first = points[0];
  let d = `M ${first.x} ${first.y}`;

  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }

  return d;
};

/**
 * Adds a new point only if it’s far enough from the last one.
 * Prevents huge point arrays and reduces path churn.
 */
const shouldAddPoint = (prev: Point, next: Point, minDistPx = 2) => {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;

  return dx * dx + dy * dy >= minDistPx * minDistPx;
};

export const HighlighterLayer: FC<HighlighterLayerProps> = ({ active }) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [inProgress, setInProgress] = useState<Stroke | null>(null);

  const inProgressRef = useRef<Stroke | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastQueuedPointRef = useRef<Point | null>(null);
  const timeoutsRef = useRef<Map<string, { fade: number; remove: number }>>(new Map());

  const clearStrokeTimers = useCallback((id: string) => {
    const timers = timeoutsRef.current.get(id);
    if (!timers) return;
    window.clearTimeout(timers.fade);
    window.clearTimeout(timers.remove);
    timeoutsRef.current.delete(id);
  }, []);

  useEffect(() => {
    if (!active) return;

    const el = document.documentElement;
    const prev = el.style.cursor;
    el.style.cursor = 'crosshair';

    return () => {
      el.style.cursor = prev;
    };
  }, [active]);

  useEffect(() => {
    const onVideoCaptured = () => {
      setInProgress(null);
      setStrokes([]);
      inProgressRef.current = null;
      lastQueuedPointRef.current = null;

      for (const [id] of timeoutsRef.current) clearStrokeTimers(id);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    window.addEventListener(VIDEO.CAPTURED, onVideoCaptured as EventListener);

    return () => window.removeEventListener(VIDEO.CAPTURED, onVideoCaptured as EventListener);
  }, [clearStrokeTimers]);

  const scheduleFadeOut = useCallback(
    (id: string) => {
      const fadeDurationMs = 250;

      clearStrokeTimers(id);

      const fade = window.setTimeout(() => {
        setStrokes(prev => prev.map(stroke => (stroke.id === id ? { ...stroke, fading: true } : stroke)));
      }, VISIBLE_DURATION_MS);

      const remove = window.setTimeout(() => {
        setStrokes(prev => prev.filter(stroke => stroke.id !== id));
        clearStrokeTimers(id);
      }, VISIBLE_DURATION_MS + fadeDurationMs);

      timeoutsRef.current.set(id, { fade, remove });
    },
    [clearStrokeTimers],
  );

  const flushQueuedPoint = useCallback(() => {
    rafRef.current = null;
    const stroke = inProgressRef.current;
    const nextPoint = lastQueuedPointRef.current;

    if (!stroke || !nextPoint) return;

    const last = stroke.points[stroke.points.length - 1];
    if (!last || !shouldAddPoint(last, nextPoint)) return;

    const nextPoints = [...stroke.points, nextPoint];
    const nextStroke: Stroke = {
      ...stroke,
      points: nextPoints,
      d: buildPathFromPoints(nextPoints),
    };

    inProgressRef.current = nextStroke;
    setInProgress(nextStroke);
  }, []);

  const queuePoint = useCallback(
    (p: Point) => {
      lastQueuedPointRef.current = p;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(flushQueuedPoint);
    },
    [flushQueuedPoint],
  );

  const beginStroke = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!active) return;

      if (e.pointerType === 'mouse' && e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const id = `${Date.now()}`;
      const first: Point = { x: e.clientX, y: e.clientY };
      const stroke: Stroke = { id, points: [first], d: buildPathFromPoints([first]) };

      inProgressRef.current = stroke;
      lastQueuedPointRef.current = first;
      setInProgress(stroke);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    [active],
  );

  const moveStroke = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!active) return;
      if (!inProgressRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      queuePoint({ x: e.clientX, y: e.clientY });
    },
    [active, queuePoint],
  );

  const endStroke = useCallback(
    (e?: React.PointerEvent<HTMLDivElement>) => {
      if (!active) return;

      e?.preventDefault();
      e?.stopPropagation();

      const finished = inProgressRef.current;
      if (!finished) return;

      inProgressRef.current = null;
      lastQueuedPointRef.current = null;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      setInProgress(null);
      setStrokes(prev => [...prev, finished]);
      scheduleFadeOut(finished.id);
    },
    [active, scheduleFadeOut],
  );

  const allStrokes = useMemo(() => (inProgress ? [...strokes, inProgress] : strokes), [strokes, inProgress]);

  if (!active && !allStrokes.length) return null;

  const marker = {
    stroke: 'rgba(255, 0, 0, 0.45)',
    strokeWidth: 14,
    blurPx: 0.6,
  } as const;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        cursor: active ? 'crosshair' : 'default',
        pointerEvents: active ? 'auto' : 'none',
        touchAction: 'none',
      }}
      onPointerDown={beginStroke}
      onPointerMove={moveStroke}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={() => {
        if (inProgressRef.current) endStroke();
      }}>
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
        }}>
        {allStrokes.map(stroke => (
          <path
            key={stroke.id}
            d={stroke.d}
            fill="none"
            stroke={marker.stroke}
            strokeWidth={marker.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: stroke.fading ? 0 : 1,
              transition: 'opacity 0.25s ease-out',
              filter: `blur(${marker.blurPx}px)`,
            }}
          />
        ))}
      </svg>
    </div>
  );
};
