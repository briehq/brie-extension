import type { Canvas, FabricObject, PencilBrush } from 'fabric';
import { saveAs } from 'file-saver';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useStorage } from '@extension/shared';
import type { Screenshot } from '@extension/shared';
import {
  annotationsHistoryStorage,
  annotationsRedoStorage,
  annotationsStorage,
  captureStateStorage,
} from '@extension/storage';
import type { RootState } from '@extension/store';
import { clearCanvasState, useAppDispatch, useAppSelector } from '@extension/store';
import { Button, Icon } from '@extension/ui';

import { defaultNavElement } from '@src/constants';
import { useFitCanvasToParent } from '@src/hooks';
import type { ActiveElement, Attributes, BackgroundFitMeta, ShapeSnapshot } from '@src/models';
import { base64ToFile } from '@src/utils';
import { applyBrush, DRAWING_TOOLS, getShadowHostElement } from '@src/utils/annotation/canvas.util';

import { CanvasWrapper } from './canvas-wrapper.view';
import { Toolbar } from './ui';
import {
  handleCanvasMouseMove,
  handleCanvasMouseDown,
  handleCanvasMouseUp,
  handleCanvasObjectModified,
  handleCanvasObjectMoving,
  handleCanvasObjectScaling,
  handleCanvasSelectionCreated,
  handleDelete,
  handleKeyDown,
  handlePathCreated,
  handleResize,
  initializeFabric,
  redoAnnotation,
  undoAnnotation,
  setCanvasBackground,
  saveHistory,
  modifyShape,
  mergeScreenshot,
  hexToRgba,
} from '../../utils/annotation';

interface CanvasContainerProps {
  screenshot: Screenshot;
  onElement: (elem: ActiveElement) => void;
}

