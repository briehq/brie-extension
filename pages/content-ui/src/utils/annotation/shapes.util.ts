import type { Canvas } from 'fabric';
import { Rect, Line, Triangle, Circle, Group, IText, FabricImage, FabricText } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

import type { BackgroundFitMeta, CustomFabricObject, ElementDirection, ModifyShape } from '@src/models';

export const createRectangle = (pointer: PointerEvent, stroke: string) => {
  const rect = new Rect({
    left: pointer.x,
    top: pointer.y,
    width: 100,
    height: 100,
    stroke,
    strokeWidth: 3,
    fill: 'transparent',
    objectId: uuidv4(),
    cornerSize: 8,
    padding: 5,
    shapeType: 'rectangle',
    selectable: true,
  } as CustomFabricObject<Rect> | any);

  return rect;
};

export const createTriangle = (pointer: PointerEvent, stroke: string) => {
  return new Triangle({
    left: pointer.x,
    top: pointer.y,
    width: 100,
    height: 100,
    stroke,
    strokeWidth: 3,
    fill: 'transparent',
    objectId: uuidv4(),
    cornerSize: 8,
    padding: 5,
    shapeType: 'triangle',
    selectable: true,
  } as CustomFabricObject<Triangle> | any);
};

export const createCircle = (pointer: PointerEvent, stroke: string) => {
  return new Circle({
    left: pointer.x,
    top: pointer.y,
    radius: 100,
    stroke,
    strokeWidth: 3,
    fill: 'transparent',
    objectId: uuidv4(),
    cornerSize: 8,
    padding: 5,
    shapeType: 'circle',
    selectable: true,
  } as any);
};

export const createLine = (pointer: PointerEvent, stroke: string) => {
  return new Line([pointer.x, pointer.y, pointer.x + 100, pointer.y + 100], {
    stroke,
    strokeWidth: 3,
    objectId: uuidv4(),
    cornerSize: 8,
    shapeType: 'line',
    padding: 5,
    selectable: true,
  } as CustomFabricObject<Line> | any);
};

export const createArrow = (pointer: PointerEvent, stroke: string) => {
  // Create the line (shaft of the arrow)
  const line = new Line([0, 0, 100, 0], {
    stroke,
    strokeWidth: 3,
    selectable: false, // Ensure only the group is selectable, not individual parts
    originX: 'center', // Center the line in the group
    originY: 'center',
  });

  // Create the triangle (arrowhead)
  const triangle = new Triangle({
    width: 12,
    height: 18,
    fill: line.stroke,
    originX: 'center',
    originY: 'center',
    angle: 90, // Ensure the arrowhead points correctly
    left: 100, // Position the triangle at the end of the line
    selectable: false, // Ensure the triangle itself is not selectable
  });

  // Group the line and triangle into an arrow
  const arrowGroup = new Group([line, triangle], {
    left: pointer.x,
    top: pointer.y,
    hasControls: true,
    cornerSize: 10,
    objectId: uuidv4(),
    originX: 'center',
    originY: 'center',
    width: 100 + triangle.width, // Set group width to account for both line and triangle
    height: Math.max(line.strokeWidth, triangle.height), // Set group height based on the largest part
    shapeType: 'arrow',
    padding: 10,
    selectable: true,
  } as CustomFabricObject<Line> | any);

  // Set the correct coordinates and bounding box
  arrowGroup.setCoords();

  // Ensure correct bounding box on canvas interactions (dragging, resizing, etc.)
  arrowGroup.on('scaling', () => arrowGroup.setCoords());
  arrowGroup.on('rotating', () => arrowGroup.setCoords());
  arrowGroup.on('moving', () => arrowGroup.setCoords());

  return arrowGroup;
};

export const createSuggestingBox = ({ boxLeft, boxWidth, boxTop, boxHeight, className, score }: any) => {
  // Create lines for the bounding box (without the top line)
  const leftLine = new Line([boxLeft, boxTop, boxLeft, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5, // 50% opacity
    strokeWidth: 1.5,
    strokeDashArray: [10, 8], // Dashed stroke
  });

  const rightLine = new Line([boxLeft + boxWidth, boxTop, boxLeft + boxWidth, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5, // 50% opacity
    strokeWidth: 1.5,
    strokeDashArray: [10, 8], // Dashed stroke
  });

  const bottomLine = new Line([boxLeft, boxTop + boxHeight, boxLeft + boxWidth, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5, // 50% opacity
    strokeWidth: 1.5,
    strokeDashArray: [10, 8], // Dashed stroke
  });

  // Create a label background (semi-transparent yellow box)
  const labelBackground = new Rect({
    left: boxLeft,
    top: boxTop - 20, // Place label above the box
    width: boxWidth,
    height: 20,
    fill: 'yellow',
    opacity: 0.5, // 50% opacity
    selectable: false,
    hasControls: false,
  });

  // Create a label with the class name and score
  const labelText = new FabricText(`${className} (${(score * 100).toFixed(2)}%)`, {
    left: boxLeft + 5, // Padding from the left edge of the box
    top: boxTop - 18, // Align text within label background
    fontSize: 14,
    fontWeight: 500,
    fill: 'black',
    selectable: false,
    hasControls: false,
  });

  // Group the bounding box and label elements together
  return new Group([leftLine, rightLine, bottomLine, labelBackground, labelText], {
    selectable: true,
    hasControls: false, // No controls around the group
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
    padding: 5,
    selectable: true,
  });
};

export const createSpecificShape = (shapeType: string, pointer: PointerEvent, color: string) => {
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
 * @returns            { w, h, scale } meta to store with annotations
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

  return { width: naturalWidth, height: naturalHeight, scale };
};

export const createShape = (canvas: Canvas, pointer: PointerEvent, shapeType: string, color: string) => {
  if (shapeType === 'freeform') {
    canvas.isDrawingMode = true;
    return null;
  }

  return createSpecificShape(shapeType, pointer, color);
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
