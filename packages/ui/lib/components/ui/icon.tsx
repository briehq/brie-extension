import { DiscordLogoIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import {
  AppWindow,
  AppWindowMac,
  ArrowLeftIcon,
  ArrowUpIcon,
  ChevronDown,
  ChevronDownIcon,
  ChevronUp,
  ChevronUpIcon,
  CircleHelp,
  CircleIcon,
  Clock,
  CopyIcon,
  DownloadIcon,
  FilePenLineIcon,
  Folder,
  GithubIcon,
  GripVertical,
  HandIcon,
  HighlighterIcon,
  History,
  House,
  ImageIcon,
  LaptopMinimal,
  LinkIcon,
  MaximizeIcon,
  Mic,
  MicOff,
  MinimizeIcon,
  MinusIcon,
  MousePointer2Icon,
  MoveUpRightIcon,
  PaletteIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  Paperclip,
  Pause,
  PencilIcon,
  Play,
  Plus,
  PlusIcon,
  RectangleVertical,
  Redo2Icon,
  RewindIcon,
  Settings,
  Settings2Icon,
  Siren,
  SlashIcon,
  SparklesIcon,
  Square,
  SquareDashed,
  SquareIcon,
  Trash2Icon,
  TrashIcon,
  TypeIcon,
  Undo2Icon,
  X,
} from 'lucide-react';
import type { ComponentType, FC, SVGProps } from 'react';

import { BlurIcon, JiraIcon, LinearIcon } from '../icons';

const iconRegistry = {
  AppWindow,
  AppWindowMac,
  ArrowLeftIcon,
  ArrowUpIcon,
  BlurIcon,
  ChevronDown,
  ChevronDownIcon,
  ChevronUp,
  ChevronUpIcon,
  CircleHelp,
  CircleIcon,
  Clock,
  CopyIcon,
  DiscordLogoIcon,
  DownloadIcon,
  FilePenLineIcon,
  Folder,
  GithubIcon,
  GitHubLogoIcon,
  GripVertical,
  HandIcon,
  HighlighterIcon,
  History,
  House,
  ImageIcon,
  JiraIcon,
  LaptopMinimal,
  LinearIcon,
  LinkIcon,
  MaximizeIcon,
  Mic,
  MicOff,
  MinimizeIcon,
  MinusIcon,
  ColorPalette: PaletteIcon,
  MousePointer2Icon,
  MoveUpRightIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  Paperclip,
  Pause,
  PencilIcon,
  Play,
  Plus,
  PlusIcon,
  RectangleVertical,
  Redo2Icon,
  RewindIcon,
  Settings,
  Settings2Icon,
  Siren,
  SlashIcon,
  SparklesIcon,
  Square,
  SquareDashed,
  SquareIcon,
  Trash2Icon,
  TrashIcon,
  TypeIcon,
  Undo2Icon,
  X,
} satisfies Record<string, ComponentType<any>>;

type BaseIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
};

type RegisteredIconName = keyof typeof iconRegistry;

const Icon: FC<BaseIconProps & { name: RegisteredIconName }> = ({ name, ...rest }) => {
  const Component = iconRegistry[name] as ComponentType<BaseIconProps> | undefined;

  if (!Component) {
    console.error(`Icon "${name}" is not registered.`);

    return null;
  }

  return <Component {...rest} />;
};

export type IconName = RegisteredIconName;
export type IconProps = BaseIconProps & { name: IconName };
export { Icon };
