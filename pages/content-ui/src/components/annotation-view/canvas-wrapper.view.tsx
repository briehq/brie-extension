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
import { exportToPng } from '@src/utils/annotation';

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  undo: () => void;
  redo: () => void;
};

export const CanvasWrapper = ({ canvasRef, undo, redo }: Props) => {
  // trigger respective actions when the user clicks on the right menu
  const handleContextMenuClick = useCallback(
    (key: string) => {
      switch (key) {
        // case "Chat":
        //   setCursorState({
        //     mode: CursorMode.Chat,
        //     previousMessage: null,
        //     message: "",
        //   });
        //   break;

        case 'Save as Image':
          exportToPng('image-issue');
          break;

        case 'Undo':
          undo();
          break;

        case 'Redo':
          redo();
          break;

        default:
          break;
      }
    },
    [redo, undo],
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
            key={item.key}
            onClick={() => handleContextMenuClick(item.name)}
            className="right-menu-item cursor-pointer text-xs">
            {item.name}
            <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
};
