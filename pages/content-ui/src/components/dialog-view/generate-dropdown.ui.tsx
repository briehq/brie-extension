import { AiGenerateType } from '@extension/shared';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Icon } from '@extension/ui';

const actions = [
  {
    name: 'Steps to reproduce',
    key: AiGenerateType.STEPS,
  },
  { name: 'Full bug report', key: AiGenerateType.FULL_REPORT },
];

export interface GenerateDropdownProps {
  isLoading: boolean;
  onGenerate: (text: string) => void;
}

export const GenerateDropdown = ({ isLoading, onGenerate }: GenerateDropdownProps) => {
  const handleOnSelect = (option: string) => {
    const action = actions.find(a => a.key === option);
    onGenerate(action?.key || '');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-[35px] gap-x-2 px-[10px]" disabled={isLoading} loading={isLoading}>
          <Icon name="SparklesIcon" size={16} strokeWidth={1.5} />

          <span className="font-normal">Generate</span>

          <Icon name="ChevronDownIcon" size={16} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-[180px]">
        {actions.map(action => (
          <DropdownMenuItem
            key={action.key}
            onClick={() => handleOnSelect(action.key)}
            className="text-muted-foreground gap-x-2">
            <span>{action.name}</span>
            {/* <DropdownMenuShortcut>⇧⌘W</DropdownMenuShortcut> */}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
