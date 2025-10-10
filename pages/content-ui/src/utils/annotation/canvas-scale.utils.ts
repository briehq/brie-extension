import type { Canvas } from 'fabric';

export const getCanvasScale = (canvas: Canvas): number => (canvas.viewportTransform ? canvas.viewportTransform[0] : 1);
