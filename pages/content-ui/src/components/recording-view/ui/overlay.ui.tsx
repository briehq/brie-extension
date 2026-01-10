import { useEffect, useState } from 'react';
import type { FC } from 'react';

import { useStorage } from '@extension/shared';
import type { BaseStorage, CaptureState, VideoRecordingState } from '@extension/storage';
import { captureStateStorage, captureTabStorage } from '@extension/storage';

import type { AnnotationTool } from '@src/models';
import { requestActiveTab } from '@src/utils/recording';

import { RecordingToolbar } from './toolbar.ui';
import { BlurLayer } from '../views/blur-layer.view';
import { HighlighterLayer } from '../views/highlighter-layer.view';

export const RecordingOverlay: FC = () => {
  const captureTabId = useStorage<BaseStorage<number | null>>(captureTabStorage);
  const { state, mode } = useStorage<BaseStorage<CaptureState>>(captureStateStorage);

  const [tool, setTool] = useState<AnnotationTool>('none');
  const [showToolbar, setShowToolbar] = useState(false);

  useEffect(() => {
    console.log(' state, mode ', { state, mode });

    if (state !== 'capturing' && mode !== 'video') return;

    const requestTab = async () => {
      const tab = await requestActiveTab();
      console.log('captureTabId === tab.id', captureTabId, tab.id, captureTabId === tab.id);

      setShowToolbar(!!(tab?.id && captureTabId === tab.id));
    };

    requestTab();
  }, [captureTabId, mode, state]);

  if (mode !== 'video') return null;
  if (['preparing', 'unsaved'].includes(state)) return null;
  if (!showToolbar) return null;

  return (
    <>
      <RecordingToolbar state={state as VideoRecordingState} tool={tool} onToolChange={setTool} />

      <BlurLayer active={tool === 'blur'} />
      <HighlighterLayer active={tool === 'highlighter'} />
    </>
  );
};
