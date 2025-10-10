import * as radix from '@radix-ui/react-icons';
import * as lucide from 'lucide-react';
import type { ComponentType, FC, SVGProps } from 'react';

import { BlurIcon } from '../icons';

const customIcons = {
  BlurIcon,
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

type LucideName = keyof typeof lucide;
type RadixName = keyof typeof radix;
type CustomName = keyof typeof customIcons;

export type IconName = LucideName | RadixName | CustomName;
export type IconProps = {
  name: IconName;
} & lucide.LucideProps;

export const Icon: FC<IconProps> = ({ name, ...rest }) => {
  const Component = (lucide as any)[name] ?? (radix as any)[name] ?? (customIcons as any)[name];

  if (!Component) {
    console.error(`Icon "${name}" does not exist.`);

    return null;
  }

  return <Component {...rest} />;
};
