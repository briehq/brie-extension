'use client';

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
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  undo: () => void;
  redo: () => void;
};

export const AnnotationSection = ({ canvasRef, undo, redo }: Props) => {
  // trigger respective actions when the user clicks on the right menu
  const handleContextMenuClick = useCallback((key: string) => {
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
  }, []);

  return (
    // <ContextMenu>
    //   <ContextMenuTrigger
    //     //h-[400px] md:h-[calc(100vh-320px)]
    //     className="relative flex items-center justify-center"
    //     id="brie-context-wrapper">
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        id="brie-canvas"
        className="w-full border-[0.5px] border-slate-400 shadow-md dark:border-slate-600"
      />
    </div>

    //   </ContextMenuTrigger>

    //   <ContextMenuContent className="right-menu-content">
    //     {shortcuts.map(item => (
    //       <ContextMenuItem
    //         key={item.key}
    //         className="right-menu-item cursor-pointer"
    //         onClick={() => handleContextMenuClick(item.name)}>
    //         {item.name}

    //         <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>
    //       </ContextMenuItem>
    //     ))}
    //   </ContextMenuContent>
    // </ContextMenu>
  );
};
