import { Canvas, FabricObject, PencilBrush, Point } from 'fabric';
import type { RefObject } from 'react';
import { v4 as uuid4 } from 'uuid';

import { defaultNavElement } from '@src/constants';
import type {
  CanvasMouseDown,
  CanvasMouseMove,
  CanvasMouseUp,
  CanvasObjectModified,
  CanvasObjectScaling,
  CanvasPathCreated,
  CanvasSelectionCreated,
} from '@src/models';

import { getCanvasScale } from './canvas-scale.utils';
import { createDefaultControls } from './controls.util';
import { hexToRgba } from './hex-to-rgba.util';
import { createSpecificShape, setCanvasBackground } from './shapes.util';

export const DRAWING_TOOLS = ['freeform', 'highlighter'];

export const getShadowHostElement = () => document.querySelector('#brie-root');

export const getCanvasElement = () => {
  const shadowHost = getShadowHostElement();

  if (shadowHost && shadowHost.shadowRoot) {
    const shadowRoot = shadowHost.shadowRoot;
    const canvas = shadowRoot.querySelector('#brie-canvas');

    if (canvas) {
      return canvas;
    } else {
      console.error('Canvas element not found in Shadow DOM.');
    }
  } else {
    console.error('Shadow host or Shadow root not found.');
  }

  return null;
};

export const initializeFabric = ({
  fabricRef,
  canvasRef,
  backgroundImage,
}: {
  fabricRef: RefObject<Canvas | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  backgroundImage: string;
}) => {
  if (!canvasRef?.current) throw new Error('Canvas ref is not available');

  const parent = canvasRef.current.parentElement!;
  const { width, height } = parent.getBoundingClientRect();

  const canvas = new Canvas(canvasRef.current, {
    width,
    height,
  });

  if (backgroundImage) {
    try {
      setCanvasBackground({ file: backgroundImage, canvas, parentHeight: height, parentWidth: width });
    } catch (error) {
      console.error('Failed to set the background image:', error);
    }
  }

  FabricObject.ownDefaults = {
    ...FabricObject.ownDefaults,
    selectable: true,
    objectCaching: false,
    cornerSize: 9,
    cornerColor: 'blue',
    cornerStyle: 'circle',
  };

  FabricObject.createControls = () => ({
    controls: createDefaultControls(),
  });

  fabricRef.current = canvas;

  return canvas;
};

export const applyBrush = (tool: 'freeform' | 'highlighter', canvas: Canvas, currentColorRef: any) => {
  const brush = new PencilBrush(canvas);

  if (tool === 'freeform') {
    brush.width = 3;
    brush.color = currentColorRef.current;
  } else {
    brush.width = 18;
    brush.color = hexToRgba(currentColorRef.current, 0.45);
  }

  canvas.freeDrawingBrush = brush;
};

export const handleCanvasMouseDown = ({
  options,
  canvas,
  selectedShapeRef,
  isDrawing,
  shapeRef,
  currentColorRef,
}: CanvasMouseDown) => {
  const pointer = canvas.getScenePoint(options.e);
  const target = canvas.findTarget(options.e);

  canvas.isDrawingMode = false;

  if (DRAWING_TOOLS.includes(selectedShapeRef.current!)) {
    applyBrush(selectedShapeRef.current, canvas, currentColorRef);

    canvas.isDrawingMode = true;
    isDrawing.current = true;
    return;
  }

  canvas.isDrawingMode = false;

  if (target && (target.type === selectedShapeRef.current || target.type === 'activeSelection')) {
    isDrawing.current = false;

    canvas.setActiveObject(target);
    target.setCoords();
  } else {
    isDrawing.current = true;

    shapeRef.current = createSpecificShape(selectedShapeRef.current, pointer as any, currentColorRef?.current, canvas);

    if (shapeRef.current) {
      canvas.add(shapeRef.current);
    }
  }
};

export const handleCanvasMouseMove = ({
  options,
  canvas,
  isDrawing,
  selectedShapeRef,
  shapeRef,
  syncShapeInStorage,
}: CanvasMouseMove) => {
  if (!isDrawing.current) {
    return;
  }
  if (DRAWING_TOOLS.includes(selectedShapeRef.current)) {
    return;
  }

  canvas.isDrawingMode = false;

  const pointer = canvas.getScenePoint(options.e);

  switch (selectedShapeRef?.current) {
    case 'rectangle':
    case 'triangle':
    case 'arrow':
    case 'blur':
    case 'image':
      shapeRef.current?.set({
        width: pointer.x - (shapeRef.current?.left || 0),
        height: pointer.y - (shapeRef.current?.top || 0),
      });
      break;

    case 'circle':
      shapeRef.current.set({
        radius: Math.abs(pointer.x - (shapeRef.current?.left || 0)) / 2,
      });
      break;

    case 'line':
      shapeRef.current?.set({
        x2: pointer.x,
        y2: pointer.y,
      });
      break;

    default:
  }

  // requestRenderAll coalesces rapid mouse:move events into one rAF tick (renderAll paints sync each call).
  canvas.requestRenderAll();

  if (shapeRef.current?.objectId) {
    syncShapeInStorage(shapeRef.current);
  }
};

