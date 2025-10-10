import { format } from 'date-fns';
import { Fragment, useMemo, useState } from 'react';

import { APP_BASE_URL } from '@extension/env';
import { t } from '@extension/i18n';
import { AuthMethod, ITEMS_PER_PAGE } from '@extension/shared';
import type { Pagination } from '@extension/shared';
import { useAppSelector, useDeleteSliceByIdMutation, useGetSlicesQuery, useUser } from '@extension/store';
import { Alert, AlertDescription, AlertTitle, Button, Icon, Separator } from '@extension/ui';

import { useSlicesCreatedToday } from '@src/hooks';
import { navigateTo } from '@src/utils';

import { CardSkeleton } from './card-skeleton.slice-history';

export const SlicesHistoryContent = ({ onBack }: { onBack: () => void }) => {
  const user = useUser();
  const isGuest = user?.fields?.authMethod === AuthMethod.GUEST;
  const totalSlicesCreatedToday = useSlicesCreatedToday();
  const filters = useAppSelector(state => state.slicesReducer.filters);
  const [pagination, setPagination] = useState<Pagination>({
    limit: 1,
    take: ITEMS_PER_PAGE,
  });

  const [deleteSliceByExternalId, { isLoading: isDeleteSliceLoading }] = useDeleteSliceByIdMutation();
  const { isLoading, data: slices } = useGetSlicesQuery({ ...pagination, ...filters });

  const { screenshots, records, attachments } = useMemo(
    slice => {
      if (isLoading || !slice?.attachments) {
        return {
          screenshots: [],
          records: [],
          attachments: [],
        };
      }

      const attachments: any[] = [];
      const screenshots: any[] = [];
      const records: any[] = [];

      for (const attachment of slice.attachments) {
        const { assetType, name } = attachment;

        if (assetType) {
          switch (assetType) {
            case 'ATTACHMENT':
              attachments.push(attachment);
              break;

            case 'SCREENSHOT':
              screenshots.push(attachment);
              break;

            case 'RECORDS':
              records.push(attachment);
              break;
          }
        } else {
          if (name?.toLowerCase().includes('records')) {
            records.push(attachment);
          } else {
            screenshots.push(attachment);
          }
        }
      }

      return {
        screenshots: screenshots.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0)),
        records,
        attachments,
      };
    },
    [isLoading],
  );

  const previewScreenshotUrl = (attachments: any) => attachments.find((a: any) => a?.name === 'primary')?.preview;

  const onDeleteAll = () => {
    // Handle delete all logic
    console.log('All slices deleted');
  };

  const onDelete = async (externalId: string) => {
    await deleteSliceByExternalId(externalId);
  };

  return (
    <div>
      {/* Top Bar */}
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <Icon name="ArrowLeftIcon" className="size-5" />
        </Button>

        {!isGuest && (
          <>
            {/*
            <Button variant="link" size="sm" className="text-red-500" onClick={onDeleteAll}>
              {t('deleteAll')}
            </Button>
            */}

            <h2 className="flex items-center text-base font-semibold">{t('sliceHistoryTitle')}</h2>
          </>
        )}
      </div>

      {/* Title and Description */}
      {isGuest && (
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center text-base font-semibold">{t('sliceHistoryTitle')}</h2>

          <p className="text-muted-foreground text-sm font-medium text-red-500">
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
              <div className="flex items-center px-3">
                {previewScreenshotUrl(item.attachments) && (
                  <img
                    src={previewScreenshotUrl(item.attachments)}
                    alt="Slice Thumbnail"
                    loading="lazy"
                    crossOrigin="anonymous"
                    className="mr-3 size-12 rounded-md object-cover"
                  />
                )}

                <div className="flex-1">
                  <button
                    className="max-w-[240px] truncate text-sm font-medium text-slate-700 hover:underline dark:text-[#df8801]"
                    onClick={() => {
                      const path = isGuest ? `s/${item?.externalId}` : `slices/${item?.id}`;

                      navigateTo(`${APP_BASE_URL}/${path}`);
                    }}>
                    {item.externalId}
                  </button>
                  <p className="text-muted-foreground text-xs">{format(item.createdAt, 'LLL dd, y hh:mm a')}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500"
                  disabled={isDeleteSliceLoading}
                  onClick={() => onDelete(item.externalId)}>
                  <Icon name="TrashIcon" className="size-3.5" />
                </Button>
              </div>

              {slices?.total - 1 !== idx && <Separator className="h-px bg-gray-900/5 dark:bg-gray-800" />}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
