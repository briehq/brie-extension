import { action } from 'webextension-polyfill';

const RECORDING_BADGE = '●';
const RECORDING_COLOR = '#EF4444';
const ACTIVE_STATES = ['capturing', 'paused', 'preparing'];

export const initBadgeListener = () => {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    const captureState = changes['capture-state-storage-key'];
    if (!captureState) return;

    const { state } = captureState.newValue ?? {};
    const isActive = ACTIVE_STATES.includes(state);

    action.setBadgeText({ text: isActive ? RECORDING_BADGE : '' });
    action.setBadgeBackgroundColor({ color: isActive ? RECORDING_COLOR : '' });
  });
};
