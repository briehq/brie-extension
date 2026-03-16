/* eslint-disable jsx-a11y/media-has-caption */
import { useEffect, useRef } from 'react';

import { useVideoPlayback, useFitVideoToParent, useErrorEvents } from '@src/hooks';
import type { TrimRange, VideoFormat, VideoSource } from '@src/models';

import { PlaybackStrip } from './playback-strip.ui';

interface VideoPlayerProps {
  video: VideoSource;
  disableExport: boolean;
  onExport: (format: VideoFormat, trim: TrimRange) => void;
  onTrimUpdate: (trim: TrimRange, trimDuration: number) => void;
}

export const VideoPlayer = ({ video, disableExport, onExport, onTrimUpdate }: VideoPlayerProps) => {
  const videoPlayback = useVideoPlayback(video);
  const { events } = useErrorEvents();

  const parentRef = useRef<HTMLDivElement | null>(null);
  const videoEl = videoPlayback?.videoRef?.current ?? null;

  const fit = useFitVideoToParent(videoEl, parentRef.current);

  useEffect(() => {
    if (!video?.blob) return;

    onTrimUpdate(videoPlayback.api.trim, videoPlayback.api.trimDuration);
  }, [onTrimUpdate, video?.blob, videoPlayback.api.trim, videoPlayback.api.trimDuration]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div ref={parentRef} className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <div style={fit.ready ? { width: fit.width, height: fit.height } : undefined} className="relative">
          <video
            ref={videoPlayback.videoRef}
            src={videoPlayback.url}
            className="rounded-lg shadow-sm"
            playsInline
            preload="metadata"
            onError={() => console.warn('[video] error', videoPlayback?.videoRef.current?.error)}
          />
        </div>
      </div>

      <PlaybackStrip
        enableTrim
        showEventsMenu
        startedAt={video.startedAt}
        endedAt={video.endedAt}
        segments={video.segments}
        events={events}
        api={videoPlayback.api}
        disableExport={disableExport}
        onExport={format => onExport(format, videoPlayback.api.trim)}
      />
    </div>
  );
};