const CanvasContainerView = ({ screenshot, onElement }: CanvasContainerProps) => {
  const captureState = useStorage(captureStateStorage);
  const { lastAction, tick } = useAppSelector((state: RootState) => state.canvasReducer);
  const dispatch = useAppDispatch();

  const gridCellRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticChange = useRef(true);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });

  /**
   * useStorage is a hook provided by local store that allows you to store
   * data in a key-value store and automatically sync it with other users
   * i.e., subscribes to updates to that selected data
   *
   * Over here, we are storing the canvas objects in the key-value store.
   */

  /**
   * canvasRef is a reference to the canvas element that we'll use to initialize
   * the fabric canvas.
   *
   * fabricRef is a reference to the fabric canvas that we use to perform
   * operations on the canvas. It's a copy of the created canvas so we can use
   * it outside the canvas event listeners.
   */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);

  /**
   * isDrawing is a boolean that tells us if the user is drawing on the canvas.
   * We use this to determine if the user is drawing or not
   * i.e., if the freeform drawing mode is on or not.
   */
  const isDrawing = useRef(false);

  /**
   * shapeRef is a reference to the shape that the user is currently drawing.
   * We use this to update the shape's properties when the user is
   * drawing/creating shape
   */
  const shapeRef = useRef<FabricObject | null>(null);

  /**
   * selectedShapeRef is a reference to the shape that the user has selected.
   * For example, if the user has selected the rectangle shape, then this will
   * be set to "rectangle".
   *
   * We're using refs here because we want to access these variables inside the
   * event listeners. We don't want to lose the values of these variables when
   * the component re-renders. Refs help us with that.
   */
  const selectedShapeRef = useRef<string | null>(null);

  /**
   * activeObjectRef is a reference to the active/selected object in the canvas
   *
   * We want to keep track of the active object so that we can keep it in
   * selected form when user is editing the width, height, color etc
   * properties/attributes of the object.
   *
   * Since we're using live storage to sync shapes across users in real-time,
   * we have to re-render the canvas when the shapes are updated.
   * Due to this re-render, the selected shape is lost. We want to keep track
   * of the selected shape so that we can keep it selected when the
   * canvas re-renders.
   */
  const activeObjectRef = useRef<FabricObject | null>(null);
  const isEditingRef = useRef(false);

  /**
   * imageInputRef is a reference to the input element that we use to upload
   * an image to the canvas.
   *
   * We want image upload to happen when clicked on the image item from the
   * dropdown menu. So we're using this ref to trigger the click event on the
   * input element when the user clicks on the image item from the dropdown.
   */
  const imageInputRef = useRef<HTMLInputElement>(null);

  /**
   * activeElement is an object that contains the name, value and icon of the
   * active element in the navbar.
   */
  const [activeElement, setActiveElement] = useState<ActiveElement>(defaultNavElement);

  /**
   * elementAttributes is an object that contains the attributes of the selected
   * element in the canvas.
   *
   * We use this to update the attributes of the selected element when the user
   * is editing the width, height, color etc properties/attributes of the
   * object.
   */

  const [elementAttributes, setElementAttributes] = useState<Attributes>({
    width: '',
    height: '',
    fontSize: '',
    fontFamily: '',
    fontWeight: '',
    fill: '',
    stroke: '#ef4444',
  });
  const currentColorRef = useRef<string>('#ef4444');

  /**
   * useUndo and useRedo are hooks provided by local store that allow you to
   * undo and redo mutations.
   */
  const restoreObjects = async (canvas: any, snapshot?: { objects: any[] }) => {
    const { meta } = (await annotationsStorage.getAnnotations(screenshot.id!)) ?? {};

    if (!meta?.sizes?.fit) return;

    const {
      sizes: {
        fit: { height, width },
      },
    } = meta as BackgroundFitMeta;

    if (snapshot) canvas.loadFromJSON({ objects: snapshot.objects });

    await setCanvasBackground({
      file: screenshot.src,
      canvas,
      parentWidth: width,
      parentHeight: height,
    });
  };

  const undo = async () => {
    const history = await undoAnnotation(screenshot.id!);

    if (history?.prevState && fabricRef.current) {
      isProgrammaticChange.current = history.fromHistory;

      await restoreObjects(fabricRef.current, history.prevState);

      const canvasObjects = fabricRef.current.toJSON();

      await annotationsStorage.setAnnotations(screenshot.id!, { objects: canvasObjects.objects ?? [] });
    }
  };

  const redo = async () => {
    const history = await redoAnnotation(screenshot.id!);

    if (history?.restoredState && fabricRef.current) {
      isProgrammaticChange.current = history.fromHistory;

      await restoreObjects(fabricRef.current, history.restoredState);

      const canvasObjects = fabricRef.current.toJSON();

      await annotationsStorage.setAnnotations(screenshot.id!, { objects: canvasObjects.objects ?? [] });
    }
  };

  /**
   * deleteShapeFromStorage is a mutation that deletes a shape from the
   * key-value store of local store.
   * useMutation is a hook provided by local store that allows you to perform
   * mutations on local store data.
   *
   * We're using this mutation to delete a shape from the key-value store when
   * the user deletes a shape from the canvas.
   */
  const deleteShapeFromStorage = useCallback(
    async (shapeId: string) => {
      /**
       * canvasObjects is a Map that contains all the shapes in the key-value.
       * Like a store. We can create multiple stores in local store.
       */
      const { objects } = (await annotationsStorage.getAnnotations(screenshot.id!)) ?? {};
      if (!objects) return;

      const updatedAnnotations = objects.filter((a: any) => a.objectId !== shapeId);
      await annotationsStorage.setAnnotations(screenshot.id!, { objects: updatedAnnotations });

      if (fabricRef.current) {
        const canvasObjects = fabricRef.current.toJSON();

        await saveHistory(
          screenshot.id!,
          { objects: canvasObjects.objects },
          { clearRedo: isProgrammaticChange.current },
        );
      }
    },
    [screenshot?.id],
  );

  /**
   * deleteAllShapes is a mutation that deletes all the shapes from the
   * key-value store of local store.
   *
   * We're using this mutation to delete all the shapes from the key-value store
   * when the user clicks on the reset button.
   */
  const deleteAllShapes = useCallback(async () => {
    if (fabricRef.current) {
      const bg = fabricRef.current.backgroundImage;
      fabricRef.current.clear();
      fabricRef.current.backgroundImage = bg;
      fabricRef.current.renderAll();
    }

    await Promise.all([
      annotationsStorage.deleteAnnotations(screenshot.id!),
      annotationsRedoStorage.deleteAnnotations(screenshot.id!),
      annotationsHistoryStorage.deleteAnnotations(screenshot.id!),
    ]);
  }, [screenshot?.id]);

  /**
   * syncShapeInStorage is a mutation that syncs the shape in the key-value
   * store of local store.
   *
   * We're using this mutation to sync the shape in the key-value store
   * whenever user performs any action on the canvas such as drawing, moving
   * editing, deleting etc.
   */
  const syncShapeInStorage = useCallback(
    async (object: any) => {
      if (!object || !fabricRef.current) return;

      const { objectId, shapeType, blurRadius } = object;

      const shapeData = object.toJSON();
      const shape = { ...shapeData, objectId, shapeType, ...(blurRadius ? { blurRadius } : {}) };

      let { objects } = (await annotationsStorage.getAnnotations(screenshot.id!)) || {
        objects: [],
        meta: {} as BackgroundFitMeta,
      };

      const foundIndex = objects?.findIndex((x: any) => x.objectId === shape.objectId);

      if (foundIndex !== -1) {
        objects[foundIndex] = shape;
      } else {
        objects = [...objects, shape];
      }

      const shapeSnapshot: ShapeSnapshot = { objects: objects ?? [] };

      await annotationsStorage.setAnnotations(screenshot.id!, shapeSnapshot);

      if (fabricRef.current) {
        await saveHistory(screenshot.id!, shapeSnapshot, { clearRedo: isProgrammaticChange.current });
      }
    },
    [screenshot?.id],
  );

  /**
   * Set the active element in the navbar and perform the action based
   * on the selected element.
   *
   * @param elem
   */
  const handleActiveElement = (elem: ActiveElement) => {
    if (elem?.value === 'color-palette') {
      const highlighterColor = hexToRgba(elem?.payload?.color || elementAttributes.stroke, 0.45);

      currentColorRef.current = elem?.payload?.color || elementAttributes.stroke;

      if (fabricRef.current?.isDrawingMode) {
        (fabricRef.current.freeDrawingBrush as PencilBrush).color = highlighterColor;
      }

      setElementAttributes(prevAttributes => ({
        ...prevAttributes,
        stroke: highlighterColor,
      }));

      modifyShape({
        canvas: fabricRef.current!,
        property: 'stroke',
        value: highlighterColor,
        activeObjectRef,
        syncShapeInStorage,
      });

      return;
    }

    setActiveElement(elem);
    onElement(elem);

    switch (elem?.value) {
      case 'undo':
        undo();
        break;

      case 'redo':
        redo();
        break;

      // delete all the shapes from the canvas
      case 'start_over':
        // clear the storage
        deleteAllShapes();
        // clear the canvas
        fabricRef.current?.clear();
        // set "select" as the active element
        setActiveElement(defaultNavElement);
        break;

      // delete the selected shape from the canvas
      case 'delete':
        // delete it from the canvas
        handleDelete(fabricRef.current as any, deleteShapeFromStorage);
        // set "select" as the active element
        setActiveElement(defaultNavElement);
        break;

      // upload an image to the canvas
      case 'image':
        // trigger the click event on the input element which opens the file dialog
        imageInputRef.current?.click();
        /**
         * set drawing mode to false
         * If the user is drawing on the canvas, we want to stop the
         * drawing mode when clicked on the image item from the dropdown.
         */
        isDrawing.current = false;

        if (fabricRef.current) {
          // disable the drawing mode of canvas
          fabricRef.current.isDrawingMode = false;
        }
        break;

      default:
        if (fabricRef.current) {
          if (DRAWING_TOOLS.includes(elem?.value || '')) {
            isDrawing.current = true;
            fabricRef.current.isDrawingMode = true;

            applyBrush(elem.value, fabricRef.current, currentColorRef);
          } else {
            isDrawing.current = false;
            fabricRef.current.isDrawingMode = false;
          }
        }

        selectedShapeRef.current = elem?.value as string;

        break;
    }
  };

  useEffect(() => {
    if (!lastAction) return;

    switch (lastAction) {
      case 'UNDO':
        undo();
        break;
      case 'REDO':
        redo();
        break;
      case 'START_OVER':
        deleteAllShapes();
        break;
    }

    dispatch(clearCanvasState());
  }, [tick]);

  useEffect(() => {
    if (!screenshot?.id) {
      return;
    }

    const canvas = initializeFabric({
      canvasRef,
      fabricRef,
      backgroundImage: screenshot?.src,
    });

    const getSavedAnnotations = async () => {
      const annotations = await annotationsStorage.getAnnotations(screenshot.id!);

      if (annotations?.objects?.length) {
        await restoreObjects(canvas, annotations);
      } else {
        const meta = await setCanvasBackground({
          file: screenshot.src,
          canvas,
          parentWidth: canvas.getWidth(),
          parentHeight: canvas.getHeight(),
        });

        await annotationsStorage.setAnnotations(screenshot.id!, { objects: [], meta });
      }
    };

    getSavedAnnotations();

    /**
     * listen to the mouse down event on the canvas which is fired when the
     * user clicks on the canvas
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas.on('mouse:down', options => {
      handleCanvasMouseDown({
        options,
        canvas,
        selectedShapeRef,
        isDrawing,
        shapeRef,
        currentColorRef,
      });

      if (!options.target) {
        setActionMenuVisible(false);
      }
    });

    /**
     * listen to the mouse move event on the canvas which is fired when the
     * user moves the mouse on the canvas
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas.on('mouse:move', options => {
      handleCanvasMouseMove({
        options,
        canvas,
        isDrawing,
        selectedShapeRef,
        shapeRef,
        syncShapeInStorage,
      });
    });

    /**
     * listen to the mouse up event on the canvas which is fired when the
     * user releases the mouse on the canvas
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas.on('mouse:up', () => {
      handleCanvasMouseUp({
        canvas,
        isDrawing,
        shapeRef,
        activeObjectRef,
        selectedShapeRef,
        syncShapeInStorage,
        setActiveElement,
      });
    });

    /**
     * listen to the path created event on the canvas which is fired when
     * the user creates a path on the canvas using the freeform drawing
     * mode
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas.on('path:created', options => {
      handlePathCreated({
        options,
        syncShapeInStorage,
      });
    });

    /**
     * listen to the object modified event on the canvas which is fired
     * when the user modifies an object on the canvas. Basically, when the
     * user changes the width, height, color etc properties/attributes of
     * the object or moves the object on the canvas.
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas.on('object:modified', options => {
      handleCanvasObjectModified({
        options,
        syncShapeInStorage,
      });
    });

    /**
     * listen to the object moving event on the canvas which is fired
     * when the user moves an object on the canvas.
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas?.on('object:moving', options => {
      handleCanvasObjectMoving({
        options,
      });

      updateMenuPosition(options);
    });

    /**
     * listen to the selection created event on the canvas which is fired
     * when the user selects an object on the canvas.
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas.on('selection:created', options => {
      handleCanvasSelectionCreated({
        options,
        isEditingRef,
        setElementAttributes,
      });

      onChangeSelection(options);

      updateMenuPosition(options);
    });

    canvas.on('selection:updated', options => {
      onChangeSelection(options);

      updateMenuPosition(options);
    });

    canvas.on('selection:cleared', options => {
      setActionMenuVisible(false);
    });
    /**
     * listen to the scaling event on the canvas which is fired when the
     * user scales an object on the canvas.
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas.on('object:scaling', options => {
      handleCanvasObjectScaling({
        options,
        setElementAttributes,
      });

      updateMenuPosition(options);
    });

    canvas.on('object:rotating', options => {
      updateMenuPosition(options);
    });

    /**
     * listen to the mouse wheel event on the canvas which is fired when
     * the user scrolls the mouse wheel on the canvas.
     *
     * Event inspector: http://fabricjs.com/events
     * Event list: http://fabricjs.com/docs/fabric.Canvas.html#fire
     */
    canvas.on('mouse:wheel', () => {
      // handleCanvasZoom({
      //   options,
      //   canvas,
      // });
    });

    /**
     * listen to the resize event on the window which is fired when the
     * user resizes the window.
     *
     * We're using this to resize the canvas when the user resizes the
     * window.
     */
    window.addEventListener('resize', () => {
      handleResize({
        canvas: fabricRef.current,
        backgroundImage: screenshot?.src ?? null,
      });
    });

    /**
     * listen to the key down event on the shadow dom which is fired when the
     * user presses a key on the keyboard.
     *
     * We're using this to perform some actions like delete, copy, paste, etc when the user presses the respective keys on the keyboard.
     */
    const shadowHost = getShadowHostElement();
    const shadow = shadowHost?.shadowRoot;

    if (shadow) {
      shadow.addEventListener('keydown', e =>
        handleKeyDown({
          e,
          canvas: fabricRef.current,
          undo,
          redo,
          syncShapeInStorage,
          deleteShapeFromStorage,
        }),
      );
    }

    // dispose the canvas and remove the event listeners when the component unmounts
    return () => {
      /**
       * dispose is a method provided by Fabric that allows you to dispose
       * the canvas. It clears the canvas and removes all the event
       * listeners
       *
       * dispose: http://fabricjs.com/docs/fabric.Canvas.html#dispose
       */
      canvas.dispose();

      // remove the event listeners
      window.removeEventListener('resize', () => {
        handleResize({
          canvas: null,
          backgroundImage: null,
        });
      });

      if (shadow) {
        shadow.removeEventListener('keydown', e =>
          handleKeyDown({
            e,
            canvas: fabricRef.current,
            undo,
            redo,
            syncShapeInStorage,
            deleteShapeFromStorage,
          }),
        );
      }
    };
  }, [screenshot?.id]); // run this effect only once when the component mounts and the canvasRef changes

  useFitCanvasToParent(fabricRef.current, screenshot, gridCellRef.current);

  // Warn the user when they try to close or refresh the tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (captureState !== 'unsaved') return;

      e.preventDefault();
      e.returnValue = '';
    };

    const clearAnnotations = () => {
      annotationsStorage.clearAll();
      annotationsRedoStorage.clearAll();
      annotationsHistoryStorage.clearAll();
    };

    const handlePageHide = (e: PageTransitionEvent) => {
      if (!e.persisted) {
        clearAnnotations();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [captureState]);

  const updateMenuPosition = (options: any) => {
    const obj = options.selected ? options.selected[0] : fabricRef.current.getActiveObject();
    if (!obj) return;

    const { left, top, width, height } = obj.getBoundingRect(false, true);

    const vpt = fabricRef.current.viewportTransform!;
    const vx = vpt[0] * (left + width / 2) + vpt[4];
    const vy = vpt[3] * (top + height) + vpt[5];

    setMenuPosition({
      left: vx + 100,
      top: vy + 40,
    });
  };

  const onChangeSelection = useCallback((options: any) => {
    if (!options?.selected) {
      return;
    }

    setActionMenuVisible(true);
  }, []);

  const handleOnExportScreenshot = async (format: string = 'png') => {
    const { objects, meta } = (await annotationsStorage.getAnnotations(screenshot.id!)) ?? { objects: [], meta: {} };

    const fileName = `${screenshot.name}.${format}`;
    let file = null;

    if (!objects?.length) {
      file = await base64ToFile(screenshot.src, fileName);
    } else {
      const { width, height } = meta!.sizes!.natural;

      file = await mergeScreenshot({
        screenshot,
        objects,
        parentHeight: height,
        parentWidth: width,
      });
    }

    saveAs(file, fileName);
  };

  const handleOnRemove = () => {
    handleActiveElement({ value: 'delete' } as any);

    setActionMenuVisible(false);
  };

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div ref={gridCellRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <CanvasWrapper
          id={screenshot?.id || ''}
          canvasRef={canvasRef}
          onUndo={undo}
          onRedo={redo}
          onStartOver={deleteAllShapes}
          onExport={handleOnExportScreenshot}
        />
      </div>

      {actionMenuVisible && (
        <div id="actions-menu" className="absolute" style={{ left: menuPosition.left, top: menuPosition.top }}>
          <Button
            type="button"
            size="icon"
            className="size-7 hover:bg-slate-200"
            variant="secondary"
            onClick={handleOnRemove}>
            <Icon name="TrashIcon" className="size-4" />
          </Button>
        </div>
      )}

      <Toolbar
        activeElement={activeElement}
        onActiveElement={handleActiveElement}
        onExport={handleOnExportScreenshot}
      />
    </div>
  );
};

export default CanvasContainerView;
