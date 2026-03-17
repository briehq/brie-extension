import type { FC } from 'react';
import { useCallback } from 'react';

import { t } from '@extension/i18n';
import { RECORDING, safePostMessage, useStorage } from '@extension/shared';
import { recordingSettingsStorage } from '@extension/storage';
import type { BaseStorage, RecordingSettings, VideoRecordingState } from '@extension/storage';
import { Button, Tooltip, TooltipContent, TooltipTrigger, Separator, Icon, cn } from '@extension/ui';

import { RecordingStatusDot } from './status.ui';
import { RecordingTimer } from './timer.ui';
import { useDraggableToolbar } from '../../../hooks';
import type { AnnotationTool } from '../../../models';

interface RecordingToolbarProps {
  state: VideoRecordingState;
  tool: AnnotationTool;
  onToolChange: (next: AnnotationTool) => void;
}

export const RecordingToolbar: FC<RecordingToolbarProps> = ({ state, tool, onToolChange }) => {
  const { ref: containerRef, styles: wrapperStyle, onDragAndDrop } = useDraggableToolbar();
  const { mic } = useStorage<BaseStorage<RecordingSettings>>(recordingSettingsStorage);

  const micEnabled = mic.enabled ?? false;
  const isPaused = state === 'paused';
  const isVisible = ['paused', 'capturing'].includes(state);
  const isHighlighter = tool === 'highlighter';
  const isBlur = tool === 'blur';

  const handleOnToggleTool = useCallback(
    (next: AnnotationTool) => {
      onToolChange(tool === next ? 'none' : next);
    },
    [onToolChange, tool],
  );

  const handleOnToggleMic = useCallback(async () => {
    safePostMessage(RECORDING.TOGGLE_MIC);
    await recordingSettingsStorage.setMicEnabled(!micEnabled);
  }, [micEnabled]);

  if (!isVisible) return null;

  return (
    <div style={wrapperStyle} data-brie-toolbar="true">
      <div
        ref={containerRef}
        className="border-border bg-background pointer-events-auto mx-auto mt-4 flex w-fit rounded-2xl border p-2 shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onPointerDown={onDragAndDrop}
            className="text-muted-foreground bg-accent hover:bg-accent mr-1 flex h-7 w-5 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing">
            <Icon name="GripVertical" className="h-3 w-3" />
          </button>

          <div className="flex items-center gap-1.5">
            <RecordingStatusDot state={state} />
            <RecordingTimer state={state} />
          </div>

          <Separator orientation="vertical" className="bg-border h-[20px]" />

          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="cursor-pointer shadow-none disabled:cursor-not-allowed"
                  onClick={() => {
                    handleOnToggleTool('none');
                    safePostMessage(isPaused ? RECORDING.RESUME : RECORDING.PAUSE);
                  }}>
                  <Icon name={isPaused ? 'Play' : 'Pause'} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{isPaused ? t('resumeRecording') : t('pauseRecording')}</TooltipContent>
            </Tooltip>

            {/* 
              @todo
              mic toggle is ready to be enabled later 
    
  
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full  text-muted-foreground hover:bg-slate-700"
                  onClick={handleOnToggleMic}>
                  {micEnabled ? (
                    <Icon name="Mic" className="size-4" />
                  ) : (
                    <Icon name="MicOff" className="size-4 text-red-400" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{micEnabled ? 'Mute mic' : 'Unmute mic'}</TooltipContent>
            </Tooltip>
         */}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="cursor-pointer shadow-none disabled:cursor-not-allowed"
                  onClick={() => {
                    handleOnToggleTool('none');
                    safePostMessage(RECORDING.STOP);
                  }}>
                  <Icon name="Square" className="size-4 text-red-500/50" fill="#f87171" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t('stopAndSave')}</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="bg-border h-[20px]" />

          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className={cn('cursor-pointer shadow-none disabled:cursor-not-allowed', {
                    'bg-destructive/10 disabled:opacity-100': isHighlighter,
                  })}
                  onClick={() => handleOnToggleTool('highlighter')}>
                  <Icon
                    name={!isHighlighter ? 'Highlighter' : 'X'}
                    className={cn('size-4', {
                      'text-red-500': isHighlighter,
                    })}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{isHighlighter ? t('exitDrawMode') : t('drawMode')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className={cn('cursor-pointer shadow-none disabled:cursor-not-allowed', {
                    'bg-destructive/10 disabled:opacity-100': isBlur,
                  })}
                  onClick={() => handleOnToggleTool('blur')}>
                  <Icon
                    name={!isBlur ? 'BlurIcon' : 'X'}
                    className={cn({
                      'size-4 text-red-500': isBlur,
                      'size-5': !isBlur,
                    })}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{isBlur ? t('exitBlurMode') : t('blurElement')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
