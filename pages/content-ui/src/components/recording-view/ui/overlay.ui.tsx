import { useState } from 'react';
import type { FC } from 'react';

import { useStorage } from '@extension/shared';
import type { BaseStorage, CaptureState, VideoRecordingState } from '@extension/storage';
import { captureStateStorage } from '@extension/storage';

import type { AnnotationTool } from '@src/models';

import { RecordingToolbar } from './toolbar.ui';
import { BlurLayer } from '../views/blur-layer.view';
import { HighlighterLayer } from '../views/highlighter-layer.view';

export const RecordingOverlay: FC = () => {
  const { state, mode } = useStorage<BaseStorage<CaptureState>>(captureStateStorage);
  const [tool, setTool] = useState<AnnotationTool>('none');

  if (mode !== 'video' || state === 'preparing') return null;

  return (
    <>
      <RecordingToolbar state={state as VideoRecordingState} tool={tool} onToolChange={setTool} />

      <BlurLayer active={tool === 'blur'} />
      <HighlighterLayer active={tool === 'highlighter'} />
    </>
  );
};
