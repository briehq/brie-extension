import { action } from 'webextension-polyfill';

const STATE_COLORS: Record<string, string> = {
  capturing: '#22C55E',
  paused: '#F59E0B',
  preparing: '#3B82F6',
};

const DOT_RADIUS = 14;
const DOT_X = 108;
const DOT_Y = 20;
const ICON_SIZE = 128;

const loadIcon = (path: string): Promise<ImageBitmap> =>
  fetch(chrome.runtime.getURL(path))
    .then(r => r.blob())
    .then(blob => createImageBitmap(blob));

const drawDotIcon = async (color?: string) => {
  const img = await loadIcon('brie-logo.png');
  const canvas = new OffscreenCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);

  if (color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(DOT_X, DOT_Y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
  await action.setIcon({ imageData: imageData as unknown as ImageData });
};

// /** @deprecated kept for reference — badge-text approach */
// const RECORDING_BADGE = '●';
// const badgeTextApproach = (color?: string) => {
//   action.setBadgeText({ text: color ? RECORDING_BADGE : '' });
//   action.setBadgeBackgroundColor({ color: color ?? '' });
// };

export const initBadgeListener = () => {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    const captureState = changes['capture-state-storage-key'];
    if (!captureState) return;

    const { state } = captureState.newValue ?? {};
    const color = STATE_COLORS[state];

    drawDotIcon(color);
  });
};
