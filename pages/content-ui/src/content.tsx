import { memo, useEffect, useMemo, useState } from 'react';

import { APP_BASE_URL } from '@extension/env';
import { t } from '@extension/i18n';
import type { Workspace } from '@extension/shared';
import { AuthMethod } from '@extension/shared';
import { useCreateSliceMutation, useGetUserDetailsQuery } from '@extension/store';
import { Dialog, DialogContent, cn, toast } from '@extension/ui';

import { CanvasContainerView } from './components/annotation-view';
import { Footer, Header, LeftSidebar, RightSidebar } from './components/annotation-view/ui';
import { useElementSize, useViewportSize } from './hooks';
import { base64ToFile, createJsonFile } from './utils';
import { getCanvasElement } from './utils/annotation';

const SM_BREAKPOINT = 640;
const MD_BREAKPOINT = 768;
const LG_BREAKPOINT = 1024;

const Content = ({
  screenshots,
  onClose,
  onMinimize,
}: {
  screenshots: { name: string; image: string }[];
  onClose: () => void;
  onMinimize: () => void;
}) => {
  const { width: viewportWidth } = useViewportSize();
  const { ref: canvasRef, width: canvasWidth, height: canvasHeight } = useElementSize<HTMLDivElement>();

  const [isFullScreen, setFullScreen] = useState(viewportWidth < SM_BREAKPOINT);
  const [showRightSection, setShowRightSection] = useState(true);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');

  const { isLoading, isError, data: user } = useGetUserDetailsQuery();
  const [createSlice] = useCreateSliceMutation();

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

  const getRecords = () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_RECORDS' }, response => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response?.records?.length) {
          resolve(response.records);
        } else {
          reject(new Error('No records captured.'));
        }
      });
    });
  };

  const handleOnCreate = async (paylaod: any) => {
    console.log('paylaod', paylaod);

    return;

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
          formData.append('workspaceId', workspaceId || workspace?.id);
        }

        if (description) {
          formData.append('description', description);
        }

        const canvas = getCanvasElement();

        if (!canvas) {
          toast.error(t('failedToCreateRecords'));
          return;
        }

        const secondaryScreenshot = screenshots.find(s => s.name === 'secondary');
        const primaryScreenshot = { image: canvas?.toDataURL('image/jpeg'), name: 'primary' };
        const screenshotFiles = [primaryScreenshot, secondaryScreenshot].map(({ name, image }) =>
          base64ToFile(image, name),
        );

        screenshotFiles.forEach(file => {
          formData.append(file.name, file);
        });

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
  const isDialogOpen = !!screenshots.length && window.location.host === 'example.com';

  const isLg = canvasWidth >= LG_BREAKPOINT;
  const isMd = canvasWidth >= MD_BREAKPOINT;
  const hasShots = screenshots.length > 0;

  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(() => hasShots && isLg);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(() => isMd || isLg);

  useEffect(() => {
    setLeftSidebarOpen(hasShots && isLg);

    setRightSidebarOpen(isMd || isLg);
  }, [isLg, hasShots, isMd]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={onClose} modal>
      <DialogContent
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
          onClose={onClose}
          onMinimize={onMinimize}
          onToggleFullScreen={() => setFullScreen(flag => !flag)}
          isFullScreen={isFullScreen}
          title="Credentials.pdf"
          onTitleChange={title => {
            // setTitle()
            console.log('title', title);
          }}
          onUndo={() => {
            console.log('onUndo');
          }}
          onRedo={() => {
            console.log('onRedo');
          }}
          onStartOver={() => {
            console.log('onStartOver');
          }}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onWorkspaceChange={setWorkspaceId}
          onCreate={handleOnCreate}
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
            open={isLeftSidebarOpen}
            onOpenChange={setLeftSidebarOpen}
            items={screenshots}
            onDeleteImage={id => {
              console.log('onDelete', id);
            }}
            onSelectImage={id => {
              console.log('onSelect', id);
            }}
          />

          <CanvasContainerView attachments={screenshots} />

          <RightSidebar
            defaultOpen
            canvasHeight={canvasHeight}
            open={isRightSidebarOpen}
            onOpenChange={setRightSidebarOpen}
            onDeleteImage={id => {
              console.log('onDelete', id);
            }}
            onSelectImage={id => {
              console.log('onSelect', id);
            }}
            onCreate={id => {
              console.log('onCreate', id);
            }}
          />
        </main>

        <Footer
          tool="Move"
          zoom={100}
          file="Credentials.pdf"
          onZoomChange={zoom => {
            console.log('zoom', zoom);
            // setZoom()
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

const arePropsEqual = (prevProps, nextProps) =>
  JSON.stringify(prevProps.screenshots[0].image) === JSON.stringify(nextProps.screenshots[0].image);

export default memo(Content, arePropsEqual);
