import { useEffect, useMemo, useState } from 'react';

import { APP_BASE_URL } from '@extension/env';
import { t } from '@extension/i18n';
import type { Screenshot, Workspace, SlicePriority, LabelItem, InitSliceRequest } from '@extension/shared';
import { AuthMethod, SliceState } from '@extension/shared';
import { annotationsStorage } from '@extension/storage';
import {
  triggerCanvasAction,
  useAppDispatch,
  useGetUserDetailsQuery,
  useUpdateSliceStateMutation,
} from '@extension/store';
import { Dialog, DialogContent, Progress, cn, toast } from '@extension/ui';

import { CanvasContainerView } from './components/annotation-view';
import { Footer, Header, LeftSidebar, RightSidebar } from './components/annotation-view/ui';
import { defaultNavElement } from './constants';
import { useElementSize, useViewportSize } from './hooks';
import type { ActiveElement, HandleOnCreateArgs } from './models';
import { base64ToFile, createJsonFile } from './utils';
import { mergeScreenshot } from './utils/annotation';
import {
  buildRecordsFile,
  buildScreenshotsFiles,
  deleteRecords,
  getRecords,
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

  const [progress, setProgress] = useState(0);
  const [isFullScreen, setFullScreen] = useState(viewportWidth < SM_BREAKPOINT);
  const [showRightSection, setShowRightSection] = useState(true);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [title, setTitle] = useState('Untitled report');
  const [workspaceId, setWorkspaceId] = useState('');
  const [activeElement, setActiveElement] = useState<ActiveElement>(defaultNavElement);
  const [createType, setCreateType] = useState();

  const isLg = canvasWidth >= LG_BREAKPOINT;
  const isMd = canvasWidth >= MD_BREAKPOINT;
  const isSm = canvasWidth <= SM_BREAKPOINT;
  const hasShots = screenshots.length > 1;
  const isDialogOpen = !!screenshots.length;

  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(() => hasShots && isLg);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(() => isMd || isLg);

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

    try {
      const attachedFiles = toArray<File>(attachments);
      const [recordsFile, screenshotsFiles] = await Promise.all([
        buildRecordsFile(),
        buildScreenshotsFiles(screenshots),
      ]);

      if (!recordsFile) {
        toast.error(t('failedToCreateRecords'));
        return;
      }

      for (const file of [...screenshotsFiles, ...attachedFiles, recordsFile]) {
        const isOverSizeLimit = validateMaxFileSize(file);
        console.log('isValidSize', isOverSizeLimit, {
          name: file.name,
          size: file.size,
        });

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
          onMinimize={onMinimize}
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
          className={cn(
            'grid h-full min-h-0 gap-4 p-4 transition-[grid-template-columns] duration-300',
            isLeftSidebarOpen && isRightSidebarOpen
              ? 'grid-cols-[260px_minmax(0,1fr)_260px]'
              : isLeftSidebarOpen
                ? 'grid-cols-[260px_minmax(0,1fr)_1px]'
                : isRightSidebarOpen
                  ? 'grid-cols-[1px_minmax(0,1fr)_260px]'
                  : 'grid-cols-[1px_minmax(0,1fr)_1px]',
          )}>
          <LeftSidebar
            activeScreenshotId={activeScreenshotId!}
            canvasHeight={canvasHeight}
            open={isLeftSidebarOpen}
            onOpenChange={handleOnOpenSidebar('left')}
            screenshots={screenshots}
            onDelete={onDeleteScreenshot}
            onSelect={onSelectScreenshot}
          />

          <CanvasContainerView
            key={activeScreenshotId ?? 'empty'}
            screenshot={activeScreenshot!}
            onElement={handleOnElement}
          />

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
          tool={activeElement?.name}
          zoom={100}
          file={title}
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
