import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { useStorage } from '@extension/shared';
import type { Annotations } from '@extension/storage';
import { annotationsHistoryStorage, annotationsRedoStorage, annotationsStorage } from '@extension/storage';

type AnnotationMap = Record<string, Annotations>;

type AnnotationsContextValue = {
  annotations: AnnotationMap;
  historyAnnotations: AnnotationMap;
  redoAnnotations: AnnotationMap;
};

const AnnotationsContext = createContext<AnnotationsContextValue | null>(null);

export const AnnotationsProvider = ({ children }: PropsWithChildren) => {
  const annotations = useStorage(annotationsStorage);
  const historyAnnotations = useStorage(annotationsHistoryStorage);
  const redoAnnotations = useStorage(annotationsRedoStorage);

  const value = useMemo(
    () => ({ annotations, historyAnnotations, redoAnnotations }),
    [annotations, historyAnnotations, redoAnnotations],
  );

  return <AnnotationsContext.Provider value={value}>{children}</AnnotationsContext.Provider>;
};

export const useAnnotations = (): AnnotationsContextValue => {
  const ctx = useContext(AnnotationsContext);
  if (!ctx) throw new Error('useAnnotations must be used inside <AnnotationsProvider>.');
  return ctx;
};

export const useAnnotationActionAvailability = (id: string) => {
  const { annotations, historyAnnotations, redoAnnotations } = useAnnotations();

  return useMemo(() => {
    const canUndo = (historyAnnotations[id]?.objects?.length ?? 0) > 0;
    const canRedo = (redoAnnotations[id]?.objects?.length ?? 0) > 0;
    const canStartOver = (annotations[id]?.objects?.length ?? 0) > 0 || canRedo || canUndo;
    return { canUndo, canRedo, canStartOver };
  }, [id, annotations, historyAnnotations, redoAnnotations]);
};
