'use client';

import type { RefObject } from 'react';
import { useCallback } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@extension/ui';

import { shortcuts } from '@src/constants';

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onUndo: () => void;
  onRedo: () => void;
  onStartOver: () => void;
};

export const CanvasWrapper = ({ canvasRef, onUndo, onRedo, onStartOver }: Props) => {
  // trigger respective actions when the user clicks on the right menu
  const handleContextMenuClick = useCallback(
    (value: string) => {
      switch (value) {
        // case "Chat":
        //   setCursorState({
        //     mode: CursorMode.Chat,
        //     previousMessage: null,
        //     message: "",
        //   });
        //   break;

        case 'save':
          // @todo
          // exportToPng('image-issue');
          break;

        case 'undo':
          onUndo();
          break;

        case 'redo':
          onRedo();
          break;

        case 'start_over':
          onStartOver();
          break;

        default:
          break;
      }
    },
    [onRedo, onStartOver, onUndo],
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        id="brie-context-wrapper">
        {/* NOTE: canvas gets its pixel size only from Fabric */}
        <canvas ref={canvasRef} id="brie-canvas" className="rounded-lg shadow-md" />
      </ContextMenuTrigger>

      <ContextMenuContent className="right-menu-content">
        {shortcuts.map(item => (
          <ContextMenuItem
            key={item.value}
            onClick={() => handleContextMenuClick(item.value)}
            className="right-menu-item cursor-pointer text-xs">
            {item.name}
            <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
};
