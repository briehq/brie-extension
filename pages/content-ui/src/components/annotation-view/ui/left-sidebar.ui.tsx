import type { WheelEvent } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';

import { useStorage } from '@extension/shared';
import type { Screenshot } from '@extension/shared';
import { annotationsStorage } from '@extension/storage';
import { Button, cn, Icon, ScrollArea } from '@extension/ui';

import { HoverImage } from '@src/components/dialog-view';
import { useElementSize } from '@src/hooks';

interface LeftSidebarProps {
  open?: boolean;
  canvasHeight: number;
  className?: string;
  screenshots: Screenshot[];
  activeScreenshotId: string;
  defaultOpen?: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

const ADDITIONAL_SIDEBAR_HEIGHT = 52;
const LeftSidebar: React.FC<LeftSidebarProps> = ({
  open,
  canvasHeight,
  defaultOpen = false,
  screenshots,
  className,
  activeScreenshotId,
  onOpenChange,
  onDelete,
  onSelect,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : internalOpen;

  const { ref: screenshotsViewRef, height: screenshotsViewHeight } = useElementSize<HTMLDivElement>();
  const annotations = useStorage(annotationsStorage);

  const toggle = useCallback(() => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);

    onOpenChange(next);
  }, [isControlled, isOpen, onOpenChange]);

  const isScrollEnabled = useMemo(
    () => screenshotsViewHeight + ADDITIONAL_SIDEBAR_HEIGHT > canvasHeight,
    [screenshotsViewHeight, canvasHeight],
  );

  return (
    <>
      {!isOpen && screenshots.length && (
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
        <div className="flex items-center justify-between">
          <p className="text-primary text-sm font-medium">Screenshots</p>
          <Icon
            strokeWidth={1.5}
            name="PanelLeftCloseIcon"
            size={16}
            onClick={toggle}
            className="text-muted-foreground hover:text-primary cursor-pointer dark:text-white"
          />
        </div>

        <ScrollArea
          className={cn('h-full w-full', {
            'overflow-y-auto pr-2.5': isScrollEnabled,
          })}
          /**
           * Keeps the wheel event inside the ScrollArea
           * so normal scrolling works.
           */
          onWheelCapture={(e: WheelEvent<HTMLDivElement>) => e.stopPropagation()}>
          <div className="space-y-2" ref={screenshotsViewRef}>
            {screenshots.map(screenshot => (
              <HoverImage
                key={screenshot.id}
                isEdited={!!annotations[screenshot.id!]?.length}
                isActive={screenshot.id === activeScreenshotId}
                src={screenshot.src}
                alt={screenshot.alt ?? `Screenshot ${screenshot.name}`}
                hasDeleteDisabled={screenshots.length === 1}
                onDelete={() => onDelete(screenshot.id!)}
                onSelect={() => onSelect(screenshot.id!)}
              />
            ))}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
};

export default LeftSidebar;
