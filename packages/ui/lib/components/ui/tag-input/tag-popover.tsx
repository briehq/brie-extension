import type { FC, ReactNode } from 'react';

import type { TagType } from './tag-input';
import type { TagListProps } from './tag-list';
import { TagList } from './tag-list';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';

type TagPopoverProps = {
  children: ReactNode;
  tags: TagType[];
  customTagRenderer?: (tag: TagType) => ReactNode;
} & TagListProps;

export const TagPopover: FC<TagPopoverProps> = ({ children, tags, customTagRenderer, ...tagProps }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-full max-w-[450px] space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">Entered Tags</h4>
          <p className="text-muted-foreground text-left text-sm">These are the tags you&apos;ve entered.</p>
        </div>
        <TagList tags={tags} customTagRenderer={customTagRenderer} {...tagProps} />
      </PopoverContent>
    </Popover>
  );
};
