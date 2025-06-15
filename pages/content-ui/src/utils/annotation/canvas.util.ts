import { fabric } from 'fabric';
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
  RenderCanvas,
} from '@src/models';

import { createSpecificShape, setCanvasBackground } from './shapes.util';

const rotateSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" strokeLinejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;

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

// initialize fabric canvas
export const initializeFabric = ({
  fabricRef,
  canvasRef,
  backgroundImage,
}: {
  fabricRef: RefObject<fabric.Canvas | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  backgroundImage: string;
}) => {
  // get canvas element
  const canvasElement = getCanvasElement();

  // Get the parent container dimensions
  const maxWidth = canvasElement?.clientWidth || 500;
  const maxHeight = 500; // Maximum height constraint

  // Create the Fabric.js canvas
  const canvas = new fabric.Canvas(canvasRef.current, {
    width: maxWidth,
    height: maxHeight, // Temporary height until background image is loaded
  });

  if (backgroundImage) {
    try {
      // Set the background image and adjust canvas dimensions
      setCanvasBackground({ file: backgroundImage, canvas, maxHeight, maxWidth });
    } catch (error) {
      console.error('Failed to set the background image:', error);
    }
  }

  fabric.Object.prototype.selectable = true;
  fabric.Object.prototype.objectCaching = false;

  // @todo: https://medium.com/@luizzappa/custom-icon-and-cursor-in-fabric-js-controls-4714ba0ac28f

  // Customize corner controls
  for (const control in fabric.Object.prototype.controls) {
    // eslint-disable-next-line no-prototype-builtins
    if (fabric.Object.prototype.controls.hasOwnProperty(control)) {
      const ctrl = fabric.Object.prototype.controls[control];
      // ctrl.cornerStyle = 'circle';
      (ctrl as any).cornerColor = 'blue';
      // ctrl.cornerStrokeColor = 'white';
      (ctrl as any).cornerSize = 9;
      // ctrl.visible = true; // Ensure controls are visible

      if (control === 'mtr') {
        // Custom rendering for the rotation control (circular shape)
        ctrl.render = function (ctx, left, top, styleOverride, fabricObject) {
          ctx.save();
          const size = 16; // Control size (default to 24 if undefined)
          const radius = size / 2; // Circular radius

          // Draw circular control with a white background and blue border
          ctx.fillStyle = 'white'; // Background color
          ctx.strokeStyle = '#1e40af'; // Border color
          ctx.lineWidth = 1; // Border width
          ctx.beginPath();
          ctx.arc(left, top, radius, 0, 2 * Math.PI, false); // Circular shape
          ctx.fill();
          ctx.stroke();

          // Draw the SVG image in the center of the circle
          const img = new Image();
          const imgSize = size - 6; // Adjust size to fit nicely within the control
          img.onload = function () {
            ctx.drawImage(img, left - imgSize / 2, top - imgSize / 2, imgSize, imgSize);
          };
          img.src = 'data:image/svg+xml;base64,' + window.btoa(rotateSvg);

          ctx.restore();
        };
      } else {
        // Custom rendering for the controls
        ctrl.render = function (ctx, left, top, styleOverride, fabricObject) {
          ctx.save();
          const size = (this as any).cornerSize; // Control size
          const radius = 2.5; // Radius for rounded corners

          // Draw background (white square with rounded corners)
          ctx.fillStyle = 'white'; // Background color
          ctx.beginPath();
          ctx.moveTo(left - size / 2 + radius, top - size / 2);
          ctx.lineTo(left + size / 2 - radius, top - size / 2);
          ctx.quadraticCurveTo(left + size / 2, top - size / 2, left + size / 2, top - size / 2 + radius);
          ctx.lineTo(left + size / 2, top + size / 2 - radius);
          ctx.quadraticCurveTo(left + size / 2, top + size / 2, left + size / 2 - radius, top + size / 2);
          ctx.lineTo(left - size / 2 + radius, top + size / 2);
          ctx.quadraticCurveTo(left - size / 2, top + size / 2, left - size / 2, top + size / 2 - radius);
          ctx.lineTo(left - size / 2, top - size / 2 + radius);
          ctx.quadraticCurveTo(left - size / 2, top - size / 2, left - size / 2 + radius, top - size / 2);
          ctx.closePath();
          ctx.fill();

          // Draw border (1px blue border)
          ctx.strokeStyle = '#1e40af'; // Border color
          ctx.lineWidth = 1; // Border width
          ctx.stroke(); // Draw border

          ctx.restore();
        };
      }
    }
  }

  fabric.Object.prototype.controls.mtr.x = 0;
  fabric.Object.prototype.controls.mtr.y = -0.5;
  fabric.Object.prototype.controls.mtr.offsetX = 0;
  fabric.Object.prototype.controls.mtr.offsetY = -25;
  fabric.Object.prototype.controls.mtr.withConnection = false;
  fabric.Object.prototype.controls.mtr.cursorStyle = 'grab';

  fabric.Object.prototype.borderColor = '#1e40af';
  // set canvas reference to fabricRef so we can use it later anywhere outside canvas listener
  fabricRef.current = canvas;

  return canvas;
};

