import type { Canvas } from 'fabric';
import { Rect, Line, Triangle, Circle, Group, IText, FabricImage, FabricText, filters as FabricFilters } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

import type { BackgroundFitMeta, CustomFabricObject, ElementDirection, ModifyShape } from '@src/models';

import { DRAWING_TOOLS } from './canvas.util';

const DEFAULT_SHAPE_OPTIONS = {
  width: 100,
  height: 100,
  strokeWidth: 3,
  cornerSize: 8,
  padding: 10,
  selectable: true,
  fill: 'transparent',
};
export const createRectangle = (pointer: PointerEvent, stroke: string) => {
  const rect = new Rect({
    stroke,
    left: pointer.x,
    top: pointer.y,
    objectId: uuidv4(),
    shapeType: 'rectangle',
    ...DEFAULT_SHAPE_OPTIONS,
  } as CustomFabricObject<Rect> | any);

  return rect;
};

export const createTriangle = (pointer: PointerEvent, stroke: string) => {
  return new Triangle({
    stroke,
    left: pointer.x,
    top: pointer.y,
    objectId: uuidv4(),
    shapeType: 'triangle',
    ...DEFAULT_SHAPE_OPTIONS,
  } as CustomFabricObject<Triangle> | any);
};

export const createCircle = (pointer: PointerEvent, stroke: string) => {
  return new Circle({
    stroke,
    left: pointer.x,
    top: pointer.y,
    radius: 100,
    objectId: uuidv4(),
    shapeType: 'circle',
    ...DEFAULT_SHAPE_OPTIONS,
  } as any);
};

export const createLine = (pointer: PointerEvent, stroke: string) => {
  return new Line([pointer.x, pointer.y, pointer.x + 100, pointer.y + 100], {
    stroke,
    objectId: uuidv4(),
    shapeType: 'line',
    ...DEFAULT_SHAPE_OPTIONS,
  } as CustomFabricObject<Line> | any);
};

export const createArrow = (pointer: PointerEvent, stroke: string) => {
  const line = new Line([0, 0, 100, 0], {
    stroke,
    strokeWidth: 3,
    selectable: false,
    originX: 'center',
    originY: 'center',
  });

  const triangle = new Triangle({
    width: 12,
    height: 18,
    fill: line.stroke,
    originX: 'center',
    originY: 'center',
    angle: 90,
    left: 100,
    selectable: false,
  });

  const arrowGroup = new Group([line, triangle], {
    left: pointer.x,
    top: pointer.y,
    hasControls: true,
    cornerSize: 10,
    objectId: uuidv4(),
    originX: 'center',
    originY: 'center',
    width: 100 + triangle.width,
    height: Math.max(line.strokeWidth, triangle.height),
    shapeType: 'arrow',
    padding: 10,
    selectable: true,
  } as CustomFabricObject<Line> | any);

  arrowGroup.setCoords();

  arrowGroup.on('scaling', () => arrowGroup.setCoords());
  arrowGroup.on('rotating', () => arrowGroup.setCoords());
  arrowGroup.on('moving', () => arrowGroup.setCoords());

  return arrowGroup;
};

/**
 * Adds a blurred clone of the canvas background
 * and clips it to a draggable / resizable rectangle.
 *
 * @param canvas   Fabric canvas (backgroundImage already set)
 * @param pointer  result of canvas.getScenePoint(e)
 * @returns        the rectangle (interactive object)
 */
export const createBlur = (canvas: Canvas | undefined, pointer: PointerEvent): Rect => {
  if (!canvas) return {} as Rect;

  let blurred = {} as FabricImage;

  const bg = canvas.backgroundImage as FabricImage | undefined;
  if (!bg) throw new Error('[Brie] Background image must be set before blur tool');

  blurred = bg.cloneAsImage({});
  blurred.filters = [new FabricFilters.Blur({ blur: 0.1 })];
  blurred.applyFilters();

  blurred.set({
    selectable: false,
    evented: false,
    objectCaching: false,
    data: 'blur-layer',
  });

  canvas.add(blurred);
  canvas.sendObjectToBack(blurred);

  const win = new Rect({
    ...DEFAULT_SHAPE_OPTIONS,
    left: pointer.x,
    top: pointer.y,
    fill: 'rgba(0,0,0,0)',
    transparentCorners: false,
    objectCaching: false,
    objectId: uuidv4(),
    data: 'blur-window',
    shapeType: 'blur',
    blurRadius: 0.1,
    absolutePositioned: true,
  });

  blurred.clipPath = win;

  return win;
};

export const createSuggestingBox = ({ boxLeft, boxWidth, boxTop, boxHeight, className, score }: any) => {
  const leftLine = new Line([boxLeft, boxTop, boxLeft, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5,
    strokeWidth: 1.5,
    strokeDashArray: [10, 8],
  });

  const rightLine = new Line([boxLeft + boxWidth, boxTop, boxLeft + boxWidth, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5,
    strokeWidth: 1.5,
    strokeDashArray: [10, 8],
  });

  const bottomLine = new Line([boxLeft, boxTop + boxHeight, boxLeft + boxWidth, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5,
    strokeWidth: 1.5,
    strokeDashArray: [10, 8],
  });

  const labelBackground = new Rect({
    left: boxLeft,
    top: boxTop - 20,
    width: boxWidth,
    height: 20,
    fill: 'yellow',
    opacity: 0.5,
    selectable: false,
    hasControls: false,
  });

  const labelText = new FabricText(`${className} (${(score * 100).toFixed(2)}%)`, {
    left: boxLeft + 5,
    top: boxTop - 18,
    fontSize: 14,
    fontWeight: 500,
    fill: 'black',
    selectable: false,
    hasControls: false,
  });

  return new Group([leftLine, rightLine, bottomLine, labelBackground, labelText], {
    selectable: true,
    hasControls: false,
    padding: 10,
    shapeType: 'suggestion',
    objectId: uuidv4(),
  } as any);
};

