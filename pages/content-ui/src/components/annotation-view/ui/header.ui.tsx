import { IS_DEV } from '@extension/env';
import { useStorage } from '@extension/shared';
import { annotationsHistoryStorage, annotationsRedoStorage, annotationsStorage } from '@extension/storage';
import { Button, cn, Icon, Tooltip, TooltipContent, TooltipTrigger } from '@extension/ui';

import { CreateDropdown, EditableTitle, WorkspacesDropdown } from '@src/components/dialog-view';

interface EditorHeaderProps {
  /** active screenshot id */
  id: string;

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
  id,

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
}) => {
  const historyAnnotations = useStorage(annotationsHistoryStorage);
  const redoAnnotations = useStorage(annotationsRedoStorage);
  const annotations = useStorage(annotationsStorage);

  const canUndo = historyAnnotations[id]?.objects?.length;
  const canRedo = redoAnnotations[id]?.objects?.length;
  const canStartOver = annotations[id]?.objects?.length || canRedo || canUndo;

  return (
    <header
      className={cn(
        'grid grid-cols-2 items-center rounded-t-[18px] border-b border-[#EDECE8] bg-white p-4 sm:grid-cols-3',
        className,
      )}>
      <div className="flex items-center gap-[14px]">
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="destructive"
                onClick={onClose}
                className="dark:bg-primary size-[35px] dark:text-white"
                aria-label="Close">
                <Icon name="X" size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              Close
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onMinimize}
                className="dark:bg-primary size-[35px] dark:text-white"
                aria-label="Minimize">
                <Icon name="MinusIcon" size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              Minimize
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onToggleFullScreen}
                className="dark:bg-primary hidden size-[35px] sm:flex dark:text-white"
                aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>
                <Icon name={isFullScreen ? 'MinimizeIcon' : 'MaximizeIcon'} size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              {isFullScreen ? 'Exit full screen' : 'Enter full screen'}
            </TooltipContent>
          </Tooltip>
        </div>

        <EditableTitle value={title} onChange={onTitleChange} />
      </div>

      <div className="hidden items-center justify-center gap-2 sm:flex">
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={!canUndo}
                size="icon"
                variant="ghost"
                onClick={onUndo}
                className="dark:bg-primary size-[35px] dark:text-white"
                aria-label="Undo">
                <Icon name="Undo2Icon" size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              Undo
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={!canRedo}
                size="icon"
                variant="ghost"
                onClick={onRedo}
                className="dark:bg-primary size-[35px] dark:text-white"
                aria-label="Redo">
                <Icon name="Redo2Icon" size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              Redo
            </TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled={!canStartOver}
              variant="destructive"
              onClick={onStartOver}
              className="dark:bg-primary h-[35px] px-[10px] dark:text-white">
              <span className="font-normal leading-normal">Start over</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            Deletes all the shapes
          </TooltipContent>
        </Tooltip>

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
};
