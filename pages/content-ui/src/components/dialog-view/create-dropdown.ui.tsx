import { useMemo, useState } from 'react';

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from '@extension/ui';

const createActions = [
  { icon: 'LinkIcon', name: 'Create a link', key: 'link', isDefault: true },
  // { icon: 'BlocksIcon', name: 'Create in Linear', key: 'linear' },
  // { icon: 'BlocksIcon', name: 'Create in Jira', key: 'jira' },
  // { icon: 'BlocksIcon', name: 'Create in Azure', key: 'azure' },
];

export const CreateDropdown = ({ isLoading, onChange }: { isLoading: boolean; onChange: (key: string) => void }) => {
  const [activeActionKey, setActiveActionKey] = useState('link');

  const defaultAction = useMemo(() => createActions?.find(action => action.isDefault), []);
  const activeAction = useMemo(() => createActions?.find(action => action.key === activeActionKey), [activeActionKey]);

  return (
    <DropdownMenu>
      <Button
        disabled={isLoading}
        onClick={() => onChange(activeActionKey)}
        className="bg-gradient-overlay flex h-[35px] min-w-[160px] justify-between gap-x-2 p-0">
        <div className="py-2 pl-[10px]">
          <span>{activeAction?.name || defaultAction?.name} </span>
        </div>

        <DropdownMenuTrigger asChild>
          <div
            className="px-[10px] py-2"
            style={{
              borderLeft: '1px solid rgba(250, 249, 247, 0.20)',
            }}>
            <Icon name="ChevronDownIcon" size={16} />
          </div>
        </DropdownMenuTrigger>
      </Button>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[200px]">
        <DropdownMenuRadioGroup value={activeActionKey || defaultAction?.key} onValueChange={setActiveActionKey}>
          {createActions?.map((action: any) => (
            <DropdownMenuRadioItem
              key={action.key}
              value={action.key}
              disabled={action.key !== 'link'}
              className={cn({ 'text-muted-foreground': action.key !== activeActionKey })}>
              <div className="flex h-8 w-8 items-center justify-center">
                <Icon name={action.icon} className="h-3.5 w-3.5" />
              </div>

              <span>{action.name}</span>
            </DropdownMenuRadioItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-muted-foreground text-center text-[10px] font-normal">
            More integration coming soon...
          </DropdownMenuLabel>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