export const handleCanvasMouseUp = ({
  canvas,
  isDrawing,
  shapeRef,
  activeObjectRef,
  selectedShapeRef,
  syncShapeInStorage,
  setActiveElement,
}: CanvasMouseUp) => {
  isDrawing.current = false;
  if (DRAWING_TOOLS.includes(selectedShapeRef.current)) {
    return;
  }

  syncShapeInStorage(shapeRef.current);

  shapeRef.current = null;
  activeObjectRef.current = null;
  selectedShapeRef.current = null;

  if (!canvas.isDrawingMode) {
    setTimeout(() => {
      setActiveElement(defaultNavElement);
    }, 700);
  }
};

export const handleCanvasObjectModified = ({ options, syncShapeInStorage }: CanvasObjectModified) => {
  const target = options.target;
  if (!target) {
    return;
  }

  if (target?.type === 'activeSelection') {
    /* noop */
  } else {
    syncShapeInStorage(target);
  }
};

export const handlePathCreated = ({ options, syncShapeInStorage }: CanvasPathCreated) => {
  const path = options.path;
  if (!path) {
    return;
  }

  path.set({
    objectId: uuid4(),
    padding: 10,
    globalCompositeOperation: 'source-over',
  });

  syncShapeInStorage(path);
};

/** Keep object fully inside the canvas, whatever the zoom. */
export const handleCanvasObjectMoving = ({ options }: { options: any }) => {
  const target = options.target as FabricObject;
  if (!target) return;

  const canvas = target.canvas as Canvas;
  if (!canvas) return;

  const scale = getCanvasScale(canvas);
  const sceneWidth = (canvas.width ?? 0) / scale;
  const sceneHeight = (canvas.height ?? 0) / scale;

  const objW = (target.width ?? 0) * (target.scaleX ?? 1);
  const objH = (target.height ?? 0) * (target.scaleY ?? 1);

  target.set({
    left: Math.min(Math.max(0, target.left ?? 0), sceneWidth - objW),
    top: Math.min(Math.max(0, target.top ?? 0), sceneHeight - objH),
  });

  target.setCoords();
};

export const handleCanvasSelectionCreated = ({
  options,
  isEditingRef,
  setElementAttributes,
}: CanvasSelectionCreated) => {
  if (isEditingRef.current) {
    return;
  }

  if (!options?.selected) {
    return;
  }

  const selectedElement: any = options?.selected[0] as FabricObject;

  if (selectedElement && options.selected.length === 1) {
    const scaledWidth = selectedElement?.scaleX
      ? selectedElement?.width * selectedElement?.scaleX
      : selectedElement?.width;

    const scaledHeight = selectedElement?.scaleY
      ? selectedElement?.height * selectedElement?.scaleY
      : selectedElement?.height;

    setElementAttributes({
      width: scaledWidth?.toFixed(0).toString() || '',
      height: scaledHeight?.toFixed(0).toString() || '',
      fill: selectedElement?.fill?.toString() || '',
      stroke: selectedElement?.stroke || '',
      fontSize: selectedElement?.fontSize || '',
      fontFamily: selectedElement?.fontFamily || '',
      fontWeight: selectedElement?.fontWeight || '',
    });
  }
};

export const handleCanvasObjectScaling = ({ options, setElementAttributes }: CanvasObjectScaling) => {
  const selectedElement: any = options.target;

  const scaledWidth = selectedElement?.scaleX
    ? selectedElement?.width * selectedElement?.scaleX
    : selectedElement?.width;

  const scaledHeight = selectedElement?.scaleY
    ? selectedElement?.height * selectedElement?.scaleY
    : selectedElement?.height;

  setElementAttributes(prev => ({
    ...prev,
    width: scaledWidth?.toFixed(0).toString() || '',
    height: scaledHeight?.toFixed(0).toString() || '',
  }));
};

export const handleResize = ({
  canvas,
  backgroundImage,
}: {
  canvas: Canvas | null;
  backgroundImage: string | null;
}) => {
  if (!canvas || !backgroundImage) return;

  const wrapper = getCanvasElement();
  if (!wrapper) return;

  setCanvasBackground({
    file: backgroundImage,
    canvas,
    parentWidth: wrapper.clientWidth,
    parentHeight: wrapper.clientHeight,
  });
};

export const handleCanvasZoom = ({ options, canvas }: { options: any; canvas: Canvas }) => {
  const delta = options.e?.deltaY;
  let zoom = canvas.getZoom();

  const minZoom = 0.2;
  const maxZoom = 1;
  const zoomStep = 0.001;

  zoom = Math.min(Math.max(minZoom, zoom + delta * zoomStep), maxZoom);

  canvas.zoomToPoint(new Point(options.e.offsetX, options.e.offsetY), zoom);

  options.e.preventDefault();
  options.e.stopPropagation();
};
