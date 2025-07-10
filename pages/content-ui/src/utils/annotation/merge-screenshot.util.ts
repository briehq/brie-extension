import type { FabricObject } from 'fabric';
import { Canvas, util as FabricUtil, FabricImage } from 'fabric';

import type { Screenshot } from '@extension/shared';

/**
 * Renders a screenshot *with* its annotations into a PNG Blob
 * without flashing anything on-screen.
 *
 * @param screenshot   the screenshot (src must be CORS-enabled)
 * @param objects JSON objects from annotationsStorage
 */
export const mergeScreenshot = async ({
  screenshot,
  objects,
  parentHeight,
  parentWidth,
}: {
  screenshot: Screenshot;
  objects: FabricObject[];
  parentWidth: number;
  parentHeight: number;
}): Promise<File> => {
  const bg = await FabricImage.fromURL(screenshot.src, { crossOrigin: 'anonymous' });

  const scale = Math.min(parentWidth / bg.width!, parentHeight / bg.height!, 1);

  const canvasEl = document.createElement('canvas');
  const canvas = new Canvas(canvasEl, { renderOnAddRemove: false });

  canvas.setDimensions({
    width: Math.round(bg.width! * scale),
    height: Math.round(bg.height! * scale),
  });
  canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
  canvas.backgroundImage = bg;
  canvas.requestRenderAll();

  const enlivened = await FabricUtil.enlivenObjects(objects);
  enlivened.forEach((obj: any) => canvas.add(obj));
  canvas.requestRenderAll();

  const dataUrl = canvas.toDataURL();
  const blob = await (await fetch(dataUrl)).blob();

  canvas.dispose();
  return new File([blob], `${screenshot.name}.png`, { type: 'image/png' });
};
