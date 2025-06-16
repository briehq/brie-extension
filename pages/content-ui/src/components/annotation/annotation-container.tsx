import type { Canvas, FabricObject } from 'fabric';
import { PencilBrush } from 'fabric';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { annotationsRedoStorage, annotationsStorage } from '@extension/storage';
import { Button, Icon, toast } from '@extension/ui';

import { defaultNavElement } from '@src/constants';
import type { ActiveElement, Attributes } from '@src/models';

import { AnnotationSection } from './annotation-section.feature';
import AnnotationSidebarFeature from './annotation-sidebar.feature';
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
  getCanvasElement,
  renderCanvas,
  setCanvasBackground,
  getShadowHostElement,
  saveHistory,
} from '../../utils/annotation';

// import { useCreateIssueMutation } from '@/store/issues';

const AnnotationContainer = ({ attachments }: { attachments: { name: string; image: string }[] }) => {
  /**
   * @todo
   * use client project id
   */
  const { id: projectId } = { id: uuidv4() };
  const isProgrammaticChange = useRef(true);
  const [nextIsLoading, setNextIsLoading] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [activeUpdateAction, setActiveUpdateAction] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    name: string;
    image: string;
  }>();

  const [originalImageDimensions, setOriginalImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // const [createIssue, { isLoading: isCreating }] = useCreateIssueMutation();

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
   * @todo
   * elementAttributes is an object that contains the attributes of the selected
   * element in the canvas.
   *
   * We use this to update the attributes of the selected element when the user
   * is editing the width, height, color etc properties/attributes of the
   * object.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [elementAttributes, setElementAttributes] = useState<Attributes>({
    width: '',
    height: '',
    fontSize: '',
    fontFamily: '',
    fontWeight: '',
    fill: '#aabbcc',
    stroke: '#aabbcc',
  });

  /**
   * useUndo and useRedo are hooks provided by local store that allow you to
   * undo and redo mutations.
   */
  const undo = async () => {
    const result = await undoAnnotation();

    if (result?.prevState && fabricRef.current) {
      isProgrammaticChange.current = result.fromhistory;

      fabricRef.current.loadFromJSON(result.prevState, async () => {
        fabricRef.current?.renderAll();
        const json = fabricRef.current?.toJSON();
        await annotationsStorage.setAnnotations(json?.objects || []);
      });
    }
  };

  const redo = async () => {
    const result = await redoAnnotation();

    if (result?.restoredState && fabricRef.current) {
      isProgrammaticChange.current = result.fromhistory;

      fabricRef.current.loadFromJSON(result.restoredState, async () => {
        fabricRef.current?.renderAll();
        const json = fabricRef.current?.toJSON();
        await annotationsStorage.setAnnotations(json?.objects || []);
      });
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
  const deleteShapeFromStorage = useCallback(async (shapeId: string) => {
    /**
     * canvasObjects is a Map that contains all the shapes in the key-value.
     * Like a store. We can create multiple stores in local store.
     */

    const annotations = await annotationsStorage.getAnnotations();
    if (!annotations) return;

    const updatedAnnotations = annotations.filter((a: any) => a.objectId !== shapeId);
    await annotationsStorage.setAnnotations(updatedAnnotations);

    if (fabricRef.current) {
      const json = fabricRef.current.toJSON();
      await saveHistory(json, isProgrammaticChange.current);
    }
  }, []);

  /**
   * deleteAllShapes is a mutation that deletes all the shapes from the
   * key-value store of local store.
   *
   * We're using this mutation to delete all the shapes from the key-value store when the user clicks on the reset button.
   */
  const deleteAllShapes = useCallback(async () => {
    // get the canvasObjects store
    const annotations = await annotationsStorage.getAnnotations();
    if (!annotations || annotations.length === 0) return true;
    await annotationsStorage.setAnnotations([]);
    if (fabricRef.current) {
      const json = fabricRef.current.toJSON();
      await saveHistory(json, isProgrammaticChange.current);
    }
    return true;
  }, []);

  /**
   * syncShapeInStorage is a mutation that syncs the shape in the key-value
   * store of local store.
   *
   * We're using this mutation to sync the shape in the key-value store
   * whenever user performs any action on the canvas such as drawing, moving
   * editing, deleting etc.
   */
  const syncShapeInStorage = useCallback(async (object: any) => {
    // if the passed object is null, return
    if (!object) return;

    const { objectId } = object;
    const shapeData = object.toJSON();
    const shape = { ...shapeData, objectId };

    let annotations = (await annotationsStorage.getAnnotations()) || [];
    const foundIndex = annotations.findIndex((x: any) => x.objectId === shape.objectId);
    if (foundIndex !== -1) {
      annotations[foundIndex] = shape;
    } else {
      annotations = [...annotations, shape];
    }

    await annotationsStorage.setAnnotations(annotations);

    if (fabricRef.current) {
      const json = fabricRef.current.toJSON();
      await saveHistory(json, isProgrammaticChange.current);
    }
    // setActiveUpdateAction(uuidv4());
  }, []);

  /**
   * Set the active element in the navbar and perform the action based
   * on the selected element.
   *
   * @param elem
   */
  const handleActiveElement = (elem: ActiveElement) => {
    setActiveElement(elem);

    switch (elem?.value) {
      case 'undo':
        undo();
        break;

      case 'redo':
        redo();
        break;

      // delete all the shapes from the canvas
      case 'reset':
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
          if (elem?.value === 'freeform') {
            isDrawing.current = true;
            fabricRef.current.isDrawingMode = true;
            const brush = new PencilBrush(fabricRef.current);
            brush.color = '#dc2626';
            brush.width = 3;
            fabricRef.current.freeDrawingBrush = brush;
          } else {
            isDrawing.current = false;
            fabricRef.current.isDrawingMode = false;
          }
        }

        // set the selected shape to the selected element
        selectedShapeRef.current = elem?.value as string;

        break;
    }
  };

  // After initializeFabric call
  const img = new Image();
  img.onload = () => {
    setOriginalImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };
  img.src = attachments[0].image;

  useEffect(() => {
    // initialize the fabric canvas

    if (!attachments?.length) {
      // Close annotation modal
      toast.error('No screenshots available. Please try capturing again!');
      return;
    }

    const backgroundImage = attachments?.length ? attachments[0].image : null;
    const canvas = initializeFabric({
      canvasRef,
      fabricRef,
      backgroundImage,
    });

    setSelectedImage(attachments[0] || null);

    // window.addEventListener('click', e => {
    //   const { target } = e;

    //   // Get the shadow host (the element that hosts the shadow DOM)
    //   const shadowHost = getCanvasElement();

    //   console.log('target', target);

    //   // Check if the clicked target is outside the canvas (with id #canvas) and not inside the shadow DOM
    //   if (target instanceof HTMLElement && !target.contains(shadowHost) && target.id !== 'canvas') {
    //     // Deselect the object if clicked outside
    //     canvas.discardActiveObject();
    //     canvas.renderAll();
    //   }
    // });

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
    });

    canvas.on('selection:updated', options => {
      onChangeSelection(options);
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
      });
    });

    /**
     * listen to the key down event on the window which is fired when the
     * user presses a key on the keyboard.
     *
     * We're using this to perform some actions like delete, copy, paste, etc when the user presses the respective keys on the keyboard.
     */
    window.addEventListener('keydown', e =>
      handleKeyDown({
        e,
        canvas: fabricRef.current,
        undo,
        redo,
        syncShapeInStorage,
        deleteShapeFromStorage,
      }),
    );

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
        });
      });

      window.removeEventListener('keydown', e =>
        handleKeyDown({
          e,
          canvas: fabricRef.current,
          undo,
          redo,
          syncShapeInStorage,
          deleteShapeFromStorage,
        }),
      );
    };
  }, [canvasRef]); // run this effect only once when the component mounts and the canvasRef changes

  // render the canvas when the canvasObjects from live storage changes
  useEffect(() => {
    const render = async () => {
      const annotations = await annotationsStorage.getAnnotations();

      renderCanvas({
        fabricRef,
        canvasObjects: annotations,
        activeObjectRef,
      });

      // Use original dimensions or a fixed width instead of current container width
      const maxWidth = canvasRef.current?.clientWidth;
      const backgroundWidth = originalImageDimensions?.width ?? maxWidth ?? 800; // Fallback to 800 if no dimensions are available

      setCanvasBackground({
        file: attachments[0]?.image,
        canvas: fabricRef?.current,
        minHeight: 500,
        maxWidth: backgroundWidth, // Use original width, not current container width
      });
    };

    render();
  }, [activeUpdateAction, originalImageDimensions]);

  useEffect(() => {
    const handleOnBeforeUnload = event => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    const handleOnUnload = () => {
      annotationsStorage.setAnnotations([]);
      annotationsRedoStorage.setAnnotations([]);
    };

    window.addEventListener('unload', handleOnUnload);
    window.addEventListener('beforeunload', handleOnBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleOnBeforeUnload);
      window.removeEventListener('beforeunload', handleOnUnload);
      handleOnUnload();
    };
  }, []);

  const onChangeSelection = useCallback((options: any) => {
    // if no element is selected, return
    if (!options?.selected) {
      return;
    }

    // Get the selected element
    const selectedElement: any = options?.selected[0] as FabricObject;

    const updateMenuPosition = () => {
      const { left, top, width, height } = selectedElement.getBoundingRect();

      const menuWidth = 28; // Default to 64 if undefined

      // Dynamically set the position of the action menu
      setMenuPosition({
        left: left + (width - menuWidth) + 41, // Center horizontally
        top: top + height + 40, // Align vertically below the shape
      });
    };

    selectedElement.set({
      padding: 10,
    });

    // Update menu position initially when the selection changes
    updateMenuPosition();

    // Attach an event listener to track movement of the selected shape
    selectedElement.on('moving', () => {
      updateMenuPosition();
    });

    // Attach an event listener to track resizing of the selected shape
    selectedElement.on('scaling', () => {
      updateMenuPosition();
    });

    // Attach an event listener to track rotation of the selected shape
    selectedElement.on('rotating', () => {
      updateMenuPosition();
    });

    setActionMenuVisible(true);
  }, []);

  const handleOnRemove = () => {
    handleActiveElement({ value: 'delete' } as any);

    setActionMenuVisible(false);
  };

  return (
    <div className="sm:px-4 lg:px-8">
      {/* 
        @todo: 
         - add download image button w/ annotations
         - add blur tool
      */}
      <AnnotationSection canvasRef={canvasRef} undo={undo} redo={redo} />
      {actionMenuVisible && (
        <div
          id="actions-menu"
          className="absolute"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
          }}>
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

      <AnnotationSidebarFeature activeElement={activeElement} onActiveElement={handleActiveElement} />
    </div>
  );
};

const arePropsEqual = (prevProps, nextProps) =>
  JSON.stringify(prevProps.attachments) === JSON.stringify(nextProps.attachments);

export default memo(AnnotationContainer, arePropsEqual);
