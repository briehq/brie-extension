import { t } from '@extension/i18n';
import { Button, Icon } from '@extension/ui';

export const SlicesHistoryButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className="mt-4 flex items-center justify-center">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="dark:text-muted-foreground h-6 gap-x-1.5 text-slate-600 dark:hover:text-white"
        onClick={onClick}>
        {t('sliceHistoryTitle')} <Icon name="ImageIcon" className="size-4" />
      </Button>
    </div>
  );
};
