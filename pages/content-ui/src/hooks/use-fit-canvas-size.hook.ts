import type { Canvas } from 'fabric';
import { useEffect } from 'react';

import type { Screenshot } from '@extension/shared';
import { annotationsStorage } from '@extension/storage';

import { setCanvasBackground } from '@src/utils/annotation';

/**
 * Auto-size a Fabric.js canvas so its background image always
 * fits inside the parent wrapper without exceeding either dimension.
 *
 * @param fabricCanvas   the fabric.Canvas instance (or null while loading)
 * @param screenshot      URL of the screenshot / photo used as background
 * @param parentElt      the DOM element whose box we want to fill
 */
export const useFitCanvasToParent = (
  fabricCanvas: Canvas | null,
  screenshot: Screenshot,
  parentElt: HTMLElement | null,
) => {
  useEffect(() => {
    if (!fabricCanvas || !screenshot?.id || !screenshot?.src || !parentElt) return;

    const fit = async () => {
      const meta = setCanvasBackground({
        file: screenshot.src,
        canvas: fabricCanvas,
        parentWidth: parentElt.clientWidth,
        parentHeight: parentElt.clientHeight,
      });

      await annotationsStorage.setAnnotations(screenshot.id!, { meta });
    };
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(parentElt);
    return () => ro.disconnect();
  }, [fabricCanvas, screenshot, parentElt]);
};
