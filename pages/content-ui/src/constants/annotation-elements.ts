export const COLORS = ['#DC2626', '#D97706', '#059669', '#7C3AED', '#DB2777'];

export const shapeElements = [
  {
    icon: 'SquareIcon',
    name: 'Rectangle',
    value: 'rectangle',
  },
  {
    icon: 'MoveUpRightIcon',
    name: 'Arrow',
    value: 'arrow',
  },
  {
    icon: 'SlashIcon',
    name: 'Line',
    value: 'line',
  },
  {
    icon: 'CircleIcon',
    name: 'Circle',
    value: 'circle',
  },
];

export const defaultNavElement = {
  // icon: 'MousePointer2Icon',
  icon: 'HandIcon',
  name: 'Select',
  value: 'select',
};

export const navElements = [
  defaultNavElement,
  {
    icon: 'SquareIcon',
    name: 'Rectangle',
    value: shapeElements,
  },
  {
    icon: 'PipetteIcon',
    name: 'Pipette',
    value: 'pipette',
  },
  {
    icon: 'HighlighterIcon',
    name: 'Highlighter',
    value: 'highlighter',
  },
  {
    icon: 'BlurIcon',
    name: 'Blur',
    value: 'blur',
  },
  {
    icon: 'PencilIcon',
    name: 'Pencil',
    value: 'freeform',
  },
  {
    icon: 'TypeIcon',
    name: 'Text',
    value: 'text',
  },
  {},
];

export const directionOptions = [
  { label: 'Bring to Front', value: 'front', icon: '/assets/front.svg' },
  { label: 'Send to Back', value: 'back', icon: '/assets/back.svg' },
];

export const fontFamilyOptions = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Brush Script MT', label: 'Brush Script MT' },
];

export const fontSizeOptions = [
  {
    value: '10',
    label: '10',
  },
  {
    value: '12',
    label: '12',
  },
  {
    value: '14',
    label: '14',
  },
  {
    value: '16',
    label: '16',
  },
  {
    value: '18',
    label: '18',
  },
  {
    value: '20',
    label: '20',
  },
  {
    value: '22',
    label: '22',
  },
  {
    value: '24',
    label: '24',
  },
  {
    value: '26',
    label: '26',
  },
  {
    value: '28',
    label: '28',
  },
  {
    value: '30',
    label: '30',
  },
  {
    value: '32',
    label: '32',
  },
  {
    value: '34',
    label: '34',
  },
  {
    value: '36',
    label: '36',
  },
];

export const fontWeightOptions = [
  {
    value: '400',
    label: 'Normal',
  },
  {
    value: '500',
    label: 'Semibold',
  },
  {
    value: '600',
    label: 'Bold',
  },
];

export const alignmentOptions = [
  { value: 'left', label: 'Align Left', icon: '/assets/align-left.svg' },
  {
    value: 'horizontalCenter',
    label: 'Align Horizontal Center',
    icon: '/assets/align-horizontal-center.svg',
  },
  { value: 'right', label: 'Align Right', icon: '/assets/align-right.svg' },
  { value: 'top', label: 'Align Top', icon: '/assets/align-top.svg' },
  {
    value: 'verticalCenter',
    label: 'Align Vertical Center',
    icon: '/assets/align-vertical-center.svg',
  },
  { value: 'bottom', label: 'Align Bottom', icon: '/assets/align-bottom.svg' },
];

export const shortcuts = [
  {
    key: '1',
    name: 'Save As...',
    shortcut: '⌘ + S',
  },
  {
    key: '2',
    name: 'Undo',
    shortcut: '⌘ + Z',
  },
  {
    key: '3',
    name: 'Redo',
    shortcut: '⌘ + Y',
  },
];
