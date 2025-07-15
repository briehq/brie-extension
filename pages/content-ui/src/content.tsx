import { useEffect, useMemo, useState } from 'react';

import { APP_BASE_URL } from '@extension/env';
import { t } from '@extension/i18n';
import type { Screenshot, Workspace } from '@extension/shared';
import { AuthMethod } from '@extension/shared';
import { annotationsStorage } from '@extension/storage';
import { triggerCanvasAction, useAppDispatch, useCreateSliceMutation, useGetUserDetailsQuery } from '@extension/store';
import { Dialog, DialogContent, cn, toast } from '@extension/ui';

import { CanvasContainerView } from './components/annotation-view';
import { Footer, Header, LeftSidebar, RightSidebar } from './components/annotation-view/ui';
import { defaultNavElement } from './constants';
import { useElementSize, useViewportSize } from './hooks';
import type { ActiveElement } from './models';
import { base64ToFile, createJsonFile } from './utils';
import { mergeScreenshot } from './utils/annotation';

const SM_BREAKPOINT = 640;
const MD_BREAKPOINT = 768;
const LG_BREAKPOINT = 1024;

interface ContentProps {
  activeScreenshotId: string;
  screenshots: Screenshot[];
  onClose: () => void;
  onMinimize: () => void;
  onDeleteScreenshot: (id: string) => void;
  onSelectScreenshot(id: string): void;
}

const Content = ({
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

  const [isFullScreen, setFullScreen] = useState(viewportWidth < SM_BREAKPOINT);
  const [showRightSection, setShowRightSection] = useState(true);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [title, setTitle] = useState('Untitled report');
  const [workspaceId, setWorkspaceId] = useState('');
  const [activeElement, setActiveElement] = useState<ActiveElement>(defaultNavElement);
  const [createType, setCreateType] = useState();

  const { isLoading, isError, data: user } = useGetUserDetailsQuery();
  const [createSlice] = useCreateSliceMutation();

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

  const handleToggleRightSection = () => setShowRightSection(value => !value);

  const handleOnElement = (element: ActiveElement) => setActiveElement(element);
  const handleOnCreateType = (type: string) => setCreateType(type);

  const getRecords = () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_RECORDS' }, response => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        // if (response?.records?.length) {
        resolve(response.records);
        // }
        // else {
        //   reject(new Error('No records captured.'));
        // }
      });
    });
  };

  const handleOnCreate = async (payload: any) => {
    console.log('createType', createType);
    console.log('payload', payload);
    if (createType !== 'link') return;
    // return; // remove this

    setIsCreateLoading(true);

    try {
      const records: any = await getRecords();

      if (records?.length) {
        const jsonFile = createJsonFile(records.flat(), 'records.json');

        if (!jsonFile) {
          toast.error(t('failedToCreateRecords'));
          return;
        }

        const formData = new FormData();
        formData.append('records', jsonFile);

        if (workspaceId || workspace?.id) {
          formData.append('workspaceId', workspaceId ?? workspace?.id);
        }

        if (title) {
          formData.append('title', title);
        }

        Object.keys(payload).forEach((key: any) => {
          if ((payload as any)[key]) {
            if (key === 'attachments') {
              if ((payload as any)[key].length >= 1) {
                for (let i = 0; i < (payload as any)[key].length; i++) {
                  if (!(payload as any)[key][i]['id']) {
                    formData.append(key, (payload as any)[key][i]);
                  }
                }
              }
            } else if (key === 'labels') {
              formData.append(key, JSON.stringify((payload as any)[key]));
            } else {
              formData.append(key, (payload as any)[key]);
            }
          }
        });

        /**
         * @todo
         * use annotations store to sent them to BE and allow user to edit annotations
         * packs each screenshot annotation into one file annotations.json
         * add to a File object and drop into a FormData
         *
         * see: createAnnotationsJsonFile
         */
        for (const screenshot of screenshots) {
          const { objects, meta } = (await annotationsStorage.getAnnotations(screenshot.id!)) ?? {};

          let file = null;

          if (!meta?.height || !objects?.length) {
            file = await base64ToFile(screenshot.src, `${screenshot.name}.png`);
          } else {
            file = await mergeScreenshot({ screenshot, objects, parentHeight: meta.height, parentWidth: meta.width });
          }

          formData.append('screenshots', file);
          const previewUrl = URL.createObjectURL(file);

          const img = new Image();
          img.src = previewUrl;
          img.style.cssText = 'position:fixed;bottom:1rem;left:1rem;max-width:30%;border:2px solid lime;';
          document.body.appendChild(img);
        }

        const { data } = await createSlice(formData);

        if (data?.externalId) {
          toast(t('openReport'));

          const path = isGuest ? `s/${data?.externalId}` : `slices/${data?.id}`;

          const newWindow = window?.open(`${APP_BASE_URL}/${path}`, '_blank');
          newWindow?.focus();

          onClose();
        } else {
          // GUEST_DAILY_LIMIT and other errors
          toast.error(t(data?.message) || t('failedToCreateSlice'));
        }
      } else {
        toast.error(t('noRecordsCaptured'));
      }
    } catch (error) {
      console.error('[OnCreate Error]:', error);
      toast.error(t('unexpectedError'));
    } finally {
      setIsCreateLoading(false);
    }
  };

  const bg = chrome.runtime.getURL('content-ui/annotation-bg-light.png');
  const isDialogOpen = !!screenshots.length;
  const isLg = canvasWidth >= LG_BREAKPOINT;
  const isMd = canvasWidth >= MD_BREAKPOINT;
  const hasShots = screenshots.length > 1;

  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(() => hasShots && isLg);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(() => isMd || isLg);

  useEffect(() => {
    setLeftSidebarOpen(hasShots && isLg);

    setRightSidebarOpen(isMd || isLg);
  }, [isLg, hasShots, isMd]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={onClose} modal>
      <DialogContent
        aria-describedby="Annotation Modal"
        onEscapeKeyDown={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        className={cn('grid max-w-none grid-rows-[auto_minmax(0,1fr)_auto] !gap-0 bg-[#FAF9F7] bg-repeat p-0', {
          'size-full !rounded-none': isFullScreen,
          'h-[80vh] w-[90vw] !rounded-[18px]': !isFullScreen,
        })}
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 10,
        }}>
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
            onOpenChange={setLeftSidebarOpen}
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
            onOpenChange={setRightSidebarOpen}
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
