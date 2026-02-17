import { t } from '@extension/i18n';
import type { CaptureMode, RecordArea } from '@extension/shared';

export const CAPTURE_MODE_OPTIONS: { value: CaptureMode; label: string }[] = [
  { value: 'area', label: t('area') },
  { value: 'viewport', label: t('viewport') },
  { value: 'fullPage', label: t('fullPage') },
];

export const RECORD_AREA_OPTIONS: { value: RecordArea; label: string }[] = [
  { value: 'tab', label: t('recordAreaTab') },
  { value: 'desktop', label: t('desktop') },
];

export const CAPTURE_TITLE: Record<CaptureMode, string> = {
  area: t('captureArea'),
  viewport: t('captureWindow'),
  fullPage: t('captureFullscreen'),
};

export const RECORD_TITLE: Record<RecordArea, string> = {
  tab: t('recordTab'),
  desktop: t('recordDesktop'),
};
