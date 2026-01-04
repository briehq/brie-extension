import { useCallback } from 'react';

import { t } from '@extension/i18n';
import { getActiveTab, sendMessageToActiveTab, useStorage } from '@extension/shared';
import { captureStateStorage } from '@extension/storage';
import type { BaseStorage, CaptureState } from '@extension/storage';
import { cn, Icon, Label, RadioGroup, RadioGroupItem } from '@extension/ui';

import { MicToggleButton } from './ui';

type VideoCaptureType = 'tab' | 'desktop';

const captureVideoTypes: Array<{ name: string; slug: VideoCaptureType; icon: string }> = [
  {
    name: t('tab'),
    slug: 'tab',
    icon: 'AppWindow',
  },
  {
    name: t('desktop'),
    slug: 'desktop',
    icon: 'LaptopMinimal',
  },
];

export const CaptureVideoGroup: React.FC = () => {
  const { mode, state } = useStorage<BaseStorage<CaptureState>>(captureStateStorage);

  const isVideoRecording = mode === 'video' && state === 'recording';

  const sendRecordingCommand = useCallback(
    (
      type: 'START_RECORDING' | 'STOP_RECORDING' | 'PAUSE_RECORDING' | 'RESUME_RECORDING',
      captureType?: VideoCaptureType,
    ) => {
      const payload = captureType ? { captureType } : undefined;
      sendMessageToActiveTab(type, payload);
      window.close();
    },
    [],
  );

  const handleStart = useCallback(
    async (captureType: VideoCaptureType) => {
      const tab = await getActiveTab();
      if (!tab?.id) return;

      /**
       * @todo
       *
       * store the tab id to store, see screenshots
       */
      sendRecordingCommand('START_RECORDING', captureType);
    },
    [sendRecordingCommand],
  );

  const handleStop = useCallback(() => {
    sendRecordingCommand('STOP_RECORDING');
  }, [sendRecordingCommand]);

  return (
    <>
      <RadioGroup
        className={cn('border-muted grid w-full gap-4 rounded-xl border bg-slate-100/20 p-2', {
          'grid-cols-2': !isVideoRecording,
        })}>
        {isVideoRecording ? (
          <button
            type="button"
            className="hover:bg-accent flex w-full items-center justify-center rounded-md border border-transparent py-4"
            onClick={handleStop}>
            <Icon name="X" size={20} strokeWidth={1.5} className="mr-1" />
            <span>{t('exitCaptureScreenshot')}</span>
          </button>
        ) : (
          <>
            {captureVideoTypes.map(type => (
              <div key={type.slug}>
                <RadioGroupItem
                  value={type.slug}
                  id={type.slug}
                  className="peer sr-only"
                  onClick={() => handleStart(type.slug)}
                />
                <Label
                  htmlFor={type.slug}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground flex flex-col items-center justify-between rounded-md border border-transparent py-3 hover:cursor-pointer hover:border-slate-200 dark:border-0',
                  )}>
                  <Icon name={type.icon as any} className="mb-3 size-5" strokeWidth={type.slug === 'tab' ? 2 : 1.5} />
                  <span className="text-nowrap text-[11px]">{type.name}</span>
                </Label>
              </div>
            ))}
          </>
        )}
      </RadioGroup>

      {/* <MicToggleButton /> */}
    </>
  );
};
