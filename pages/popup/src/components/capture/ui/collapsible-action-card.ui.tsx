import type { ReactNode } from 'react';

import { Button, cn, Icon, Separator } from '@extension/ui';

interface CollapsibleActionCardProps {
  isDisabled: boolean;
  isActive: boolean;
  icon: ReactNode;
  title: string;
  activeTitle: string;
  open: boolean;
  onToggleOpen: () => void;
  onPrimaryAction: () => void;
  primaryAriaLabel: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const CollapsibleActionCard = ({
  isDisabled,
  isActive,
  icon,
  title,
  activeTitle,
  open,
  onToggleOpen,
  onPrimaryAction,
  primaryAriaLabel,
  right,
  children,
  className,
}: CollapsibleActionCardProps) => {
  return (
    <div className={cn('bg-background ring-border/60 rounded-2xl ring-1', className)}>
      <div className="flex items-center justify-between gap-2 p-2">
        {isActive ? (
          <Button
            variant="destructive"
            type="button"
            onClick={onPrimaryAction}
            aria-label={primaryAriaLabel}
            className={cn(
              'hover:text-foreground size-8 w-full flex-1 cursor-pointer justify-start px-1 py-0.5 text-[14px] font-medium',
            )}>
            <div className="flex w-full items-center gap-2">
              <Icon name="XCircle" className="h-4 w-4" />
              {activeTitle}
            </div>
          </Button>
        ) : (
          <Button
            variant="ghost"
            type="button"
            disabled={isDisabled}
            onClick={onPrimaryAction}
            aria-label={primaryAriaLabel}
            className={cn(
              'hover:text-foreground size-8 w-full flex-1 cursor-pointer justify-start px-1 py-0.5 text-[14px] font-medium',
            )}>
            <div className="flex w-full items-center gap-2">
              {icon}
              {title}
            </div>
          </Button>
        )}

        <div className="align-end flex items-center gap-2">
          {right ? <div className="flex items-center gap-2">{right}</div> : null}

          <div className="bg-border/60 h-[20px] w-[1px]" />

          <Button
            disabled={isDisabled || isActive}
            type="button"
            size="icon"
            variant="ghost"
            onClick={onToggleOpen}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
            className={cn('text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground size-8')}>
            <Icon name={open ? 'ChevronUp' : 'ChevronDown'} className="h-4 w-4 transition-transform" />
          </Button>
        </div>
      </div>

      {open && children ? (
        <>
          <Separator className="bg-border/60" />
          <div className="p-3">{children}</div>
        </>
      ) : null}
    </div>
  );
};
