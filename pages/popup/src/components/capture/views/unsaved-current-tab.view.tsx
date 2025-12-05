import { t } from '@extension/i18n';
import { Icon } from '@extension/ui';

interface UnsavedCurrentTabProps {
  onDiscard: () => Promise<void>;
}

export const UnsavedCurrentTabView: React.FC<UnsavedCurrentTabProps> = ({ onDiscard }) => (
  <div className="border-muted grid w-full gap-4 rounded-xl border bg-slate-100/20 p-2">
    <button
      type="button"
      className="hover:bg-accent flex w-full items-center justify-center rounded-md border border-transparent py-4"
      onClick={onDiscard}>
      <Icon name="X" size={20} strokeWidth={1.5} className="mr-1" />
      <span>{t('exitCaptureScreenshot')}</span>
    </button>
  </div>
);
