/* eslint-disable jsx-a11y/no-noninteractive-tabindex */

import type { FC } from 'react';

import { t } from '@extension/i18n';
import type { Screenshot } from '@extension/shared';
import { Button, cn, Icon, toast } from '@extension/ui';

import { copyBase64ImageToClipboard, saveBase64Image } from '@src/utils';

interface MinimizedPreviewProps {
  screenshots: Screenshot[];
  unsaved?: boolean;
  onEdit: () => void;
  onDiscard: () => void;
}

export const MinimizedPreview: FC<MinimizedPreviewProps> = ({ screenshots, unsaved = false, onEdit, onDiscard }) => {
  const lastImage: Screenshot = screenshots[screenshots.length - 1];

  const handleOnSave = async () => {
    try {
      await saveBase64Image(lastImage.src, lastImage.name);
      toast.info(t('imagePreparing'));
    } catch (e) {
      toast.error(t('imagePreparingFailed'));
    }
  };

  const handleOnCopy = async () => {
    try {
      await copyBase64ImageToClipboard(lastImage.src);
      toast.success(t('imageCopied'));
    } catch (e) {
      toast.error(t('imageCopiedFailed'));
    }
  };

  return (
    <div
      tabIndex={0}
      id="brie-minimized-preview"
      className={cn(
        'group fixed bottom-4 right-4 z-[2000000] h-[180px] w-[230px]',
        'overflow-hidden rounded-lg border border-[#EDECE8] shadow-lg hover:bg-black',
        'transition-transform duration-200 focus-within:scale-105 hover:scale-105 focus:scale-105 focus-visible:scale-105',
        'focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2',
      )}>
      {unsaved && screenshots?.length && (
        <span
          className={cn(
            'absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full',
            'bg-red-500 text-[10px] font-medium text-white ring-2 ring-white',
            'transition-opacity duration-150',
            'group-focus-within:opacity-0 group-hover:opacity-0 group-focus-visible:opacity-0',
          )}>
          {screenshots.length}
        </span>
      )}

      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-2',
          'bg-black/60 opacity-0 transition-opacity duration-200',
          'group-focus-within:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100',
        )}>
        <div className="flex items-center gap-x-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={t('edit')}
            onClick={onEdit}
            className="dark:bg-primary w-[90px] space-x-2 bg-white/30 text-white backdrop-blur-sm hover:bg-white/10">
            <Icon name="FilePenLineIcon" size={14} /> <span>{t('edit')}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="destructive"
            aria-label={t('discard')}
            onClick={onDiscard}
            className="dark:bg-primary w-[90px] space-x-2 bg-white/30 text-white backdrop-blur-sm hover:bg-white/10">
            <Icon name="Trash2Icon" size={14} /> <span>{t('discard')}</span>
          </Button>
        </div>

        <div className="flex items-center gap-x-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={t('save')}
            onClick={handleOnSave}
            className="dark:bg-primary w-[90px] space-x-2 bg-white/30 text-white backdrop-blur-sm hover:bg-white/10">
            <Icon name="DownloadIcon" size={14} /> <span>{t('save')}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={t('copy')}
            onClick={handleOnCopy}
            className="dark:bg-primary w-[90px] space-x-2 bg-white/30 text-white backdrop-blur-sm hover:bg-white/10">
            <Icon name="CopyIcon" size={14} /> <span>{t('copy')}</span>
          </Button>
        </div>
      </div>

      <img
        src={lastImage.src}
        alt={`Last captured screenshot: ${lastImage.name}`}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
};
