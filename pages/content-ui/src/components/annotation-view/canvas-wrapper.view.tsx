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
import { useAnnotationActionAvailability } from '@src/providers';

type Props = {
  id: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onUndo: () => void;
  onRedo: () => void;
  onStartOver: () => void;
  onExport: () => void;
};

export const CanvasWrapper = ({ id, canvasRef, onUndo, onRedo, onStartOver, onExport }: Props) => {
  const { canUndo, canRedo, canStartOver } = useAnnotationActionAvailability(id);

  const handleContextMenuClick = useCallback(
    (value: string) => {
      switch (value) {
        case 'export':
          onExport();
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
    [onExport, onRedo, onStartOver, onUndo],
  );

  const isMenuDisabled = (key: string) => {
    switch (key) {
      case 'undo':
        return !canUndo;
      case 'redo':
        return !canRedo;
      case 'start_over':
        return !canStartOver;

      default:
        return false;
    }
  };

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
            disabled={isMenuDisabled(item.value)}
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
