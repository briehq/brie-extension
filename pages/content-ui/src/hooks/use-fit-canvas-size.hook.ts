import type { Canvas } from 'fabric';
import { useEffect } from 'react';

import { setCanvasBackground } from '@src/utils/annotation';

/**
 * Auto-size a Fabric.js canvas so its background image always
 * fits inside the parent wrapper without exceeding either dimension.
 *
 * @param fabricCanvas   the fabric.Canvas instance (or null while loading)
 * @param imageUrl       URL of the screenshot / photo used as background
 * @param parentElt      the DOM element whose box we want to fill
 */
export const useFitCanvasToParent = (
  fabricCanvas: Canvas | null,
  imageUrl: string | null,
  parentElt: HTMLElement | null,
) => {
  useEffect(() => {
    if (!fabricCanvas || !imageUrl || !parentElt) return;

    const fit = () =>
      setCanvasBackground({
        file: imageUrl,
        canvas: fabricCanvas,
        parentWidth: parentElt.clientWidth,
        parentHeight: parentElt.clientHeight,
      });

    fit(); // first run

    const ro = new ResizeObserver(fit);
    ro.observe(parentElt);
    return () => ro.disconnect();
  }, [fabricCanvas, imageUrl, parentElt]);
};
