import type { eventWithTime } from '@rrweb/types';
import { saveAs } from 'file-saver';
import { useEffect, useMemo, useState } from 'react';

import { APP_BASE_URL } from '@extension/env';
import { t } from '@extension/i18n';
import type { Screenshot, Workspace, InitSliceRequest } from '@extension/shared';
import { AuthMethod, SliceState } from '@extension/shared';
import {
  triggerCanvasAction,
  useAppDispatch,
  useGetUserDetailsQuery,
  useUpdateSliceStateMutation,
} from '@extension/store';
import { Dialog, DialogContent, Progress, cn, toast } from '@extension/ui';

import { CanvasContainerView } from './components/annotation-view';
import { Footer, Header, LeftSidebar, RightSidebar } from './components/annotation-view/ui';
import { VideoPlayer } from './components/recording-view/ui/video-player.ui';
import { RewindPlayer } from './components/recording-view/views/rewind-player.view';
import { defaultNavElement } from './constants';
import { useElementSize, useErrorEvents, useViewportSize } from './hooks';
import type { ActiveElement, HandleOnCreateArgs, TrimRange, VideoFormat, VideoSource } from './models';
import { buildEventsFile, exportRecordingVideo } from './utils/recording';
import {
  buildRecordsFile,
  buildScreenshotsFiles,
  deleteRecords,
  runSliceCreationFlow,
  safeOpenNewTab,
  toArray,
  validateMaxFileSize,
} from './utils/slice';

const SM_BREAKPOINT = 640;
const MD_BREAKPOINT = 768;
const LG_BREAKPOINT = 1024;

interface ContentProps {
  idempotencyKey: string;
  activeScreenshotId: string;
  screenshots: Screenshot[];
  video?: VideoSource;
  events?: eventWithTime[] | null;
  onClose: () => void;
  onMinimize: () => void;
  onDeleteScreenshot: (id: string) => void;
  onSelectScreenshot(id: string): void;
}

const bg = chrome.runtime.getURL('content-ui/annotation-bg-light.png');

