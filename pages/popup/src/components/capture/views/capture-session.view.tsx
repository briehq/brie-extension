import { t } from '@extension/i18n';
import { Button, cn, Icon, Switch } from '@extension/ui';

interface CaptureSessionViewProps {
  isDisabled: boolean;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  onOpen: () => void;
}

export const CaptureSessionView = ({ isDisabled, enabled, onToggle, onOpen }: CaptureSessionViewProps) => {
  return (
    <div className="bg-background ring-border/60 rounded-2xl ring-1">
      <div className="flex items-center justify-between gap-2 p-2">
        <Button
          variant="ghost"
          type="button"
          disabled={!enabled || isDisabled}
          onClick={onOpen}
          className={cn('hover:text-foreground h-14 w-full flex-1 justify-start px-1 py-0.5', {
            'hover:cursor-not-allowed': !enabled || isDisabled,
          })}>
          <div
            className={cn('flex flex-col gap-y-2', {
              'hover:cursor-not-allowed': !enabled || isDisabled,
            })}>
            <div className="flex w-full items-center gap-2 text-[14px] font-medium">
              <Icon name="RewindIcon" className="h-4 w-4" />
              <span>{t('replay')}</span>
            </div>

            <div className="text-muted-foreground text-xs font-normal">{t('captureLastMinute')}</div>
          </div>
        </Button>

        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={t('toggleRewind')}
          className="data-[state=checked]:bg-foreground/80"
        />
      </div>
    </div>
  );
};
