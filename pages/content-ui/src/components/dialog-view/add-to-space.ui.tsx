import { useState } from 'react';

import { APP_BASE_URL } from '@extension/env';
import { t } from '@extension/i18n';
import { useGetSpacesQuery } from '@extension/store';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@extension/ui';

export const AddToSpace = ({ workspaceId, onChange }: { workspaceId: string; onChange: (spaceId: string) => void }) => {
  const [activeSpaceId, setActiveSpaceId] = useState('');

  const { isLoading, isError, data: spaces } = useGetSpacesQuery({ limit: 1, take: 10, workspaceId });

  const handleOnCreateSpace = () => {
    const newWindow = window?.open(`${APP_BASE_URL}/workspaces`, '_blank');
    newWindow?.focus();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" size="icon" variant="ghost">
                <Icon name="Folder" size={16} />

                {activeSpaceId && (
                  <span className="bg-primary absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" sideOffset={14}>
              {t('addFolder')}
            </TooltipContent>
          </Tooltip>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-[250px]">
        <DropdownMenuLabel>{t('addToSpace')}</DropdownMenuLabel>

        {!isLoading && spaces?.total > 0 ? (
          <DropdownMenuRadioGroup
            value={activeSpaceId}
            onValueChange={value => {
              setActiveSpaceId(value);

              if (onChange) onChange(value);
            }}>
            {spaces?.items?.map(space => (
              <DropdownMenuRadioItem
                key={space.id}
                value={space.id}
                className={cn('gap-x-2 capitalize', {
                  'text-muted-foreground': activeSpaceId !== space.id,
                })}>
                <span>{space.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        ) : (
          <span className="text-muted-foreground mx-2 my-4 text-xs">{t('noSpaces')}</span>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-x-2 text-[rgba(39,36,29,0.4)]" onClick={handleOnCreateSpace}>
          <div className="flex h-8 w-8 items-center justify-center">
            <Icon name="PlusIcon" className="h-3.5 w-3.5" />
          </div>

          <span>{t('createSpace')}</span>
          {/* <DropdownMenuShortcut>⇧⌘W</DropdownMenuShortcut> */}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