// instantiate creation of custom fabric object/shape and add it to canvas
export const handleCanvasMouseDown = ({ options, canvas, selectedShapeRef, isDrawing, shapeRef }: CanvasMouseDown) => {
  // get pointer coordinates
  const pointer = canvas.getPointer(options.e);

  /**
   * get target object i.e., the object that is clicked
   * findtarget() returns the object that is clicked
   *
   * findTarget: http://fabricjs.com/docs/fabric.Canvas.html#findTarget
   */
  const target = canvas.findTarget(options.e, false);

  // set canvas drawing mode to false
  canvas.isDrawingMode = false;

  // if selected shape is freeform, set drawing mode to true and return
  if (selectedShapeRef.current === 'freeform') {
    isDrawing.current = true;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = 3;
    canvas.freeDrawingBrush.color = '#dc2626';
    return;
  }

  canvas.isDrawingMode = false;

  // if target is the selected shape or active selection, set isDrawing to false
  if (target && (target.type === selectedShapeRef.current || target.type === 'activeSelection')) {
    isDrawing.current = false;

    // set active object to target
    canvas.setActiveObject(target);

    /**
     * setCoords() is used to update the controls of the object
     * setCoords: http://fabricjs.com/docs/fabric.Object.html#setCoords
     */
    target.setCoords();
  } else {
    isDrawing.current = true;

    // create custom fabric object/shape and set it to shapeRef
    shapeRef.current = createSpecificShape(selectedShapeRef.current, pointer as any);

    // if shapeRef is not null, add it to canvas
    if (shapeRef.current) {
      // add: http://fabricjs.com/docs/fabric.Canvas.html#add
      canvas.add(shapeRef.current);
    }
  }
};

// handle mouse move event on canvas to draw shapes with different dimensions
export const handleCanvasMouseMove = ({
  options,
  canvas,
  isDrawing,
  selectedShapeRef,
  shapeRef,
  syncShapeInStorage,
}: CanvasMouseMove) => {
  // if selected shape is freeform, return
  if (!isDrawing.current) {
    return;
  }
  if (selectedShapeRef.current === 'freeform') {
    return;
  }

  canvas.isDrawingMode = false;

  // get pointer coordinates
  const pointer = canvas.getPointer(options.e);

  // depending on the selected shape, set the dimensions of the shape stored in shapeRef in previous step of handelCanvasMouseDown
  // calculate shape dimensions based on pointer coordinates
  switch (selectedShapeRef?.current) {
    case 'rectangle':
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

    case 'triangle':
      shapeRef.current?.set({
        width: pointer.x - (shapeRef.current?.left || 0),
        height: pointer.y - (shapeRef.current?.top || 0),
      });
      break;

    case 'line':
      shapeRef.current?.set({
        x2: pointer.x,
        y2: pointer.y,
      });
      break;

    case 'arrow':
      shapeRef.current?.set({
        width: pointer.x - (shapeRef.current?.left || 0),
        height: pointer.y - (shapeRef.current?.top || 0),
      });
      break;

    case 'image':
      shapeRef.current?.set({
        width: pointer.x - (shapeRef.current?.left || 0),
        height: pointer.y - (shapeRef.current?.top || 0),
      });
      break;

    default:
  }

  // render objects on canvas
  // renderAll: http://fabricjs.com/docs/fabric.Canvas.html#renderAll
  canvas.renderAll();

  // sync shape in storage
  if (shapeRef.current?.objectId) {
    syncShapeInStorage(shapeRef.current);
  }
};

// handle mouse up event on canvas to stop drawing shapes
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
  if (selectedShapeRef.current === 'freeform') {
    return;
  }

  // sync shape in storage as drawing is stopped
  syncShapeInStorage(shapeRef.current);

  // set everything to null
  shapeRef.current = null;
  activeObjectRef.current = null;
  selectedShapeRef.current = null;

  // if canvas is not in drawing mode, set active element to default nav element after 700ms
  if (!canvas.isDrawingMode) {
    setTimeout(() => {
      setActiveElement(defaultNavElement);
    }, 700);
  }
};

// update shape in storage when object is modified
export const handleCanvasObjectModified = ({ options, syncShapeInStorage }: CanvasObjectModified) => {
  const target = options.target;
  if (!target) {
    return;
  }

  if (target?.type === 'activeSelection') {
    // fix this
  } else {
    syncShapeInStorage(target);
  }
};

