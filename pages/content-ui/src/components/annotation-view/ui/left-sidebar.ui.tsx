import { useCallback, useMemo, useState } from 'react';

import { Button, cn, Icon, ScrollArea } from '@extension/ui';

import { HoverImage } from '@src/components/dialog-view';

export type Screenshot = { id: string; src: string; alt?: string };

interface LeftSidebarProps {
  open?: boolean;
  className?: string;
  items: Screenshot[];
  defaultOpen?: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteImage: (id: string) => void;
  onSelectImage: (id: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  open,
  defaultOpen = false,
  onOpenChange,
  items,
  onDeleteImage,
  onSelectImage,
  className,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : internalOpen;

  const toggle = useCallback(() => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);

    onOpenChange(next);
  }, [isControlled, isOpen, onOpenChange]);

  const isScrollEnabled = items.length > 2;
  const Body = useMemo(() => (isScrollEnabled ? ScrollArea : 'div'), [isScrollEnabled]);

  return (
    <>
      {!isOpen && items.length > 0 && (
        <Button
          size="icon"
          variant="secondary"
          aria-label="Open screenshots"
          type="button"
          onClick={toggle}
          className="group absolute left-4 top-[5.2rem] z-10 border border-[#EDECE8] bg-white transition-colors dark:text-white">
          <Icon
            strokeWidth={1.5}
            name="PanelLeftOpenIcon"
            size={16}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        </Button>
      )}

      <aside
        className={cn(
          'relative flex flex-col space-y-2.5 rounded-lg border border-[#EDECE8] bg-white p-4',
          isOpen ? 'opacity-100' : 'pointer-events-none size-0 opacity-0',
          isScrollEnabled ? 'min-h-0' : 'self-start',
          className,
        )}>
        {/* header */}

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Screenshots</p>
          <Icon
            strokeWidth={1.5}
            name="PanelLeftCloseIcon"
            size={16}
            onClick={toggle}
            className="text-muted-foreground hover:text-primary cursor-pointer dark:text-white"
          />
        </div>

        <Body className={isScrollEnabled ? 'min-h-0 flex-1' : 'space-y-2'}>
          {items.map((s, idx) => (
            <HoverImage
              key={s.id}
              src={s.image}
              className={idx !== items.length ? 'mb-2' : ''}
              alt={s.alt ?? `Screenshot ${s.id}`}
              onDelete={() => onDeleteImage(s.id)}
              onSelect={() => onSelectImage(s.id)}
            />
          ))}
        </Body>
      </aside>
    </>
  );
};
