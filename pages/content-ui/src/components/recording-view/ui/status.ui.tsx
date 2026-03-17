import type { FC } from 'react';

import { capitalizeWord } from '@extension/shared';
import type { VideoRecordingState } from '@extension/storage';
import { cn } from '@extension/ui';

interface Props {
  state: VideoRecordingState;
}

export const RecordingStatusDot: FC<Props> = ({ state }) => (
  <div
    className={cn('size-4 rounded-full', {
      'animate-pulse bg-red-500 shadow-[0_0_8px_rgba(255,0,0,.9)]': state === 'capturing',
      'bg-amber-400': state === 'paused',
      'bg-muted-foreground': state === 'idle',
    })}
    aria-label={capitalizeWord(state)}
  />
);
