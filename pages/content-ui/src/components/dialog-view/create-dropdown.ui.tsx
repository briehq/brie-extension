import { t } from '@extension/i18n';
import type { CreateAction } from '@extension/store';
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

type CreateDropdownProps = {
  isLoading: boolean;
  actions: CreateAction[];
  activeAction: CreateAction;
  onChange: (action: CreateAction) => void;
};

export const CreateDropdown = ({ isLoading, actions, activeAction, onChange }: CreateDropdownProps) => {
  const handleValueChange = (key: string) => {
    const next = actions.find(action => action.key === key);
    if (next) onChange(next);
  };

  const showFooter = actions.length === 1;

  return (
    <DropdownMenu>
      <Button
        form="details-form"
        disabled={isLoading}
        onClick={() => onChange(activeAction)}
        className="bg-gradient-overlay dark:bg-primary flex h-[35px] min-w-[160px] justify-between gap-x-2 p-0">
        <div className="py-2 pl-[10px]">
          <span>{t(activeAction.nameKey)} </span>
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
        <DropdownMenuRadioGroup value={activeAction.key} onValueChange={handleValueChange}>
          {actions.map(action => (
            <DropdownMenuRadioItem
              key={action.key}
              value={action.key}
              className={cn({ 'text-muted-foreground': action.key !== activeAction.key })}>
              <div className="flex h-8 w-8 items-center justify-center">
                <Icon name={action.icon} className="h-3.5 w-3.5" />
              </div>

              <span>{t(action.nameKey)}</span>
            </DropdownMenuRadioItem>
          ))}

          {showFooter && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-center text-[10px] font-normal">
                {t('moreIntegrationSoon')}
              </DropdownMenuLabel>
            </>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