export const createText = (pointer: PointerEvent, fill: string, text: string) => {
  return new IText(text, {
    left: pointer.x,
    top: pointer.y,
    fill,
    fontFamily: 'Helvetica',
    fontSize: 24,
    fontWeight: '400',
    objectId: uuidv4(),
    cornerSize: 10,
    shapeType: 'text',
    padding: 10,
    selectable: true,
  });
};

export const createSpecificShape = (shapeType: string, pointer: PointerEvent, color: string, canvas?: Canvas) => {
  switch (shapeType) {
    case 'rectangle':
      return createRectangle(pointer, color);

    case 'triangle':
      return createTriangle(pointer, color);

    case 'circle':
      return createCircle(pointer, color);

    case 'line':
      return createLine(pointer, color);

    case 'arrow':
      return createArrow(pointer, color);

    case 'text':
      return createText(pointer, color, 'Tap to Type');

    case 'blur':
      return createBlur(canvas, pointer);

    default:
      return null;
  }
};

export const handleImageUpload = ({ file, canvas, shapeRef, syncShapeInStorage }: any) => {
  const reader = new FileReader();

  reader.onload = async () => {
    const img = await FabricImage.fromURL(reader.result as string);

    img.scaleToWidth(200);
    img.scaleToHeight(200);

    canvas.current.add(img);

    // img.objectId = uuidv4();

    shapeRef.current = img;

    syncShapeInStorage(img);
    canvas.current.requestRenderAll();
  };

  reader.readAsDataURL(file);
};

/**
 * Fit an image inside a parent frame *without* modifying object coordinates.
 *
 * @param file         URL or data:URL
 * @param canvas       Fabric canvas (already created)
 * @param parentWidth  available width  (e.g. grid column)
 * @param parentHeight available height (e.g. grid row)
 * @returns            { BackgroundFitMeta } meta to store with annotations
 */
export const setCanvasBackground = async ({
  file,
  canvas,
  parentWidth,
  parentHeight,
}: {
  file: string;
  canvas: Canvas;
  parentWidth: number;
  parentHeight: number;
}): Promise<BackgroundFitMeta> => {
  const img = await FabricImage.fromURL(file, { crossOrigin: 'anonymous' });
  const naturalWidth = img.width ?? 1;
  const naturalHeight = img.height ?? 1;

  const scale = Math.min(parentWidth / naturalWidth, parentHeight / naturalHeight, 1);
  const fitWidth = Math.round(naturalWidth * scale);
  const fitHeight = Math.round(naturalHeight * scale);

  canvas.setDimensions({ width: fitWidth, height: fitHeight });

  canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);

  img.set({
    originX: 'left',
    originY: 'top',
    left: 0,
    top: 0,
    scaleX: 1,
    scaleY: 1,
  });

  canvas.backgroundImage = img;
  await canvas.requestRenderAll();

  return {
    sizes: {
      natural: { width: naturalWidth, height: naturalHeight },
      fit: { width: fitWidth, height: fitHeight },
    },
    scale,
  };
};

export const createShape = (canvas: Canvas, pointer: PointerEvent, shapeType: string, color: string) => {
  if (DRAWING_TOOLS.includes(shapeType)) {
    canvas.isDrawingMode = true;
    return null;
  }

  return createSpecificShape(shapeType, pointer, color, canvas);
};

export const modifyShape = ({ canvas, property, value, activeObjectRef, syncShapeInStorage }: ModifyShape) => {
  const selectedElement = canvas.getActiveObject();

  if (!selectedElement || selectedElement?.type === 'activeSelection') {
    return;
  }

  // if  property is width or height, set the scale of the selected element
  if (property === 'width') {
    selectedElement.set('scaleX', 1);
    selectedElement.set('width', value);
  } else if (property === 'height') {
    selectedElement.set('scaleY', 1);
    selectedElement.set('height', value);
  } else {
    if (selectedElement[property as keyof object] === value) {
      return;
    }
    selectedElement.set(property as keyof object, value);
  }

  // set selectedElement to activeObjectRef
  canvas.requestRenderAll();
  activeObjectRef.current = selectedElement;

  syncShapeInStorage(selectedElement);
};

export const bringElement = ({ canvas, direction, syncShapeInStorage }: ElementDirection) => {
  if (!canvas) {
    return;
  }

  // get the selected element. If there is no selected element or there are more than one selected element, return
  const selectedElement = canvas.getActiveObject();

  if (!selectedElement || selectedElement?.type === 'activeSelection') {
    return;
  }

  // bring the selected element to the front
  if (direction === 'front') {
    canvas.bringObjectToFront(selectedElement);
  } else if (direction === 'back') {
    canvas.sendObjectToBack(selectedElement);
  }

  // canvas.renderAll();
  syncShapeInStorage(selectedElement);

  // re-render all objects on the canvas
};