const Content = ({
  idempotencyKey,
  screenshots = [],
  activeScreenshotId,
  video,
  events,
  onClose,
  onMinimize,
  onDeleteScreenshot,
  onSelectScreenshot,
}: ContentProps) => {
  const dispatch = useAppDispatch();
  const { width: viewportWidth } = useViewportSize();
  const { ref: canvasRef, width: canvasWidth, height: canvasHeight } = useElementSize<HTMLDivElement>();
  const { isLoading, isError, data: user } = useGetUserDetailsQuery();
  const [updateSliceState] = useUpdateSliceStateMutation();
  const { events: errorEvents } = useErrorEvents();

  const [progress, setProgress] = useState(0);
  const [isFullScreen, setFullScreen] = useState(viewportWidth < SM_BREAKPOINT);
  const [showRightSection, setShowRightSection] = useState(true);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [isVideoExporting, setIsVideoExporting] = useState(false);
  const [title, setTitle] = useState('Untitled report');
  const [workspaceId, setWorkspaceId] = useState('');
  const [activeElement, setActiveElement] = useState<ActiveElement>(defaultNavElement);
  const [createType, setCreateType] = useState('');
  const [trimDuration, setTrimDuration] = useState(0);
  const [trim, setTrim] = useState<TrimRange>();
  const [rrwebTrim, setRrwebTrim] = useState<TrimRange | null>(null);

  const isLg = canvasWidth >= LG_BREAKPOINT;
  const isMd = canvasWidth >= MD_BREAKPOINT;
  const isSm = canvasWidth <= SM_BREAKPOINT;
  const hasShots = screenshots.length > 1;
  const isDialogOpen = !!screenshots.length || !!video?.blob || !!events?.length;

  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(() => hasShots && isLg);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(() => isMd || isLg);

  const leftVisible = activeScreenshotId && isLeftSidebarOpen;
  const rightVisible = isRightSidebarOpen;

  const activeScreenshot = useMemo(
    () => screenshots.find(s => s.id === activeScreenshotId),
    [activeScreenshotId, screenshots],
  );

  const workspace = useMemo(
    () => user?.organization?.workspaces?.find((workspace: Workspace) => workspace.isDefault && !workspace.deletedAt),
    [user?.organization?.workspaces],
  );

  const isGuest = useMemo(() => user?.authMethod === AuthMethod.GUEST, [user?.authMethod]);

  const showRightSidebar = useMemo(() => {
    if (user?.authMethod === AuthMethod.GUEST) return false;

    return showRightSection;
  }, [showRightSection, user?.authMethod]);

  const gridCols = useMemo(() => {
    if (!activeScreenshotId) {
      return rightVisible ? 'grid-cols-[minmax(0,1fr)_260px]' : 'grid-cols-[minmax(0,1fr)]';
    }

    if (leftVisible && rightVisible) {
      return 'grid-cols-[260px_minmax(0,1fr)_260px]';
    }

    if (leftVisible) {
      return 'grid-cols-[260px_minmax(0,1fr)_1px]';
    }

    if (rightVisible) {
      return 'grid-cols-[1px_minmax(0,1fr)_260px]';
    }

    return 'grid-cols-[minmax(0,1fr)]';
  }, [activeScreenshotId, leftVisible, rightVisible]);

  useEffect(() => {
    setLeftSidebarOpen(hasShots && isLg);

    setRightSidebarOpen(isMd || isLg);
  }, [isLg, hasShots, isMd]);

  const handleToggleRightSection = () => setShowRightSection(value => !value);

  const handleOnElement = (element: ActiveElement) => setActiveElement(element);
  const handleOnCreateType = (type: string) => setCreateType(type);

  const finalizeCreation = async (sliceId?: string, uploaded?: boolean) => {
    if (!sliceId) return;

    try {
      if (uploaded) {
        await updateSliceState({ id: sliceId, state: SliceState.READY });
      }
    } catch (e) {
      await updateSliceState({ id: sliceId, state: SliceState.FAILED });

      console.warn('[create] finalize READY update failed:', e);
    } finally {
      try {
        await deleteRecords();
      } catch {
        //
      }
      onClose?.();
      setProgress(0);
    }
  };

  const handleOnCreate = async ({ labels, priority, attachments, description, spaceId }: HandleOnCreateArgs) => {
    if (createType !== 'link' || isCreateLoading) return;

    setIsCreateLoading(true);

    let recordedVideoFile = null;
    let eventsFile = null;
    try {
      if (video?.blob && trim) {
        const { file } = await prepareRecordedVideo({ video, format: 'webm', trim });

        recordedVideoFile = file;
      }

      if (events?.length) {
        eventsFile = await buildEventsFile({ events, range: rrwebTrim });

        console.log('events---', events);
      }

      const attachedFiles = toArray<File>(attachments);
      const [recordsFile, screenshotsFiles] = await Promise.all([
        buildRecordsFile(),
        buildScreenshotsFiles(screenshots),
      ]);

      if (!recordsFile) {
        toast.error(t('failedToCreateRecords'));
        return;
      }

      for (const file of [...screenshotsFiles, ...attachedFiles]) {
        const isOverSizeLimit = validateMaxFileSize(file);

        if (isOverSizeLimit) {
          toast.error(t('fileTooLarge', file.name));

          return;
        }
      }

      /**
       * @todo
       * use annotations store to sent them to BE and allow user to edit annotations
       * packs each screenshot annotation into one file annotations.json
       * add to a File object and drop into a FormData
       *
       * Idea: use BullMQ, RabbitMQ, etc.
       * Worker does heavy stuff (merge annotations, generate image, etc).
       *
       * see: createAnnotationsJsonFile
       */
      const payload = {
        priority,
        ...(title ? { summary: title } : {}),
        ...(description ? { description } : {}),
        ...(labels?.length ? { labels } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        ...(spaceId ? { spaceId } : {}),
        screenshots: screenshots.map((f: Screenshot, idx: number) => ({ name: f.name, order: idx })),
        attachments: attachedFiles.map((f: File, idx: number) => ({ name: f.name, order: idx })),
        includeRecords: true,
        includeVideo: !!recordedVideoFile,
        includeEvents: !!eventsFile,
        includeAnnotations: false,
      } as InitSliceRequest;

      const { draft: slice, uploaded } = await runSliceCreationFlow({
        dispatch,
        onProgress: setProgress,
        idempotencyKey,
        payload,
        files: {
          screenshots: screenshotsFiles,
          attachments: attachedFiles,
          records: recordsFile,
          ...(recordedVideoFile ? { video: recordedVideoFile } : {}),
          ...(eventsFile ? { events: eventsFile } : {}),
        },
      });

      if (slice?.externalId || slice?.id) {
        toast(t('openReport'));
        const path = isGuest ? `s/${slice.externalId}` : `slices/${slice.id}`;

        safeOpenNewTab(`${APP_BASE_URL}/${path}`);

        await finalizeCreation(slice?.id, uploaded);

        return;
      }

      // Server returned a draft with an error code (eg: GUEST_DAILY_LIMIT)
      toast.error(t(slice?.message) || t('failedToCreateSlice'));

      if (slice?.id) {
        await updateSliceState({ id: slice.id, state: SliceState.CANCELED });
      }
    } catch (error: any) {
      console.error('[OnCreate Error]:', error);
      toast.error(t('unexpectedError'));
    } finally {
      setIsCreateLoading(false);
    }
  };

  const handleOnOpenSidebar = (side: 'left' | 'right') => (open: boolean) => {
    if (isSm && open) {
      if (side === 'left') setRightSidebarOpen(false);
      else setLeftSidebarOpen(false);
    }

    if (side === 'left') setLeftSidebarOpen(open);
    else setRightSidebarOpen(open);
  };

  const prepareRecordedVideo = async ({
    video,
    format,
    trim,
  }: {
    video: VideoSource;
    format: VideoFormat;
    trim: TrimRange;
  }) => {
    if (!video?.blob || !video?.durationMs || !trim) {
      throw new Error('Video duration is not ready yet.');
    }

    return await exportRecordingVideo(video.blob, video.durationMs, {
      format,
      trim,
    });
  };

  const handleOnVideoExport = async (format: VideoFormat = 'webm', trim: TrimRange) => {
    if (!video?.blob) return;

    setIsVideoExporting(true);
    const url = window.location.hostname.replace(/[:.]/g, '-');
    const now = Date.now();
    const outName = `${url}-${now}.${format}`;

    try {
      const { blob } = await prepareRecordedVideo({ video, format, trim });

      saveAs(blob, outName);
    } catch (e) {
      console.log('[ffmpeg] Failed to export video');
    } finally {
      setIsVideoExporting(false);
    }
  };

  const handleOnTrimUpdate = (trim: TrimRange, trimDuration: number) => {
    setTrim(trim);
    setTrimDuration(trimDuration);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={onClose} modal>
      <DialogContent
        aria-describedby="Annotation View"
        onEscapeKeyDown={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        className={cn(
          'grid max-w-none grid-rows-[auto_minmax(0,1fr)_auto] !gap-0 border-none bg-[#FAF9F7] bg-repeat p-0',
          {
            'size-full !rounded-none': isFullScreen,
            'h-[80vh] w-[90vw] overflow-hidden !rounded-[18px]': !isFullScreen,
          },
        )}
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 10,
        }}>
        {progress > 0 && <Progress className="absolute left-0 top-0 h-1.5 w-full" value={progress} />}

        <Header
          id={activeScreenshotId || ''}
          onClose={onClose}
          onMinimize={activeScreenshotId ? onMinimize : undefined}
          onToggleFullScreen={() => setFullScreen(flag => !flag)}
          isFullScreen={isFullScreen}
          title={title}
          onTitleChange={setTitle}
          onUndo={() => {
            dispatch(triggerCanvasAction('UNDO'));
          }}
          onRedo={() => {
            dispatch(triggerCanvasAction('REDO'));
          }}
          onStartOver={() => {
            dispatch(triggerCanvasAction('START_OVER'));
          }}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onWorkspaceChange={setWorkspaceId}
          onCreate={handleOnCreateType}
          isCreateLoading={isCreateLoading}
        />

        <main
          ref={canvasRef}
          className={cn('grid h-full min-h-0 gap-4 p-4 transition-[grid-template-columns] duration-300', gridCols)}>
          {!!activeScreenshotId && (
            <LeftSidebar
              activeScreenshotId={activeScreenshotId}
              canvasHeight={canvasHeight}
              open={isLeftSidebarOpen}
              onOpenChange={handleOnOpenSidebar('left')}
              screenshots={screenshots}
              onDelete={onDeleteScreenshot}
              onSelect={onSelectScreenshot}
            />
          )}

          {video?.blob ? (
            <VideoPlayer
              video={video}
              disableExport={isVideoExporting}
              onExport={handleOnVideoExport}
              onTrimUpdate={handleOnTrimUpdate}
            />
          ) : events?.length ? (
            <RewindPlayer
              events={events}
              errorEvents={errorEvents}
              onTrimChange={setRrwebTrim}
              enableTrim
              showEventsMenu
            />
          ) : (
            <CanvasContainerView
              key={activeScreenshotId ?? 'empty'}
              screenshot={activeScreenshot!}
              onElement={handleOnElement}
            />
          )}

          <RightSidebar
            defaultOpen
            workspaceId={workspaceId}
            canvasHeight={canvasHeight}
            open={isRightSidebarOpen}
            onOpenChange={handleOnOpenSidebar('right')}
            onCreate={handleOnCreate}
          />
        </main>

        <Footer
          tool={video?.blob ? 'Trim' : activeElement?.name}
          zoom={100}
          file={title}
          duration={trimDuration}
          trim={trim}
          onZoomChange={zoom => {
            /**
             * @todo
             * implement zoon feature: min: 100% and max: 100%
             */
            console.log('zoom', zoom);
            // setZoom()
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default Content;
