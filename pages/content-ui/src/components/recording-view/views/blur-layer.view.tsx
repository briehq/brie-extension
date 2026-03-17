import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { VIDEO } from '@extension/shared';

import type { HoverRect, BlurTarget, Position } from '@src/models';
import { createBlurTarget, getRectCoords, isInsideShadowDom, isTooLargeToBlur } from '@src/utils/recording';

type Point = Position;
interface BlurLayerProps {
  active: boolean;
}

const OVERLAY_Z = {
  hover: 2147483645,
  blur: 2147483644,
} as const;

const useRafThrottled = <T,>(fn: (arg: T) => void) => {
  const fnRef = useRef(fn);
  const rafRef = useRef<number | null>(null);
  const queuedRef = useRef<T | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const schedule = useCallback((arg: T) => {
    queuedRef.current = arg;
    if (rafRef.current != null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = queuedRef.current;
      queuedRef.current = null;
      if (next != null) fnRef.current(next);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return schedule;
};

const getElementAtPoint = (p: Point) => document.elementFromPoint(p.x, p.y);

export const BlurLayer: FC<BlurLayerProps> = ({ active }) => {
  const [hoverRect, setHoverRect] = useState<HoverRect | null>(null);
  const [blurTargets, setBlurTargets] = useState<BlurTarget[]>([]);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const blurTargetsRef = useRef<BlurTarget[]>([]);

  useEffect(() => {
    blurTargetsRef.current = blurTargets;
  }, [blurTargets]);

  const hasOverlays = active || blurTargets.length > 0;

  const isWithinBlurred = useCallback((el: Element | null) => {
    if (!el) return false;

    const targets = blurTargetsRef.current;

    return targets.some(t => t.element === el || t.element.contains(el));
  }, []);

  const computeHoverRect = useCallback(
    ({ x, y }: Point) => {
      const el = getElementAtPoint({ x, y });

      if (!el || isInsideShadowDom(el) || isWithinBlurred(el) || isTooLargeToBlur(el)) {
        setHoverRect(null);
        return;
      }

      setHoverRect(getRectCoords(el));
    },
    [isWithinBlurred],
  );

  const scheduleHoverRect = useRafThrottled<Point>(computeHoverRect);

  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlUserSelect = html.style.userSelect;
    const prevBodyUserSelect = body.style.userSelect;

    html.style.userSelect = 'none';
    body.style.userSelect = 'none';

    return () => {
      html.style.userSelect = prevHtmlUserSelect;
      body.style.userSelect = prevBodyUserSelect;
    };
  }, [active]);

  useEffect(() => {
    if (!hasOverlays) return;

    let raf: number | null = null;

    const bumpLayout = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        setLayoutVersion(v => v + 1);
        setHoverRect(null);
      });
    };

    window.addEventListener('scroll', bumpLayout, { passive: true });
    window.addEventListener('resize', bumpLayout);

    return () => {
      window.removeEventListener('scroll', bumpLayout);
      window.removeEventListener('resize', bumpLayout);

      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [hasOverlays]);

  useEffect(() => {
    if (!active) {
      setHoverRect(null);

      return;
    }

    const onPointerMove = (e: PointerEvent) => {
      scheduleHoverRect({ x: e.clientX, y: e.clientY });
    };

    const onPointerDown = (e: PointerEvent) => {
      const el = getElementAtPoint({ x: e.clientX, y: e.clientY });

      if (el && isInsideShadowDom(el)) return;

      e.preventDefault();
      e.stopPropagation();

      const sel = window.getSelection();

      if (sel && !sel.isCollapsed) sel.removeAllRanges();
    };

    const onClick = (e: MouseEvent) => {
      const el = getElementAtPoint({ x: e.clientX, y: e.clientY });

      if (!el || isInsideShadowDom(el)) return;

      e.preventDefault();
      e.stopPropagation();

      if (isWithinBlurred(el)) return;

      if (isTooLargeToBlur(el)) {
        window.postMessage({ source: 'brie-annotations', type: 'BLUR_REJECTED_TOO_LARGE' }, '*');

        return;
      }

      const target = createBlurTarget(el);

      if (!target) return;

      setBlurTargets(prev => [...prev, target]);
      setHoverRect(null);
    };

    window.addEventListener('pointermove', onPointerMove, { capture: true });
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('click', onClick, { capture: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('click', onClick, { capture: true });
    };
  }, [active, isWithinBlurred, scheduleHoverRect]);

  useEffect(() => {
    const onVideoCaptured = () => {
      setBlurTargets([]);
      setHoverRect(null);
    };

    window.addEventListener(VIDEO.CAPTURED, onVideoCaptured as EventListener);

    return () => window.removeEventListener(VIDEO.CAPTURED, onVideoCaptured as EventListener);
  }, []);

  /**
   * @todo
   * find a better way
   */
  void layoutVersion;

  if (!hasOverlays) return null;

  return (
    <>
      {active && hoverRect && (
        <div
          style={{
            position: 'fixed',
            top: hoverRect.top,
            left: hoverRect.left,
            width: hoverRect.width,
            height: hoverRect.height,
            pointerEvents: 'none',
            borderRadius: 4,
            border: '2px solid rgba(96, 165, 250, 0.9)',
            zIndex: OVERLAY_Z.hover,
          }}
        />
      )}

      {blurTargets.map(t => {
        const rect = t.element.getBoundingClientRect();

        if (!rect.width || !rect.height) return null;

        return (
          <div
            key={t.id}
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              pointerEvents: 'none',
              zIndex: OVERLAY_Z.blur,
              backgroundColor: 'rgba(255, 255, 255, 0.35)',
              backdropFilter: 'blur(6px)',
              borderRadius: 4,
            }}
          />
        );
      })}
    </>
  );
};