// update shape in storage when path is created when in freeform mode
export const handlePathCreated = ({ options, syncShapeInStorage }: CanvasPathCreated) => {
  // get path object
  const path = options.path;
  if (!path) {
    return;
  }

  // set unique id to path object
  path.set({
    objectId: uuid4(),
  });

  // sync shape in storage
  syncShapeInStorage(path);
};

// check how object is moving on canvas and restrict it to canvas boundaries
export const handleCanvasObjectMoving = ({ options }: { options: fabric.IEvent }) => {
  // get target object which is moving
  const target = options.target as fabric.Object;

  // target.canvas is the canvas on which the object is moving
  const canvas = target.canvas as fabric.Canvas;

  // set coordinates of target object
  target.setCoords();

  // restrict object to canvas boundaries (horizontal)
  if (target && target.left) {
    target.left = Math.max(
      0,
      Math.min(target.left, (canvas.width || 0) - (target.getScaledWidth() || target.width || 0)),
    );
  }

  // restrict object to canvas boundaries (vertical)
  if (target && target.top) {
    target.top = Math.max(
      0,
      Math.min(target.top, (canvas.height || 0) - (target.getScaledHeight() || target.height || 0)),
    );
  }
};

// set element attributes when element is selected
export const handleCanvasSelectionCreated = ({
  options,
  isEditingRef,
  setElementAttributes,
}: CanvasSelectionCreated) => {
  // if user is editing manually, return
  if (isEditingRef.current) {
    return;
  }

  // if no element is selected, return
  if (!options?.selected) {
    return;
  }

  // get the selected element
  const selectedElement: any = options?.selected[0] as fabric.Object;

  // if only one element is selected, set element attributes
  if (selectedElement && options.selected.length === 1) {
    // calculate scaled dimensions of the object
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

// update element attributes when element is scaled
export const handleCanvasObjectScaling = ({ options, setElementAttributes }: CanvasObjectScaling) => {
  const selectedElement: any = options.target;

  // calculate scaled dimensions of the object
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

// render canvas objects coming from storage on canvas
export const renderCanvas = ({ fabricRef, canvasObjects = [], activeObjectRef }: RenderCanvas) => {
  // clear canvas
  fabricRef.current?.clear();

  // render all objects on canvas
  canvasObjects.forEach((objectData: any) => {
    /**
     * enlivenObjects() is used to render objects on canvas.
     * It takes two arguments:
     * 1. objectData: object data to render on canvas
     * 2. callback: callback function to execute after rendering objects
     * on canvas
     *
     * enlivenObjects: http://fabricjs.com/docs/fabric.util.html#.enlivenObjectEnlivables
     */
    fabric.util.enlivenObjects(
      [objectData],
      (enlivenedObjects: fabric.Object[]) => {
        enlivenedObjects.forEach(enlivenedObj => {
          // if element is active, keep it in active state so that it can be edited further
          if (activeObjectRef.current?.objectId === objectData.objectId) {
            fabricRef.current?.setActiveObject(enlivenedObj);
          }

          // add object to canvas
          fabricRef.current?.add(enlivenedObj);
        });
      },
      /**
       * specify namespace of the object for fabric to render it on canvas
       * A namespace is a string that is used to identify the type of
       * object.
       *
       * Fabric Namespace: http://fabricjs.com/docs/fabric.html
       */
      'fabric',
    );
  });

  fabricRef.current?.renderAll();
};

// resize canvas dimensions on window resize
export const handleResize = ({ canvas }: { canvas: fabric.Canvas | null }) => {
  const canvasElement = getCanvasElement();
  if (!canvasElement) {
    return;
  }

  if (!canvas) {
    return;
  }

  canvas.setDimensions({
    width: canvasElement.clientWidth,
    height: canvasElement.clientHeight,
  });
};

// zoom canvas on mouse scroll
export const handleCanvasZoom = ({
  options,
  canvas,
}: {
  options: fabric.IEvent & { e: WheelEvent };
  canvas: fabric.Canvas;
}) => {
  const delta = options.e?.deltaY;
  let zoom = canvas.getZoom();

  // allow zooming to min 20% and max 100%
  const minZoom = 0.2;
  const maxZoom = 1;
  const zoomStep = 0.001;

  // calculate zoom based on mouse scroll wheel with min and max zoom
  zoom = Math.min(Math.max(minZoom, zoom + delta * zoomStep), maxZoom);

  // set zoom to canvas
  // zoomToPoint: http://fabricjs.com/docs/fabric.Canvas.html#zoomToPoint
  canvas.zoomToPoint({ x: options.e.offsetX, y: options.e.offsetY }, zoom);

  options.e.preventDefault();
  options.e.stopPropagation();
};
