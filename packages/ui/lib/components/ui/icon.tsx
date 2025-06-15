import * as radix from '@radix-ui/react-icons';
import * as lucide from 'lucide-react';

type IconName = keyof typeof lucide & keyof typeof radix;

type IconProps = {
  name: IconName;
} & lucide.LucideProps;

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
  // eslint-disable-next-line import-x/namespace
  const Icon = lucide[name] || radix[name];

  if (!Icon) {
    console.error(`Icon "${name}" does not exist in lucide-react and radix-ui.`);
    return null;
  }

  return <Icon {...props} />;
};
