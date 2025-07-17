import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Icon } from '@extension/ui';

const actions = [
  {
    name: 'Steps to reproduce',
    key: 'repro',
  },
  { name: 'Full bug report', key: 'bug-report' },
];

export interface GenerateDropdownProps {
  onGenerate: (text: string) => void;
}

export const GenerateDropdown = ({ onGenerate }: GenerateDropdownProps) => {
  const handleSelect = (option: string) => {
    const text = actions.find(a => a.key === option);
    onGenerate(text?.name || '');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-[35px] gap-x-2 px-[10px]">
          <Icon name="SparklesIcon" size={16} strokeWidth={1.5} />

          <span className="font-normal">Generate</span>

          <Icon name="ChevronDownIcon" size={16} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-[180px]">
        {actions.map(action => (
          <DropdownMenuItem
            key={action.key}
            onClick={() => handleSelect(action.key)}
            className="text-muted-foreground gap-x-2">
            <span>{action.name}</span>
            {/* <DropdownMenuShortcut>⇧⌘W</DropdownMenuShortcut> */}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
