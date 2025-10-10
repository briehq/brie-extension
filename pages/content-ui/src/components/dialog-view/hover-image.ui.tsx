import type { FC } from 'react';

import { Button, cn, Icon, Tooltip, TooltipContent, TooltipTrigger } from '@extension/ui';

type HoverImageProps = {
  src: string;
  alt: string;
  className?: string;
  hasDeleteDisabled: boolean;
  isActive: boolean;
  isEdited: boolean;
  onDelete: () => void;
  onSelect: () => void;
};

export const HoverImage: FC<HoverImageProps> = ({
  src,
  alt = '',
  className = '',
  hasDeleteDisabled,
  isActive,
  isEdited,
  onDelete,
  onSelect,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    }}
    className={cn('group relative w-full cursor-pointer overflow-hidden rounded-lg', className)}>
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn('h-[150px] w-full rounded-lg border-green-300 object-cover', {
        'border-2': isActive,
        'border-[0.5px]': !isActive,
      })}
    />

    {isEdited && (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="absolute left-2 top-2 flex size-3 items-center justify-center rounded-full bg-yellow-300/70" />
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          Edited
        </TooltipContent>
      </Tooltip>
    )}

    {!hasDeleteDisabled && (
      <Button
        size="icon"
        variant="destructive"
        aria-label="Delete screenshot"
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        className="dark:bg-primary absolute right-2 top-2 size-[35px] bg-[rgba(255,255,255,0.16)] text-white opacity-0 transition-opacity group-hover:opacity-100">
        <Icon name="Trash2Icon" size={16} />
      </Button>
    )}
  </div>
);
