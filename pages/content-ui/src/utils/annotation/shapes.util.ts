import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

import { CustomFabricObject, ElementDirection, ImageUpload, ModifyShape } from '@src/models';

export const createRectangle = (pointer: PointerEvent) => {
  const rect = new fabric.Rect({
    left: pointer.x,
    top: pointer.y,
    width: 100,
    height: 100,
    stroke: '#dc2626',
    strokeWidth: 3,
    fill: 'transparent',
    objectId: uuidv4(),
    cornerSize: 8,
    padding: 5,
    shapeType: 'rectangle',
    selectable: true,
  } as CustomFabricObject<fabric.Rect> | any);

  return rect;
};

export const createTriangle = (pointer: PointerEvent) => {
  return new fabric.Triangle({
    left: pointer.x,
    top: pointer.y,
    width: 100,
    height: 100,
    stroke: '#dc2626',
    strokeWidth: 3,
    fill: 'transparent',
    objectId: uuidv4(),
    cornerSize: 8,
    padding: 5,
    shapeType: 'triangle',
    selectable: true,
  } as CustomFabricObject<fabric.Triangle> | any);
};

export const createCircle = (pointer: PointerEvent) => {
  return new fabric.Circle({
    left: pointer.x,
    top: pointer.y,
    radius: 100,
    stroke: '#dc2626',
    strokeWidth: 3,
    fill: 'transparent',
    objectId: uuidv4(),
    cornerSize: 8,
    padding: 5,
    shapeType: 'circle',
    selectable: true,
  } as any);
};

export const createLine = (pointer: PointerEvent) => {
  return new fabric.Line([pointer.x, pointer.y, pointer.x + 100, pointer.y + 100], {
    stroke: '#dc2626',
    strokeWidth: 3,
    objectId: uuidv4(),
    cornerSize: 8,
    shapeType: 'line',
    padding: 5,
    selectable: true,
  } as CustomFabricObject<fabric.Line> | any);
};

export const createArrow = (pointer: PointerEvent) => {
  // Create the line (shaft of the arrow)
  const line = new fabric.Line([0, 0, 100, 0], {
    stroke: '#dc2626',
    strokeWidth: 3,
    selectable: false, // Ensure only the group is selectable, not individual parts
    originX: 'center', // Center the line in the group
    originY: 'center',
  });

  // Create the triangle (arrowhead)
  const triangle = new fabric.Triangle({
    width: 12,
    height: 18,
    fill: '#dc2626',
    originX: 'center',
    originY: 'center',
    angle: 90, // Ensure the arrowhead points correctly
    left: 100, // Position the triangle at the end of the line
    selectable: false, // Ensure the triangle itself is not selectable
  });

  // Group the line and triangle into an arrow
  const arrowGroup = new fabric.Group([line, triangle], {
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
  } as CustomFabricObject<fabric.Line> | any);

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
  const leftLine = new fabric.Line([boxLeft, boxTop, boxLeft, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5, // 50% opacity
    strokeWidth: 1.5,
    strokeDashArray: [10, 8], // Dashed stroke
  });

  const rightLine = new fabric.Line([boxLeft + boxWidth, boxTop, boxLeft + boxWidth, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5, // 50% opacity
    strokeWidth: 1.5,
    strokeDashArray: [10, 8], // Dashed stroke
  });

  const bottomLine = new fabric.Line([boxLeft, boxTop + boxHeight, boxLeft + boxWidth, boxTop + boxHeight], {
    stroke: 'yellow',
    opacity: 0.5, // 50% opacity
    strokeWidth: 1.5,
    strokeDashArray: [10, 8], // Dashed stroke
  });

  // Create a label background (semi-transparent yellow box)
  const labelBackground = new fabric.Rect({
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
  const labelText = new fabric.Text(`${className} (${(score * 100).toFixed(2)}%)`, {
    left: boxLeft + 5, // Padding from the left edge of the box
    top: boxTop - 18, // Align text within label background
    fontSize: 14,
    fontWeight: 500,
    fill: 'black',
    selectable: false,
    hasControls: false,
  });

  // Group the bounding box and label elements together
  return new fabric.Group([leftLine, rightLine, bottomLine, labelBackground, labelText], {
    selectable: true,
    hasControls: false, // No controls around the group
    padding: 10,
    shapeType: 'suggestion',
    objectId: uuidv4(),
    selectable: true,
  } as any);
};

export const createText = (pointer: PointerEvent, text: string) => {
  return new fabric.IText(text, {
    left: pointer.x,
    top: pointer.y,
    fill: '#dc2626',
    fontFamily: 'Helvetica',
    fontSize: 24,
    fontWeight: '400',
    objectId: uuidv4(),
    cornerSize: 10,
    shapeType: 'text',
    padding: 5,
    selectable: true,
  } as fabric.ITextOptions);
};

export const createSpecificShape = (shapeType: string, pointer: PointerEvent) => {
  switch (shapeType) {
    case 'rectangle':
      return createRectangle(pointer);

    case 'triangle':
      return createTriangle(pointer);

    case 'circle':
      return createCircle(pointer);

    case 'line':
      return createLine(pointer);

    case 'arrow':
      return createArrow(pointer);

    case 'text':
      return createText(pointer, 'Tap to Type');

    default:
      return null;
  }
};

export const handleImageUpload = ({ file, canvas, shapeRef, syncShapeInStorage }: any) => {
  const reader = new FileReader();

  reader.onload = () => {
    fabric.Image.fromURL(reader.result as string, (img: any) => {
      img.scaleToWidth(200);
      img.scaleToHeight(200);

      canvas.current.add(img);

      img.objectId = uuidv4();

      shapeRef.current = img;

      syncShapeInStorage(img);
      canvas.current.requestRenderAll();
    });
  };

  reader.readAsDataURL(file);
};

export const setCanvasBackground = async ({
  file,
  canvas,
  maxHeight = 500,
  maxWidth,
}: {
  file: string;
  canvas: fabric.Canvas;
  maxHeight: number;
  maxWidth: number;
}) => {
  fabric.Image.fromURL(
    file,
    img => {
      const originalWidth = img.width || 1; // Prevent division by zero
      const originalHeight = img.height || 1;

      // Calculate scaling factor to fit within maxWidth and maxHeight while maintaining aspect ratio
      const widthScale = maxWidth / originalWidth;
      const heightScale = maxHeight / originalHeight;
      const scaleFactor = Math.min(widthScale, heightScale, 1); // Ensure no scaling up

      const newWidth = originalWidth * scaleFactor;
      const newHeight = originalHeight * scaleFactor;

      // Resize canvas to fit the scaled image dimensions
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);

      // Set background image with scaling applied
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        scaleX: newWidth / originalWidth,
        scaleY: newHeight / originalHeight,
      });
    },
    { crossOrigin: 'anonymous' }, // Handle CORS if needed
  );
};

export const createShape = (canvas: fabric.Canvas, pointer: PointerEvent, shapeType: string) => {
  if (shapeType === 'freeform') {
    canvas.isDrawingMode = true;
    return null;
  }

  return createSpecificShape(shapeType, pointer);
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
    canvas.bringToFront(selectedElement);
  } else if (direction === 'back') {
    canvas.sendToBack(selectedElement);
  }

  // canvas.renderAll();
  syncShapeInStorage(selectedElement);

  // re-render all objects on the canvas
};
