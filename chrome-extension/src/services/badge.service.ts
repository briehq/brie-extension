import { action, storage } from 'webextension-polyfill';

const RECORDING_BADGE = '●';
const CAPTURE_STATE_KEY = 'capture-state-storage-key';
const CAPTURE_TAB_KEY = 'capture-tab-storage-key';

const STATE_COLORS: Record<string, string> = {
  capturing: '#22C55E',
  paused: '#F59E0B',
  preparing: '#3B82F6',
};

const updateBadge = (tabId: number | null, color: string) => {
  action.setBadgeText({ text: '' });

  if (color && tabId) {
    action.setBadgeText({ tabId, text: RECORDING_BADGE });
    action.setBadgeBackgroundColor({ tabId, color: 'transparent' });
    action.setBadgeTextColor({ tabId, color });
  }
};

export const initBadgeListener = () => {
  chrome.storage.local.get([CAPTURE_STATE_KEY, CAPTURE_TAB_KEY], result => {
    const { state } = result[CAPTURE_STATE_KEY] ?? {};
    updateBadge(result[CAPTURE_TAB_KEY] ?? null, STATE_COLORS[state] ?? '');
  });

  let tabId: number | null = null;
  let color = '';

  storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes[CAPTURE_STATE_KEY] && !changes[CAPTURE_TAB_KEY]) return;

    if (changes[CAPTURE_STATE_KEY]) {
      const { state } = changes[CAPTURE_STATE_KEY].newValue ?? ({} as any);
      color = STATE_COLORS[state] ?? '';
    }

    if (changes[CAPTURE_TAB_KEY]) {
      tabId = (changes[CAPTURE_TAB_KEY].newValue as number) ?? null;
    }

    updateBadge(tabId, color);
  });
};
