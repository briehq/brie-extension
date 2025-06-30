import { IS_DEV } from '@extension/env';
import { Button, cn, Icon } from '@extension/ui';

import { CreateDropdown, EditableTitle, WorkspacesDropdown } from '@src/components/dialog-view';

interface EditorHeaderProps {
  /** window controls */
  onClose: () => void;
  onMinimize: () => void;
  onToggleFullScreen: () => void;
  isFullScreen?: boolean;

  /** title */
  title: string;
  onTitleChange: (val: string) => void;

  /** undo / redo / start over */
  onUndo: () => void;
  onRedo: () => void;
  onStartOver: () => void;

  /** canvas size read-out */
  canvasWidth: number;
  canvasHeight: number;

  /** workspace & create dropdowns */
  onWorkspaceChange: (id: string) => void;
  onCreate: (key: string) => void;
  isCreateLoading: boolean;

  className?: string;
}

export const Header: React.FC<EditorHeaderProps> = ({
  onClose,
  onMinimize,
  onToggleFullScreen,
  isFullScreen = false,

  title,
  onTitleChange,

  onUndo,
  onRedo,
  onStartOver,
  isCreateLoading = false,

  canvasWidth,
  canvasHeight,

  onWorkspaceChange,
  onCreate,

  className,
}) => (
  <header
    className={cn('grid grid-cols-3 items-center rounded-t-[18px] border-b border-[#EDECE8] bg-white p-4', className)}>
    <div className="flex items-center gap-[14px]">
      <div className="flex items-center">
        <Button
          size="icon"
          variant="destructive"
          onClick={onClose}
          className="dark:bg-primary size-[35px] dark:text-white"
          aria-label="Close">
          <Icon name="X" size={16} />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={onMinimize}
          className="dark:bg-primary size-[35px] dark:text-white"
          aria-label="Minimize">
          <Icon name="MinusIcon" size={16} />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleFullScreen}
          className="dark:bg-primary size-[35px] dark:text-white"
          aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>
          <Icon name={isFullScreen ? 'MinimizeIcon' : 'MaximizeIcon'} size={14} />
        </Button>
      </div>

      <EditableTitle value={title} onChange={onTitleChange} />
    </div>

    <div className="flex items-center justify-center gap-2">
      <div className="flex items-center">
        <Button
          size="icon"
          variant="ghost"
          onClick={onUndo}
          className="dark:bg-primary size-[35px] dark:text-white"
          aria-label="Undo">
          <Icon name="Undo2Icon" size={16} />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={onRedo}
          className="dark:bg-primary size-[35px] dark:text-white"
          aria-label="Redo">
          <Icon name="Redo2Icon" size={16} />
        </Button>
      </div>

      <Button
        variant="destructive"
        onClick={onStartOver}
        className="dark:bg-primary h-[35px] px-[10px] dark:text-white">
        <span className="font-normal leading-normal">Start over</span>
      </Button>

      {IS_DEV && (
        <div className="text-muted-foreground text-sm">
          {canvasWidth} × {canvasHeight}
        </div>
      )}
    </div>

    <div className="flex items-center justify-end gap-x-2">
      <WorkspacesDropdown onChange={onWorkspaceChange} />

      <CreateDropdown isLoading={isCreateLoading} onChange={onCreate} />
    </div>
  </header>
);
