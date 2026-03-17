import type { ButtonHTMLAttributes } from 'react';

import { t } from '@extension/i18n';
import { Button, cn, Icon } from '@extension/ui';

type ExportVideoButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const ExportVideoButton = ({ className, ...props }: ExportVideoButtonProps) => (
  <Button {...props} className={cn('bg-gradient-overlay dark:bg-primary flex h-[35px] gap-x-[6px] px-2.5', className)}>
    <Icon name="ArrowUpIcon" size={16} />

    <span>{t('export')}</span>

    <span className="text-primary-foreground text-xs">
      <span className="uppercase">webm</span>
    </span>
  </Button>
);
