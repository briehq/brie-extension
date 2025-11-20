import { safeStructuredClone } from '@extension/shared';
import { annotationsHistoryStorage, annotationsRedoStorage } from '@extension/storage';

import type { SaveOptions, ShapeSnapshot } from '@src/models';

export const saveHistory = async (
  id: string,
  snapshot: ShapeSnapshot,
  { clearRedo = true, max = 100 }: SaveOptions = {},
) => {
  const annotations = await annotationsHistoryStorage.getAnnotations(id);
  const history = annotations?.objects ?? [];

  history.push({ objects: safeStructuredClone(snapshot.objects) });

  if (history.length > max) history.shift();

  await annotationsHistoryStorage.setAnnotations(id, { objects: history });
  if (clearRedo) await annotationsRedoStorage.deleteAnnotations(id);
};

export const undoAnnotation = async (id: string) => {
  const annotations = await annotationsHistoryStorage.getAnnotations(id);
  const history = annotations?.objects ?? [];

  if (!history.length) return null;

  const redoAnnotations = await annotationsRedoStorage.getAnnotations(id);
  const redoStack = redoAnnotations?.objects ?? [];

  const currentState = history.pop()!;
  redoStack.push(currentState);

  const prevState = history.length ? history[history.length - 1] : { objects: [] };

  await annotationsHistoryStorage.setAnnotations(id, { objects: history });
  await annotationsRedoStorage.setAnnotations(id, { objects: redoStack });

  return prevState ? { prevState, fromHistory: true } : null;
};

export const redoAnnotation = async (id: string) => {
  const annotations = await annotationsRedoStorage.getAnnotations(id);
  const redoStack = annotations?.objects ?? [];
  if (!redoStack.length) return null;

  const historyAnnotations = await annotationsHistoryStorage.getAnnotations(id);
  const history = historyAnnotations?.objects ?? [];

  const restoredState = redoStack.pop()!;
  history.push(restoredState);

  await annotationsHistoryStorage.setAnnotations(id, { objects: history });
  await annotationsRedoStorage.setAnnotations(id, { objects: redoStack });

  return { restoredState, fromHistory: true };
};
