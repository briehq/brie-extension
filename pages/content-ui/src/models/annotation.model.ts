import type { FabricObject, Canvas, Path, Gradient, Pattern } from 'fabric';
import type { Dispatch, RefObject, SetStateAction } from 'react';

export enum CursorMode {
  Hidden,
  Chat,
  ReactionSelector,
  Reaction,
}

export interface SaveOptions {
  clearRedo?: boolean;
  max?: number;
}

export interface BackgroundFitMeta {
  width: number;
  height: number;
  scale: number;
}

export interface ShapeSnapshot {
  objects: FabricObject[];
  meta: BackgroundFitMeta;
}

export type CursorState =
  | {
      mode: CursorMode.Hidden;
    }
  | {
      mode: CursorMode.Chat;
      message: string;
      previousMessage: string | null;
    }
  | {
      mode: CursorMode.ReactionSelector;
    }
  | {
      mode: CursorMode.Reaction;
      reaction: string;
      isPressed: boolean;
    };

export type Reaction = {
  value: string;
  timestamp: number;
  point: { x: number; y: number };
};

export type ReactionEvent = {
  x: number;
  y: number;
  value: string;
};

export type ShapeData = {
  type: string;
  width: number;
  height: number;
  left: number;
  fill: string | Pattern | Gradient<'linear'> | Gradient<'radial'>;

  top: number;
  objectId: string | undefined;
};

export type Attributes = {
  width: string;
  height: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  fill: string;
  stroke: string;
};

export type ActiveElement = {
  name: string;
  value: string;
  icon: string;
} | null;

export interface CustomFabricObject<T extends FabricObject> extends FabricObject {
  objectId?: string;
}

export type ModifyShape = {
  canvas: Canvas;
  property: string;
  value: any;
  activeObjectRef: RefObject<FabricObject | null>;
  syncShapeInStorage: (shape: FabricObject) => void;
};

export type ElementDirection = {
  canvas: Canvas;
  direction: string;
  syncShapeInStorage: (shape: FabricObject) => void;
};

export type ImageUpload = {
  file: string;
  canvas: Canvas;
};

export type RightSidebarProps = {
  elementAttributes: Attributes;
  setElementAttributes: Dispatch<SetStateAction<Attributes>>;
  fabricRef: RefObject<Canvas | null>;
  activeObjectRef: RefObject<FabricObject | null>;
  isEditingRef: RefObject<boolean>;
  syncShapeInStorage: (obj: any) => void;
};

export type AnnotationSidebarProps = {
  isSuggestionLoading: boolean;
  activeElement: ActiveElement;
  onActiveElement: (element: ActiveElement) => void;
};

export type ShapesMenuProps = {
  item: {
    name: string;
    icon: string;
    value: Array<ActiveElement>;
  };
  activeElement: any;
  handleActiveElement: any;
  handleImageUpload: any;
  imageInputRef: any;
};

export type Presence = any;

export type CanvasMouseDown = {
  options: any;
  canvas: Canvas;
  selectedShapeRef: any;
  isDrawing: RefObject<boolean>;
  shapeRef: RefObject<FabricObject | null>;
};

export type CanvasMouseMove = {
  options: any;
  canvas: Canvas;
  isDrawing: RefObject<boolean>;
  selectedShapeRef: any;
  shapeRef: any;
  syncShapeInStorage: (shape: FabricObject) => void;
};

export type CanvasMouseUp = {
  canvas: Canvas;
  isDrawing: RefObject<boolean>;
  shapeRef: any;
  activeObjectRef: RefObject<FabricObject | null>;
  selectedShapeRef: any;
  syncShapeInStorage: (shape: FabricObject) => void;
  setActiveElement: any;
};

export type CanvasObjectModified = {
  options: any;
  syncShapeInStorage: (shape: FabricObject) => void;
};

export type CanvasPathCreated = {
  options: (any & { path: CustomFabricObject<Path> }) | any;
  syncShapeInStorage: (shape: FabricObject) => void;
};

export type CanvasSelectionCreated = {
  options: any;
  isEditingRef: RefObject<boolean>;
  setElementAttributes: Dispatch<SetStateAction<Attributes>>;
};

export type CanvasObjectScaling = {
  options: any;
  setElementAttributes: Dispatch<SetStateAction<Attributes>>;
};

export type RenderCanvas = {
  fabricRef: RefObject<Canvas | null>;
  canvasObjects: any;
  activeObjectRef: any;
};

export type CursorChatProps = {
  cursor: { x: number; y: number };
  cursorState: CursorState;
  setCursorState: (cursorState: CursorState) => void;
  updateMyPresence: (
    presence: Partial<{
      cursor: { x: number; y: number };
      cursorColor: string;
      message: string;
    }>,
  ) => void;
};
