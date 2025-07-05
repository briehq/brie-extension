import { safeStructuredClone } from '@extension/shared';
import { annotationHistoryStorage, annotationsRedoStorage } from '@extension/storage';

export const saveHistory = async (canvasJson: any, { clearRedo = true, max = 100 } = {}) => {
  const history = (await annotationHistoryStorage.getHistory()) ?? [];
  history.push({ objects: safeStructuredClone(canvasJson.objects) });

  if (history.length > max) history.shift();

  await annotationHistoryStorage.setHistory(history);
  if (clearRedo) await annotationsRedoStorage.setAnnotations([]);
};

export const undoAnnotation = async () => {
  const history = (await annotationHistoryStorage.getHistory()) ?? [];
  if (!history.length) return null;

  const redoStack = (await annotationsRedoStorage.getAnnotations()) ?? [];

  const currentState = history.pop()!;
  redoStack.push(currentState);

  const prevState = history.length ? history[history.length - 1] : { objects: [] };

  await annotationHistoryStorage.setHistory(history);
  await annotationsRedoStorage.setAnnotations(redoStack);

  return prevState ? { prevState, fromHistory: true } : null;
};

export const redoAnnotation = async () => {
  const redoStack = (await annotationsRedoStorage.getAnnotations()) ?? [];
  if (!redoStack.length) return null;

  const history = (await annotationHistoryStorage.getHistory()) ?? [];

  const restoredState = redoStack.pop()!;
  history.push(restoredState);

  await annotationHistoryStorage.setHistory(history);
  await annotationsRedoStorage.setAnnotations(redoStack);

  return { restoredState, fromHistory: true };
};
