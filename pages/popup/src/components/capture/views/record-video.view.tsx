import type { ReactNode } from 'react';

import type { RecordArea } from '@extension/shared';
import { Icon } from '@extension/ui';

import { RECORD_AREA_OPTIONS, RECORD_TITLE } from '@src/constants';

import { ButtonGroup, CollapsibleActionCard, StatusBadge } from '../ui';

interface RecordSectionViewProps {
  isDisabled: boolean;
  isActive: boolean;
  mode: RecordArea;
  open: boolean;
  isMicEnabled: boolean;
  onToggleOpen: () => void;
  onPrimaryAction: () => void;
  onChange: (next: RecordArea) => void;
  onToggleMic: () => void;
}

const RECORD_ICON: Record<RecordArea, ReactNode> = {
  tab: <Icon name="AppWindow" className="h-4 w-4" />,
  desktop: <Icon name="LaptopMinimal" className="h-4 w-4" />,
};

export const RecordVideoView = ({
  isDisabled,
  isActive,
  mode,
  open,
  isMicEnabled,
  onToggleOpen,
  onPrimaryAction,
  onChange,
  onToggleMic,
}: RecordSectionViewProps) => {
  const title = RECORD_TITLE[mode];
  const icon = RECORD_ICON[mode];

  return (
    <CollapsibleActionCard
      isDisabled={isDisabled}
      isActive={isActive}
      icon={icon}
      title={title}
      activeTitle={`Stop ${title}`}
      open={open}
      onToggleOpen={onToggleOpen}
      onPrimaryAction={onPrimaryAction}
      primaryAriaLabel={`Start ${title}`}
      right={
        isMicEnabled && (
          <StatusBadge
            state={isMicEnabled}
            icon={<Icon name={isMicEnabled ? 'Mic' : 'MicOff'} className="h-3.5 w-3.5" />}
            label={isMicEnabled ? 'On' : 'Off'}
            ariaLabel="Toggle system audio"
            onClick={onToggleMic}
          />
        )
      }>
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-xs">Record area</div>
        <ButtonGroup value={mode} options={RECORD_AREA_OPTIONS} ariaLabel="Record area" onChange={onChange} />
      </div>
    </CollapsibleActionCard>
  );
};
