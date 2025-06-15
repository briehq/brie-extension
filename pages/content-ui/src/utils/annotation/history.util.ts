import { annotationHistoryStorage, annotationsRedoStorage, annotationsStorage } from '@extension/storage';

export const saveHistory = async (canvasJson: any, shouldClearRedo: boolean) => {
  const history = (await annotationHistoryStorage.getHistory()) || [];
  history.push(canvasJson);
  await annotationHistoryStorage.setHistory(history);
  if (shouldClearRedo) {
    await annotationsRedoStorage.setAnnotations([]);
  }
};

export const undoAnnotation = async () => {
  const history = (await annotationHistoryStorage.getHistory()) || [];

  if (history.length > 1) {
    const redoStack = (await annotationsRedoStorage.getAnnotations()) || [];

    const currentState = history.pop();
    redoStack.push(currentState);

    const prevState = history[history.length - 1];

    await annotationHistoryStorage.setHistory(history);
    await annotationsRedoStorage.setAnnotations(redoStack);

    return { prevState, fromhistory: true }; // This is full canvas state
  }

  return null;
};

export const redoAnnotation = async () => {
  const redoStack = (await annotationsRedoStorage.getAnnotations()) || [];
  const history = (await annotationHistoryStorage.getHistory()) || [];

  if (redoStack.length > 0) {
    const restoredState = redoStack.pop();

    history.push(restoredState);

    await annotationHistoryStorage.setHistory(history);
    await annotationsRedoStorage.setAnnotations(redoStack);

    return { restoredState, fromhistory: true }; // This is full canvas state
  }

  return null;
};
