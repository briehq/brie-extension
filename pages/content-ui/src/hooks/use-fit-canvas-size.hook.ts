import type { Canvas } from 'fabric';
import { useEffect } from 'react';

import { setCanvasBackground } from '@src/utils/annotation';

/**
 * Auto-size a Fabric.js canvas so its background image always
 * fits inside the parent wrapper without exceeding either dimension.
 *
 * @param fabricCanvas   the fabric.Canvas instance (or null while loading)
 * @param screenshotSrc       URL of the screenshot / photo used as background
 * @param parentElt      the DOM element whose box we want to fill
 */
export const useFitCanvasToParent = (
  fabricCanvas: Canvas | null,
  screenshotUrl: string | null,
  parentElt: HTMLElement | null,
) => {
  useEffect(() => {
    if (!fabricCanvas || !screenshotUrl || !parentElt) return;

    const fit = () =>
      setCanvasBackground({
        file: screenshotUrl,
        canvas: fabricCanvas,
        parentWidth: parentElt.clientWidth,
        parentHeight: parentElt.clientHeight,
      });

    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(parentElt);
    return () => ro.disconnect();
  }, [fabricCanvas, screenshotUrl, parentElt]);
};
