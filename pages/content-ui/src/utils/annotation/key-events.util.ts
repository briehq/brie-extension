import { FabricObject, Canvas } from 'fabric';
import { util } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

import type { CustomFabricObject } from '@src/models';

export const handleCopy = (canvas: Canvas) => {
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length > 0) {
    // Serialize the selected objects
    const serializedObjects = activeObjects.map(obj => obj.toObject());
    // Store the serialized objects in the clipboard
    localStorage.setItem('clipboard', JSON.stringify(serializedObjects));
  }

  return activeObjects;
};

export const handlePaste = (canvas: Canvas, syncShapeInStorage: (shape: FabricObject) => void) => {
  if (!canvas || !(canvas instanceof Canvas)) {
    console.error('Invalid canvas object. Aborting paste operation.');
    return;
  }

  // Retrieve serialized objects from the clipboard
  const clipboardData = localStorage.getItem('clipboard');

  if (clipboardData) {
    try {
      const parsedObjects = JSON.parse(clipboardData);
      parsedObjects.forEach((objData: FabricObject) => {
        // convert the plain javascript objects retrieved from localStorage into fabricjs objects (deserialization)
        util.enlivenObjects<FabricObject>([objData]).then((enlivenedObjects: FabricObject[]) => {
          enlivenedObjects.forEach(enlivenedObj => {
            // Offset the pasted objects to avoid overlap with existing objects
            enlivenedObj.set({
              left: enlivenedObj.left || 0 + 20,
              top: enlivenedObj.top || 0 + 20,
              objectId: uuidv4(),
              fill: '#aabbcc',
            } as CustomFabricObject<any>);

            canvas.add(enlivenedObj);
            syncShapeInStorage(enlivenedObj);
          });
          canvas.renderAll();
        });
      });
    } catch (error) {
      console.error('Error parsing clipboard data:', error);
    }
  }
};

export const handleDelete = (canvas: Canvas, deleteShapeFromStorage: (id: string) => void) => {
  const activeObjects = canvas.getActiveObjects();

  if (!activeObjects || activeObjects.length === 0) {
    return;
  }

  if (activeObjects.length > 0) {
    activeObjects.forEach((obj: CustomFabricObject<any>) => {
      if (!obj.objectId) {
        return;
      }
      canvas.remove(obj);
      deleteShapeFromStorage(obj.objectId);
    });
  }

  canvas.discardActiveObject();
  canvas.requestRenderAll();
};

// create a handleKeyDown function that listen to different keydown events
export const handleKeyDown = ({
  e,
  canvas,
  undo,
  redo,
  syncShapeInStorage,
  deleteShapeFromStorage,
}: {
  e: KeyboardEvent;
  canvas: Canvas | any;
  undo: () => void;
  redo: () => void;
  syncShapeInStorage: (shape: FabricObject) => void;
  deleteShapeFromStorage: (id: string) => void;
}) => {
  /**
   * @todo
   * refactor to use switch ond no deprecations
   */

  // Check if the key pressed is ctrl/cmd + c (copy)
  if ((e?.ctrlKey || e?.metaKey) && e.keyCode === 67) {
    handleCopy(canvas);
  }
  // Check if the key pressed is ctrl/cmd + v (paste)
  if ((e?.ctrlKey || e?.metaKey) && e.keyCode === 86) {
    handlePaste(canvas, syncShapeInStorage);
  }

  // Check if the key pressed is delete/backspace (delete)
  // if (e.keyCode === 8 || e.keyCode === 46) {
  //   handleDelete(canvas, deleteShapeFromStorage);
  // }

  // check if the key pressed is ctrl/cmd + x (cut)
  if ((e?.ctrlKey || e?.metaKey) && e.keyCode === 88) {
    handleCopy(canvas);
    handleDelete(canvas, deleteShapeFromStorage);
  }

  if (e.metaKey || e.ctrlKey) {
    switch (e.code) {
      case 'KeyY': // redo, CMD+Y
        redo();
        break;
      case 'KeyZ':
        if (e.shiftKey) {
          // redo, CMD+SHIFT+Z
          redo();
        } else {
          // undo, CMD+Z
          undo();
        }
        break;
    }
  }

  if (e.keyCode === 191 && !e.shiftKey) {
    e.preventDefault();
  }
};
