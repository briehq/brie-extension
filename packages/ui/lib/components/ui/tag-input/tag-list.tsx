import type { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { TagProps } from './tag';
import { Tag } from './tag';
import type { TagType } from './tag-input';

export type TagListProps = {
  tags: TagType[];
  customTagRenderer?: (tag: TagType) => ReactNode;
  direction?: TagProps['direction'];
} & Omit<TagProps, 'tagObj'>;

export const TagList: FC<TagListProps> = ({ tags, customTagRenderer, direction, ...tagProps }) => {
  return (
    <div
      className={cn('rounded-md', {
        'flex flex-wrap gap-2': direction === 'row',
        'flex flex-col gap-2': direction === 'column',
      })}>
      {tags.map(tagObj =>
        customTagRenderer ? (
          customTagRenderer(tagObj)
        ) : (
          <Tag key={tagObj.id} tagObj={tagObj} {...tagProps} shape="rounded" />
        ),
      )}
    </div>
  );
};
