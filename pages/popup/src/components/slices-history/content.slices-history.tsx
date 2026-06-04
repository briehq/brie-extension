import { format } from 'date-fns';
import { Fragment, memo, useCallback, useMemo, useState } from 'react';

import { APP_BASE_URL } from '@extension/env';
import { t } from '@extension/i18n';
import { AuthMethod, ITEMS_PER_PAGE } from '@extension/shared';
import type { Pagination } from '@extension/shared';
import { useAppSelector, useDeleteSliceByIdMutation, useGetSlicesQuery, useUser } from '@extension/store';
import { Alert, AlertDescription, AlertTitle, Button, Icon, Separator } from '@extension/ui';

import { navigateTo } from '@src/utils';

import { CardSkeleton } from './card-skeleton.slice-history';

type SliceAttachment = { name?: string; preview?: string };
type SliceItemModel = {
  id: string;
  externalId: string;
  createdAt: string | number | Date;
  attachments: SliceAttachment[];
};

const getPreviewScreenshotUrl = (attachments: SliceAttachment[] | undefined) =>
  attachments?.find(a => a?.name === 'primary')?.preview;

type SliceRowProps = {
  item: SliceItemModel;
  isGuest: boolean;
  isDeleteLoading: boolean;
  onDelete: (externalId: string) => void;
};

const SliceRow = memo(({ item, isGuest, isDeleteLoading, onDelete }: SliceRowProps) => {
  const preview = useMemo(() => getPreviewScreenshotUrl(item.attachments), [item.attachments]);
  const handleNavigate = useCallback(() => {
    const path = isGuest ? `s/${item?.externalId}` : `slices/${item?.id}`;
    navigateTo(`${APP_BASE_URL}/${path}`);
  }, [isGuest, item?.externalId, item?.id]);
  const handleDelete = useCallback(() => onDelete(item.externalId), [item.externalId, onDelete]);

  return (
    <div className="flex items-center px-3">
      {preview && (
        <img
          src={preview}
          alt={t('sliceThumbnail')}
          loading="lazy"
          crossOrigin="anonymous"
          className="mr-3 size-12 rounded-md object-cover"
        />
      )}

      <div className="flex-1">
        <button
          className="max-w-[240px] truncate text-sm font-medium text-slate-700 hover:underline dark:text-[#df8801]"
          onClick={handleNavigate}>
          {item.externalId}
        </button>
        <p className="text-muted-foreground text-xs">{format(item.createdAt, 'LLL dd, y hh:mm a')}</p>
      </div>
      <Button variant="ghost" size="icon" className="text-red-500" disabled={isDeleteLoading} onClick={handleDelete}>
        <Icon name="TrashIcon" className="size-3.5" />
      </Button>
    </div>
  );
});
SliceRow.displayName = 'SliceRow';

export const SlicesHistoryContent = ({ onBack }: { onBack: () => void }) => {
  const user = useUser();
  const isGuest = user?.fields?.authMethod === AuthMethod.GUEST;
  const filters = useAppSelector(state => state.slicesReducer.filters);
  const [pagination] = useState<Pagination>({
    limit: 1,
    take: ITEMS_PER_PAGE,
  });

  const [deleteSliceByExternalId, { isLoading: isDeleteSliceLoading }] = useDeleteSliceByIdMutation();
  const { isLoading, data: slices } = useGetSlicesQuery({ ...pagination, ...filters });

  const totalSlicesCreatedToday = slices?.totalToday ?? 0;

  const onDelete = useCallback(
    async (externalId: string) => {
      await deleteSliceByExternalId(externalId);
    },
    [deleteSliceByExternalId],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <Icon name="ArrowLeftIcon" className="size-5" />
        </Button>

        {!isGuest && <h2 className="flex items-center text-base font-semibold">{t('sliceHistoryTitle')}</h2>}
      </div>

      {isGuest && (
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center text-base font-semibold">{t('sliceHistoryTitle')}</h2>

          <p className="text-destructive text-sm font-medium">
            {totalSlicesCreatedToday}/10 {t('slicesLimitLabel')}
          </p>
        </div>
      )}

      {isGuest && (
        <p className="text-muted-foreground mb-4 text-xs">
          {t('slicesSaved')} <span className="font-medium">{t('deleted')}</span> {t('slicesSavedLimit')}
        </p>
      )}

      <Separator className="inset-x-0 h-px bg-gray-900/5 dark:bg-gray-800" />

      {isLoading && <CardSkeleton />}

      {!isLoading && !slices?.items?.length && (
        <Alert className="mt-5 text-center">
          <AlertTitle className="text-[14px]">{t('noSlicesYet')}</AlertTitle>
          <AlertDescription className="text-[12px]">{t('noSlicesYetDescription')}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !!slices?.items?.length && (
        <div className="mt-2 space-y-2">
          {slices.items.map((item, idx) => (
            <Fragment key={item.id}>
              <SliceRow
                item={item as SliceItemModel}
                isGuest={isGuest}
                isDeleteLoading={isDeleteSliceLoading}
                onDelete={onDelete}
              />
              {/* slices.total is the full dataset count, not this page — use items.length. */}
              {idx !== slices.items.length - 1 && <Separator className="h-px bg-gray-900/5 dark:bg-gray-800" />}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
