import type { Segment } from '@extension/shared';

export type AnnotationTool = 'none' | 'highlighter' | 'blur';

export interface HoverRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface BlurTarget {
  id: string;
  element: Element;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: 'console' | 'network';
  label: string;
  severity?: 'warn' | 'error';
}

export type VideoFormat = 'webm' | 'mp4';

export type TrimRange = { start: number; end: number };

export interface VideoExportOptions {
  format: VideoFormat;
  trim: TrimRange;
  filenameBase?: string;
  quality?: 'low' | 'medium' | 'high';
}

export interface VideoExportResult {
  blob: Blob;
  file: File;
  meta: {
    format: VideoFormat;
    mime: string;
    start: number;
    end: number;
    duration: number;
    sizeBytes: number;
  };
}

export interface VideoSource {
  blob: Blob;
  durationMs: number;
  startedAt: number;
  endedAt: number;
  segments: Segment[];
}

export interface Position {
  x: number;
  y: number;
}
