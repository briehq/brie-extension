import { useEffect, useMemo, useState } from 'react';

import { APP_BASE_URL } from '@extension/env';
import { t } from '@extension/i18n';
import type { Screenshot, Workspace, SlicePriority, LabelItem } from '@extension/shared';
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
import type { ActiveElement } from './models';
import { base64ToFile, createJsonFile } from './utils';
import { mergeScreenshot } from './utils/annotation';
import { runSliceCreationFlow } from './utils/slice';

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

  const getRecords = () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_RECORDS' }, response => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        resolve(response.records);
      });
    });
  };

  const handleOnCreate = async ({
    labels,
    priority,
    attachments,
    description,
    spaceId,
  }: {
    labels?: LabelItem[];
    priority: SlicePriority;
    attachments?: File[];
    description?: string;
    spaceId?: string;
  }) => {
    if (createType !== 'link' || isCreateLoading) return;

    setIsCreateLoading(true);

    try {
      const records: any = await getRecords();
      const recordsFile = createJsonFile(records.flat(), 'records.json');

      if (!recordsFile) {
        toast.error(t('failedToCreateRecords'));
        return;
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
      const shots: File[] = [];
      for (const screenshot of screenshots) {
        const { objects, meta } = (await annotationsStorage.getAnnotations(screenshot.id!)) ?? {
          objects: [],
          meta: {},
        };

        let file = null;

        if (!meta?.sizes?.natural?.height || !objects?.length) {
          file = await base64ToFile(screenshot.src, `${screenshot.name}`);
        } else {
          file = await mergeScreenshot({
            screenshot,
            objects,
            parentHeight: meta.sizes.natural.height,
            parentWidth: meta.sizes.natural.width,
          });
        }
        console.log('file', file);

        shots.push(file);
      }

      const attachedFiles = Array.isArray(attachments) ? attachments : Array.from(attachments ?? []);

      const { draft: slice, uploaded } = await runSliceCreationFlow({
        dispatch,
        onProgress: setProgress,
        idempotencyKey,
        payload: {
          priority,
          ...(title && { summary: title }),
          ...(description && { description }),
          ...(labels?.length && { labels }),
          ...(workspaceId && { workspaceId }),
          ...(spaceId && { spaceId }),
          screenshots: screenshots.map((f: Screenshot, idx: number) => ({ name: f.name, order: idx })),
          attachments: attachedFiles.map((f: File, idx: number) => ({ name: f.name, order: idx })),
          includeRecords: true,
          includeAnnotations: false,
        },
        files: {
          screenshots: shots,
          attachments: attachedFiles,
          records: recordsFile,
        },
      });

      if (slice?.externalId) {
        toast(t('openReport'));

        /**
         * @todo
         * update to READY slice?
         */

        const path = isGuest ? `s/${slice?.externalId}` : `slices/${slice?.id}`;

        const newWindow = window?.open(`${APP_BASE_URL}/${path}`, '_blank');
        newWindow?.focus();

        if (uploaded) {
          await updateSliceState({ id: slice.id, state: SliceState.READY });
        }

        onClose();
        setProgress(0);
      } else {
        // GUEST_DAILY_LIMIT and other errors
        toast.error(t(slice?.message) || t('failedToCreateSlice'));

        if (slice?.id) {
          await updateSliceState({ id: slice.id, state: SliceState.CANCELED });
        }
      }
    } catch (error) {
      /**
       * @todo
       * update to cancel slice?
       */
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
