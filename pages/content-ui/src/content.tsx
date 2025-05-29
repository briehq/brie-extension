import { memo, useMemo, useState } from 'react';

import { t } from '@extension/i18n';
import { AuthMethod } from '@extension/shared';
import { CEB_APP_BASE_URL } from '@extension/env';
import { useCreateSliceMutation, useGetUserDetailsQuery } from '@extension/store';
import { Button, DialogLegacy, Icon, Textarea, Tooltip, TooltipContent, TooltipTrigger, useToast } from '@extension/ui';

import AnnotationContainer from './components/annotation/annotation-container';
import { useViewportSize } from './hooks';
import { base64ToFile, createJsonFile } from './utils';
import { getCanvasElement } from './utils/annotation';

const Content = ({ screenshots, onClose }: { onClose: () => void; screenshots: { name: string; image: string }[] }) => {
  const { toast } = useToast();
  const { width } = useViewportSize();

  const [isMaximized, setIsMaximized] = useState(false);
  const [showRightSection, setShowRightSection] = useState(true);
  const [isCreateLoading, setIsCreateLoading] = useState(false);

  const { isLoading, isError, data: user } = useGetUserDetailsQuery();
  const [createSlice] = useCreateSliceMutation();

  const showRightSidebar = useMemo(() => {
    if (user?.authMethod === AuthMethod.GUEST) return false;

    return showRightSection;
  }, [showRightSection, user?.authMethod]);

  const handleToggleMaximize = () => setIsMaximized(!isMaximized);

  const handleToggleRightSection = () => setShowRightSection(!showRightSection);

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

  const handleOnCreate = async () => {
    setIsCreateLoading(true);

    try {
      const records: any = await getRecords();

      if (records?.length) {
        const jsonFile = createJsonFile(records.flat(), 'records.json');

        if (!jsonFile) {
          toast({ variant: 'destructive', description: t('failedToCreateRecords') });
          return;
        }

        const formData = new FormData();
        formData.append('records', jsonFile);

        const canvas = getCanvasElement();

        if (!canvas) {
          toast({ variant: 'destructive', description: t('failedToCreateRecords') });
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
          toast({ description: t('openReport') });

          /**
           * @todo move to env
           */
          setTimeout(() => {
            window?.open(`${CEB_APP_BASE_URL}/s/${data?.externalId}`, '_blank')?.focus();
          }, 1000);

          onClose();
        } else {
          // GUEST_DAILY_LIMIT and other errors
          toast({ variant: 'destructive', description: t(data?.message) || t('failedToCreateSlice') });
        }
      } else {
        toast({ variant: 'destructive', description: t('noRecordsCaptured') });
      }
    } catch (error) {
      console.error('[OnCreate Error]:', error);
      toast({ variant: 'destructive', description: t('unexpectedError') });
    } finally {
      setIsCreateLoading(false);
    }
  };

  return (
    <DialogLegacy
      isMaximized={isMaximized}
      onClose={onClose}
      actions={
        <>
          <Button size="icon" variant="secondary" onClick={handleToggleMaximize} type="button" className="size-6">
            {isMaximized ? (
              <Icon name="Minimize2Icon" className="size-3" strokeWidth="1.5" />
            ) : (
              <Icon name="Maximize2Icon" className="size-3" strokeWidth="1.5" />
            )}
          </Button>

          {user?.authMethod !== AuthMethod.GUEST && (
            <Button size="icon" variant="secondary" onClick={handleToggleRightSection} type="button" className="size-6">
              {showRightSidebar ? (
                <Icon name="PanelRightCloseIcon" className="size-3.5" strokeWidth="1.5" />
              ) : (
                <Icon name="PanelLeftCloseIcon" className="size-3.5" strokeWidth="1.5" />
              )}
            </Button>
          )}
        </>
      }>
      <div className="flex h-full flex-col md:flex-row">
        {/* Left Column */}

        <div
          className={`flex ${
            showRightSidebar ? 'sm:w-[70%]' : 'w-full'
          } mt-10 flex-col justify-center bg-gray-50 px-4 pb-4 pt-5 sm:mt-0 sm:p-6`}>
          {/* Content Section */}

          <AnnotationContainer attachments={screenshots} />

          {/* Footer Section */}
          <div className="mt-4 flex justify-center">
            <p className="max-w-lg select-none text-center text-xs text-gray-400">{t('additionalInformation')}</p>
          </div>

          {!showRightSidebar && (
            <Button
              className="relative mt-2 w-full sm:absolute sm:bottom-6 sm:right-4 sm:mt-0 sm:w-[150px]"
              onClick={handleOnCreate}
              disabled={isCreateLoading}
              loading={isCreateLoading}>
              {t('captureAndShare')}
            </Button>
          )}
        </div>

        {showRightSidebar && (
          <div className="flex flex-col justify-between px-4 pb-4 pt-5 sm:w-[30%] sm:p-6">
            {/* Dropdown and Comment */}
            <div className="space-y-4 sm:mt-8">
              <Textarea placeholder="Add a description" rows={width < 500 ? 3 : 10} className="w-full" />

              <small className="select-none text-xs text-gray-400">{t('sliceDescription')}</small>
            </div>

            {/* Action Buttons */}
            <div className="text-center">
              <div className="mt-6 flex items-center justify-between gap-x-2">
                <div className="flex gap-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" size="icon" variant="secondary" onClick={() => {}}>
                        <Icon name="Paperclip" className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" sideOffset={14}>
                      {t('attachFile')}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" size="icon" variant="secondary" onClick={() => {}}>
                        <Icon name="Folder" className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" sideOffset={14}>
                      {t('addFolder')}
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Button
                  className="w-full"
                  onClick={handleOnCreate}
                  disabled={isCreateLoading}
                  loading={isCreateLoading}>
                  {t('captureAndShare')}
                </Button>
              </div>
              <small className="select-none text-center text-xs text-gray-400">{t('captureAndShareMemo')}</small>
            </div>
          </div>
        )}
      </div>
    </DialogLegacy>
  );
};

const arePropsEqual = (prevProps, nextProps) =>
  JSON.stringify(prevProps.screenshots[0].image) === JSON.stringify(nextProps.screenshots[0].image);

export default memo(Content, arePropsEqual);
