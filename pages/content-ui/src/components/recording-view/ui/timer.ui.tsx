import type React from 'react';

import { formatDurationMs } from '@extension/shared';
import type { VideoRecordingState } from '@extension/storage';
import { Icon } from '@extension/ui';

import { useRecordingTimer } from '../../../hooks';

export const RecordingTimer: React.FC<{ state: VideoRecordingState }> = ({ state }) => {
  const { elapsedMs, maxMs } = useRecordingTimer(state);

  return (
    <div className="bg-accent text-primary flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs">
      <Icon name="Clock" className="text-muted-foreground size-3" strokeWidth={1.5} />
      <span className="whitespace-nowrap">
        {formatDurationMs(elapsedMs)} / {formatDurationMs(maxMs)}
      </span>
    </div>
  );
};
