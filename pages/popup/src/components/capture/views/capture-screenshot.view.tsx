import { t } from '@extension/i18n';
import type { CaptureMode } from '@extension/shared';
import { Icon } from '@extension/ui';

import { CAPTURE_MODE_OPTIONS, CAPTURE_TITLE } from '@src/constants';

import { ButtonGroup, CollapsibleActionCard } from '../ui';

interface CaptureScreenshotViewProps {
  isDisabled: boolean;
  isActive: boolean;
  mode: CaptureMode;
  open: boolean;
  onToggleOpen: () => void;
  onPrimaryAction: () => void;
  onChange: (mode: CaptureMode) => void;
}

const CAPTURE_ICON: Record<CaptureMode, React.ReactNode> = {
  area: <Icon name="SquareDashed" className="h-4 w-4" />,
  viewport: <Icon name="AppWindowMac" className="h-4 w-4" />,
  fullPage: <Icon name="RectangleVertical" className="h-4 w-4" />,
};

export const CaptureScreenshotView = ({
  isDisabled,
  isActive,
  mode,
  open,
  onToggleOpen,
  onPrimaryAction,
  onChange,
}: CaptureScreenshotViewProps) => {
  const title = CAPTURE_TITLE[mode];
  const icon = CAPTURE_ICON[mode];

  return (
    <CollapsibleActionCard
      isDisabled={isDisabled}
      isActive={isActive}
      icon={icon}
      activeTitle={t('exitAction', title)}
      title={title}
      open={open}
      onToggleOpen={onToggleOpen}
      onPrimaryAction={onPrimaryAction}
      primaryAriaLabel={t('runAction', title)}>
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-xs">{t('captureMode')}</div>
        <ButtonGroup value={mode} options={CAPTURE_MODE_OPTIONS} ariaLabel="Capture mode" onChange={onChange} />
      </div>
    </CollapsibleActionCard>
  );
};
