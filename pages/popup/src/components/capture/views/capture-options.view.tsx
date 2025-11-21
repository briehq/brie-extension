import { t } from '@extension/i18n';
import { cn, Icon, Label, RadioGroup, RadioGroupItem } from '@extension/ui';

type CaptureType = 'area' | 'viewport' | 'full-page';

interface CaptureOptionsProps {
  disabled: boolean;
  showExitCapture: boolean;
  onExitCapture: () => Promise<void>;
  onCapture: (type: CaptureType) => Promise<void>;
}

const captureTypes: Array<{ name: string; slug: CaptureType; icon: string }> = [
  {
    name: t('area'),
    slug: 'area',
    icon: 'SquareDashed',
  },
  {
    name: t('viewport'),
    slug: 'viewport',
    icon: 'AppWindowMac',
  },
  {
    name: t('fullPage'),
    slug: 'full-page',
    icon: 'RectangleVertical',
  },
];

export const CaptureOptionsView: React.FC<CaptureOptionsProps> = ({
  disabled,
  showExitCapture,
  onExitCapture,
  onCapture,
}) => {
  return (
    <>
      <RadioGroup
        className={cn('border-muted grid w-full gap-4 rounded-xl border bg-slate-100/20 p-2', {
          'grid-cols-3': !showExitCapture,
        })}>
        {showExitCapture ? (
          <button
            type="button"
            className="hover:bg-accent flex w-full items-center justify-center rounded-md border border-transparent py-4"
            onClick={onExitCapture}>
            <Icon name="X" size={20} strokeWidth={1.5} className="mr-1" />
            <span>{t('exitCaptureScreenshot')}</span>
          </button>
        ) : (
          <>
            {captureTypes.map(type => (
              <div key={type.slug}>
                <RadioGroupItem
                  value={type.slug}
                  id={type.slug}
                  className="peer sr-only"
                  onClick={() => onCapture(type.slug)}
                  disabled={disabled}
                />
                <Label
                  htmlFor={type.slug}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground flex flex-col items-center justify-between rounded-md border border-transparent py-3 hover:cursor-pointer hover:border-slate-200 dark:border-0',
                  )}>
                  <Icon name={type.icon as any} className="mb-3 size-5" strokeWidth={type.slug === 'area' ? 2 : 1.5} />
                  <span className="text-nowrap text-[11px]">{type.name}</span>
                </Label>
              </div>
            ))}
          </>
        )}
      </RadioGroup>
    </>
  );
};
