import type { FC } from 'react';

import { Button, Icon } from '@extension/ui';

type HoverImageProps = {
  src: string;
  alt?: string;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  className?: string;
};

export const HoverImage: FC<HoverImageProps> = ({ src, alt = '', className = '', onDelete, onSelect }) => (
  <div className={`group relative w-full cursor-pointer overflow-hidden ${className}`}>
    <img src={src} alt={alt} loading="lazy" className="h-[150px] w-full rounded-lg object-cover" />

    <Button
      size="icon"
      variant="destructive"
      aria-label="Delete image"
      onClick={onDelete}
      className="dark:bg-primary absolute right-2 top-2 size-[35px] bg-[rgba(255,255,255,0.16)] text-white opacity-0 transition-opacity group-hover:opacity-100">
      <Icon name="Trash2Icon" size={16} />
    </Button>
  </div>
);
