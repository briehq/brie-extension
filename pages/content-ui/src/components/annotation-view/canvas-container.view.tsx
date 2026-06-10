import type { Canvas, FabricObject, PencilBrush } from 'fabric';
import { saveAs } from 'file-saver';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CANVAS_ACTION, REWIND, sendRuntimeMessageToActiveTab } from '@extension/shared';
import type { Screenshot } from '@extension/shared';
import { annotationsHistoryStorage, annotationsRedoStorage, annotationsStorage } from '@extension/storage';
import type { RootState } from '@extension/store';
import { clearCanvasState, useAppDispatch, useAppSelector } from '@extension/store';
import { Button, Icon } from '@extension/ui';

import { defaultNavElement } from '@src/constants';
import { useFitCanvasToParent } from '@src/hooks';
import type { ActiveElement, Attributes, BackgroundFitMeta, ShapeSnapshot } from '@src/models';
import { base64ToFile } from '@src/utils';
import { applyBrush, DRAWING_TOOLS, getShadowHostElement } from '@src/utils/annotation/canvas.util';
import { requestActiveTab } from '@src/utils/recording';

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
  captureState: 'idle' | 'preparing' | 'capturing' | 'paused' | 'error' | 'unsaved';
}

const CanvasContainerView = ({ screenshot, onElement, captureState }: CanvasContainerProps) => {
  const { lastAction, tick } = useAppSelector((state: RootState) => state.canvasReducer);
  const dispatch = useAppDispatch();

  const gridCellRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticChange = useRef(true);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const isDrawing = useRef(false);
  const shapeRef = useRef<FabricObject | null>(null);
  const selectedShapeRef = useRef<string | null>(null);
  const activeObjectRef = useRef<FabricObject | null>(null);
  const isEditingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [activeElement, setActiveElement] = useState<ActiveElement>(defaultNavElement);

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

  const restoreObjects = useCallback(
    async (canvas: any, snapshot?: { objects?: any[] }) => {
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
    },
    [screenshot?.id, screenshot?.src],
  );

  const undo = useCallback(async () => {
    const history = await undoAnnotation(screenshot.id!);

    if (history?.prevState && fabricRef.current) {
      isProgrammaticChange.current = history.fromHistory;

      await restoreObjects(fabricRef.current, history.prevState);

      const canvasObjects = fabricRef.current.toJSON();

      await annotationsStorage.setAnnotations(screenshot.id!, { objects: canvasObjects.objects ?? [] });
    }
  }, [screenshot?.id, restoreObjects]);

  const redo = useCallback(async () => {
    const history = await redoAnnotation(screenshot.id!);

    if (history?.restoredState && fabricRef.current) {
      isProgrammaticChange.current = history.fromHistory;

      await restoreObjects(fabricRef.current, history.restoredState);

      const canvasObjects = fabricRef.current.toJSON();

      await annotationsStorage.setAnnotations(screenshot.id!, { objects: canvasObjects.objects ?? [] });
    }
  }, [screenshot?.id, restoreObjects]);

  const deleteShapeFromStorage = useCallback(
    async (shapeId: string) => {
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

  const syncShapeInStorage = useCallback(
    async (object: any) => {
      if (!object || !fabricRef.current) return;

      const { objectId, shapeType, blurRadius } = object;

      const shapeData = object.toJSON();
      const shape = { ...shapeData, objectId, shapeType, ...(blurRadius ? { blurRadius } : {}) };

      let { objects = [] } = (await annotationsStorage.getAnnotations(screenshot.id!)) || {
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

  const handleActiveElement = useCallback(
    (elem: ActiveElement) => {
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

        case 'start_over':
          deleteAllShapes();
          fabricRef.current?.clear();
          setActiveElement(defaultNavElement);
          break;

        case 'delete':
          handleDelete(fabricRef.current as any, deleteShapeFromStorage);
          setActiveElement(defaultNavElement);
          break;

        case 'image':
          imageInputRef.current?.click();
          isDrawing.current = false;

          if (fabricRef.current) {
            fabricRef.current.isDrawingMode = false;
          }
          break;

        default:
          if (fabricRef.current) {
            if (elem && DRAWING_TOOLS.includes(elem.value)) {
              isDrawing.current = true;
              fabricRef.current.isDrawingMode = true;

              applyBrush(elem.value as 'freeform' | 'highlighter', fabricRef.current, currentColorRef);
            } else {
              isDrawing.current = false;
              fabricRef.current.isDrawingMode = false;
            }
          }

          selectedShapeRef.current = elem?.value as string;

          break;
      }
    },
    [elementAttributes.stroke, undo, redo, deleteAllShapes, deleteShapeFromStorage, syncShapeInStorage, onElement],
  );

  useEffect(() => {
    if (!lastAction) return;

    switch (lastAction) {
      case CANVAS_ACTION.UNDO:
        undo();
        break;
      case CANVAS_ACTION.REDO:
        redo();
        break;
      case CANVAS_ACTION.START_OVER:
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

    canvas.on('path:created', options => {
      handlePathCreated({
        options,
        syncShapeInStorage,
      });
    });

    canvas.on('object:modified', options => {
      handleCanvasObjectModified({
        options,
        syncShapeInStorage,
      });
    });

    canvas?.on('object:moving', options => {
      handleCanvasObjectMoving({
        options,
      });

      updateMenuPosition(options);
    });

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

    canvas.on('mouse:wheel', () => {});

    const onWindowResize = () => {
      handleResize({
        canvas: fabricRef.current,
        backgroundImage: screenshot?.src ?? null,
      });
    };
    window.addEventListener('resize', onWindowResize);

    const shadowHost = getShadowHostElement();
    const shadow = shadowHost?.shadowRoot;

    const onShadowKeyDown = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || !fabricRef.current) return;
      handleKeyDown({
        e,
        canvas: fabricRef.current,
        undo,
        redo,
        syncShapeInStorage,
        deleteShapeFromStorage,
      });
    };
    if (shadow) {
      shadow.addEventListener('keydown', onShadowKeyDown);
    }

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', onWindowResize);
      if (shadow) {
        shadow.removeEventListener('keydown', onShadowKeyDown);
      }
    };
  }, [screenshot?.id]);

  useFitCanvasToParent(fabricRef.current, screenshot, gridCellRef.current);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (captureState !== 'unsaved') return;

      e.preventDefault();
      e.returnValue = '';
    };

    const clearAnnotations = async () => {
      const tab = await requestActiveTab();

      if (tab?.id) {
        await sendRuntimeMessageToActiveTab({ type: REWIND.RESET_TAB, tabId: tab.id });
      }

      await Promise.all([
        annotationsStorage.clearAll(),
        annotationsRedoStorage.clearAll(),
        annotationsHistoryStorage.clearAll(),
      ]);
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
    if (!fabricRef.current) return;
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

  const handleOnExportScreenshot = useCallback(
    async (format: string = 'png') => {
      const { objects, meta } = (await annotationsStorage.getAnnotations(screenshot.id!)) ?? {};

      const fileName = `${screenshot.name}.${format}`;
      let file = null;

      const natural = meta?.sizes?.natural;
      if (!objects?.length || !natural) {
        file = await base64ToFile(screenshot.src, fileName);
      } else {
        file = await mergeScreenshot({
          screenshot,
          objects,
          parentHeight: natural.height,
          parentWidth: natural.width,
        });
      }

      saveAs(file, fileName);
    },
    [screenshot],
  );

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
            className="hover:bg-accent size-7"
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
