import { safeStructuredClone } from '@extension/shared';
import { annotationHistoryStorage, annotationsRedoStorage } from '@extension/storage';

export const saveHistory = async (id: string, canvasJson: any, { clearRedo = true, max = 100 } = {}) => {
  const history = (await annotationHistoryStorage.getAnnotations(id)) ?? [];

  history.push({ objects: safeStructuredClone(canvasJson.objects) });

  if (history.length > max) history.shift();

  await annotationHistoryStorage.setAnnotations(id, history);
  if (clearRedo) await annotationsRedoStorage.deleteAnnotations(id);
};

export const undoAnnotation = async (id: string) => {
  const history = (await annotationHistoryStorage.getAnnotations(id)) ?? [];
  if (!history.length) return null;

  const redoStack = (await annotationsRedoStorage.getAnnotations(id)) ?? [];

  const currentState = history.pop()!;
  redoStack.push(currentState);

  const prevState = history.length ? history[history.length - 1] : { objects: [] };

  await annotationHistoryStorage.setAnnotations(id, history);
  await annotationsRedoStorage.setAnnotations(id, redoStack);

  return prevState ? { prevState, fromHistory: true } : null;
};

export const redoAnnotation = async (id: string) => {
  const redoStack = (await annotationsRedoStorage.getAnnotations(id)) ?? [];
  if (!redoStack.length) return null;

  const history = (await annotationHistoryStorage.getAnnotations(id)) ?? [];

  const restoredState = redoStack.pop()!;
  history.push(restoredState);

  await annotationHistoryStorage.setAnnotations(id, history);
  await annotationsRedoStorage.setAnnotations(id, redoStack);

  return { restoredState, fromHistory: true };
};
