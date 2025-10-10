import type { FabricObject } from 'fabric';
import { Canvas, util } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

import type { CustomFabricObject, HandleKeyDownDeps } from '@src/models';

/**
 * Is the event target a native form field or contentEditable node?
 */
const isDomEditor = (el: EventTarget | null): el is HTMLElement =>
  !!el && (/^(INPUT|TEXTAREA|SELECT)$/i.test((el as HTMLElement).tagName) || (el as HTMLElement).isContentEditable);

/**
 * Returns `true` when a Fabric text object is currently being edited.
 */
const isFabricEditing = (canvas: Canvas): boolean => !!canvas.getActiveObject()?.isEditing;

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

/**
 * Handles editor keyboard shortcuts (copy / paste / cut / delete / undo / redo).
 *
 * **Shortcuts**
 * - ⌘/Ctrl + C : Copy selected object(s)
 * - ⌘/Ctrl + V : Paste
 * - ⌘/Ctrl + X : Cut (copy + delete)
 * - ⌘/Ctrl + Z : Undo
 * - ⌘/Ctrl + ⇧ + Z or ⌘/Ctrl + Y : Redo
 * - Delete / Backspace : Delete selection
 * - '/' (unshifted) : Prevent browser quick-find (optional)
 *
 * Skips handling when the focused element is a form field or contentEditable.
 *
 * @param {HandleKeyDownDeps} - Object containing the keyboard event, canvas, and action callbacks.
 */
export const handleKeyDown = ({
  e,
  canvas,
  undo,
  redo,
  syncShapeInStorage,
  deleteShapeFromStorage,
}: HandleKeyDownDeps) => {
  // Ignore when typing inside editable elements
  if (isDomEditor(e.target) || isFabricEditing(canvas)) return;

  const mod = e.metaKey || e.ctrlKey;
  const { code, key, shiftKey } = e;

  const doCopy = () => handleCopy(canvas);
  const doPaste = () => handlePaste(canvas, syncShapeInStorage);
  const doDelete = () => handleDelete(canvas, deleteShapeFromStorage);

  if (mod) {
    switch (code) {
      case 'KeyC':
        e.preventDefault();
        doCopy();
        return;

      case 'KeyV':
        e.preventDefault();
        doPaste();
        return;

      case 'KeyX':
        e.preventDefault();
        doCopy();
        doDelete();
        return;

      case 'KeyZ':
        e.preventDefault();
        if (shiftKey) {
          redo();
        } else {
          undo();
        }
        return;

      case 'KeyY':
        e.preventDefault();
        redo();
        return;
    }
  }

  switch (key) {
    case 'Delete':
    case 'Backspace':
      e.preventDefault();
      doDelete();
      return;

    case '/':
      if (!shiftKey) e.preventDefault();
      return;
  }
};
