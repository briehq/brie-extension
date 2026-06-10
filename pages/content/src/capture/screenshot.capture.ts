import html2canvas from 'html2canvas';
import { v4 as uuidv4 } from 'uuid';

import { t } from '@extension/i18n';
import type { Screenshot } from '@extension/shared';
import { CAPTURE, RECORD, SCREENSHOT } from '@extension/shared';

let lastPointerX = 0;
let lastPointerY = 0;
let startX: number, startY: number;
let isSelecting = false;
let selectionBox: HTMLDivElement;
let overlay: HTMLDivElement;
let dimensionLabel: HTMLDivElement;
let message: HTMLDivElement | null = null;
let loadingMessage: HTMLDivElement | null = null;

let selectionMouseUpHandler: ((e: MouseEvent) => void) | null = null;
let selectionTouchEndHandler: ((e: TouchEvent) => void) | null = null;

const waitForRepaint = () =>
  new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const getShadowHost = () => document.getElementById('brie-root');

const addBoundaryBox = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scaleFactor: number,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scaledX = x * scaleFactor;
  const scaledY = y * scaleFactor;
  const scaledWidth = width * scaleFactor;
  const scaledHeight = height * scaleFactor;

  ctx.strokeStyle = 'red';
  ctx.lineWidth = 4;
  ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
};

const cropSelectedArea = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scaleFactor: number,
): HTMLCanvasElement => {
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = width * scaleFactor;
  croppedCanvas.height = height * scaleFactor;

  const ctx = croppedCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get 2D context for cropped canvas.');
  }

  ctx.drawImage(
    canvas,
    x * scaleFactor,
    y * scaleFactor,
    width * scaleFactor,
    height * scaleFactor,
    0,
    0,
    width * scaleFactor,
    height * scaleFactor,
  );

  return croppedCanvas;
};

const cleanCanvas = (canvas: HTMLCanvasElement, element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.clearRect(rect.left, rect.top, rect.width, rect.height);
  ctx.restore();
};

const createOverlay = () => {
  overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '9999999999',
    cursor: 'crosshair',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    pointerEvents: 'auto',
  });
  overlay.id = 'screenshot-overlay';
  document.body.appendChild(overlay);
};

const createSelectionBox = () => {
  selectionBox = document.createElement('div');
  Object.assign(selectionBox.style, {
    position: 'absolute',
    backgroundColor: 'rgba(252, 229, 25, 0.3)',
    pointerEvents: 'none',
    zIndex: '10000000000',
    border: '1px solid rgba(252, 229, 25, 0.7)',
  });
  selectionBox.id = 'selection-box';
  document.body.appendChild(selectionBox);
};

const createDimensionLabel = () => {
  dimensionLabel = document.createElement('div');
  Object.assign(dimensionLabel.style, {
    position: 'absolute',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '5px 10px',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '10000000000',
  });
  dimensionLabel.id = 'dimension-label';
  document.body.appendChild(dimensionLabel);
};

const showLoadingMessage = () => {
  loadingMessage = document.createElement('div');
  Object.assign(loadingMessage.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#09080e',
    fontWeight: '600',
    backgroundColor: 'rgba(252, 229, 25, 0.7)',
    padding: '10px 25px',
    borderRadius: '8px',
    fontSize: '16px',
    zIndex: '10000000000',
    whiteSpace: 'nowrap',
  });
  loadingMessage.textContent = 'Preparing Screenshot...';
  loadingMessage.id = 'screenshot-loading-message';
  document.documentElement.appendChild(loadingMessage);
};

const hideLoadingMessage = () => {
  loadingMessage?.remove();
  loadingMessage = null;
};

const onScroll = () => {
  if (message) {
    positionInstructionsMessage(lastPointerX, lastPointerY);
  }
};

const positionInstructionsMessage = (clientX: number, clientY: number) => {
  if (!message) return;

  const offset = 15;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  if (clientX + message.offsetWidth + offset > window.innerWidth) {
    message.style.left = `${clientX - message.offsetWidth - offset + scrollX}px`;
  } else {
    message.style.left = `${clientX + offset + scrollX}px`;
  }

  message.style.top = `${clientY + offset + scrollY}px`;
};

const updateSelectionBox = (e: MouseEvent | TouchEvent) => {
  if (!isSelecting) return;

  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

  const width = Math.abs(clientX - startX);
  const height = Math.abs(clientY - startY);

  const left = Math.min(startX, clientX);
  const top = Math.min(startY, clientY);

  Object.assign(selectionBox.style, {
    width: `${width}px`,
    height: `${height}px`,
    left: `${left + window.scrollX}px`,
    top: `${top + window.scrollY}px`,
  });

  Object.assign(dimensionLabel.style, {
    left: `${left + window.scrollX}px`,
    top: `${top + window.scrollY - 35}px`,
  });

  dimensionLabel.textContent = `W: ${width.toFixed(0)}px, H: ${height.toFixed(0)}px`;
};

const onMouseDown = (e: MouseEvent | TouchEvent, mode: 'single' | 'multiple') => {
  if ('button' in e && e.button !== 0) return;

  if (selectionMouseUpHandler) {
    document.removeEventListener('mouseup', selectionMouseUpHandler);
    selectionMouseUpHandler = null;
  }
  if (selectionTouchEndHandler) {
    document.removeEventListener('touchend', selectionTouchEndHandler);
    selectionTouchEndHandler = null;
  }

  isSelecting = true;

  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

  startX = clientX;
  startY = clientY;

  document.body.style.overflow = 'hidden';

  createSelectionBox();
  createDimensionLabel();

  selectionMouseUpHandler = (ev: MouseEvent) => onMouseUp(ev, mode);
  selectionTouchEndHandler = (ev: TouchEvent) => onTouchEnd(ev, mode);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('mousemove', updateSelectionBox, { passive: true });
  document.addEventListener('mouseup', selectionMouseUpHandler);
  document.addEventListener('touchmove', updateSelectionBox, { passive: true });
  document.addEventListener('touchend', selectionTouchEndHandler);

  message?.remove();
  message = null;
};

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    cleanup();
    showPreview();

    chrome.runtime.sendMessage({ type: CAPTURE.EXIT });
  }
};

const onTouchStart = (e: TouchEvent) => {
  isSelecting = true;
  startX = e.touches[0].pageX;
  startY = e.touches[0].pageY;

  createSelectionBox();
  e.preventDefault();
};

const onMouseUp = async (e: MouseEvent | TouchEvent, mode: 'single' | 'multiple') => {
  if (!isSelecting) return;

  isSelecting = false;

  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

  const minX = Math.min(startX, clientX);
  const minY = Math.min(startY, clientY);

  const width = Math.abs(clientX - startX);
  const height = Math.abs(clientY - startY);

  cleanup();

  await waitForRepaint();

  const isSmall = width < 1 && height < 1;
  const area = isSmall
    ? { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
    : { x: minX, y: minY, width, height };

  await captureScreenshots({ ...area, mode });
};

const onMouseMove = (e: MouseEvent) => {
  const { clientX, clientY } = e;

  lastPointerX = clientX;
  lastPointerY = clientY;
  positionInstructionsMessage(lastPointerX, lastPointerY);
};

const onTouchEnd = async (e: TouchEvent, mode: 'single' | 'multiple') => {
  if (!isSelecting) return;

  isSelecting = false;

  const clientX = e.changedTouches[0].pageX;
  const clientY = e.changedTouches[0].pageY;

  const width = Math.abs(clientX - startX);
  const height = Math.abs(clientY - startY);

  cleanup();
  showLoadingMessage();

  await waitForRepaint();

  const isSmall = width < 1 && height < 1;
  const area = isSmall
    ? { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
    : { x: startX, y: startY, width, height };

  await captureScreenshots({ ...area, mode });
  hideLoadingMessage();
};

const onTouchMove = (e: TouchEvent) => {
  const { clientX, clientY } = e.touches[0];

  lastPointerX = clientX;
  lastPointerY = clientY;
  positionInstructionsMessage(lastPointerX, lastPointerY);
};

const hidePreview = () => {
  const shadowHost = getShadowHost();
  if (shadowHost) shadowHost.hidden = true;
};

const showPreview = () => {
  const shadowHost = getShadowHost();
  if (shadowHost) shadowHost.hidden = false;
};

const showInstructions = () => {
  if (message) return;

  message = document.createElement('div');
  Object.assign(message.style, {
    position: 'absolute',
    background: 'rgba(252, 229, 25, 0.7)',
    color: '#09080e',
    padding: '10px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600',
    zIndex: '10000000000',
  });
  message.textContent = t('selectArea');
  document.body.appendChild(message);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('touchmove', onTouchMove);
  document.addEventListener('scroll', onScroll);
};

const captureTab = (): Promise<string> =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: CAPTURE.VISIBLE_TAB }, response => {
      if (chrome.runtime.lastError) {
        console.log('chrome.runtime.lastError.message', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response || !response.success) {
        console.log('response?.message', response?.message);
        reject(new Error(response?.message || 'Failed to capture screenshot.'));
      } else {
        resolve(response.dataUrl);
      }
    });
  });

const checkIfNativeCaptureAvailable = () =>
  new Promise(resolve => {
    chrome.runtime.sendMessage({ action: CAPTURE.CHECK_NATIVE }, response => {
      resolve(response?.isAvailable || false);
    });
  });

const captureScreenshots = async ({
  x,
  y,
  width,
  height,
  mode,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  mode: 'single' | 'multiple';
}) => {
  try {
    const scaleFactor = window.devicePixelRatio || 2;

    const isNativeCaptureAvailable = await checkIfNativeCaptureAvailable();

    if (isNativeCaptureAvailable) {
      const dataUrl = await captureTab();
      return processScreenshot({ dataUrl, x, y, width, height, scaleFactor, mode });
    } else {
      const fullCanvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        removeContainer: true,
        scale: scaleFactor,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        ignoreElements: (element: Element) => {
          return (
            element.id === 'screenshot-overlay' ||
            element.id === 'selection-box' ||
            element.id === 'dimension-label' ||
            element.id === 'screenshot-loading-message'
          );
        },
      });

      return processScreenshot({
        dataUrl: fullCanvas.toDataURL('image/png', 1.0),
        x,
        y,
        width,
        height,
        scaleFactor,
        mode,
      });
    }
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    showPreview();
  }
};

const processScreenshot = async ({
  dataUrl,
  x,
  y,
  width,
  height,
  scaleFactor,
  mode,
}: {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  mode: 'single' | 'multiple';
}) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = dataUrl;
  await new Promise(resolve => (img.onload = resolve));

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = img.width;
  fullCanvas.height = img.height;

  const ctx: CanvasRenderingContext2D | null = fullCanvas.getContext('2d');
  ctx?.drawImage(img, 0, 0);

  const croppedCanvas = cropSelectedArea(fullCanvas, x, y, width, height, scaleFactor);

  addBoundaryBox(fullCanvas, x, y, width, height, scaleFactor);

  let fullScreenshotImage: string | null = fullCanvas.toDataURL('image/jpeg', 1);
  let croppedScreenshotImage =
    croppedCanvas.width && croppedCanvas.height ? croppedCanvas.toDataURL('image/jpeg', 1) : null;

  saveAndNotify({
    screenshots: [
      { src: croppedScreenshotImage || '', isPrimary: true },
      ...(mode === 'single' ? [{ src: fullScreenshotImage }] : []),
    ],
    mode,
  });

  fullScreenshotImage = null;
  croppedScreenshotImage = null;
  croppedCanvas?.remove();
  fullCanvas?.remove();
};

const saveAndNotify = ({ screenshots, mode }: { screenshots: Screenshot[]; mode: 'single' | 'multiple' }) => {
  const timestamp = Date.now();
  const screenshotName: string = `${location.host}-${timestamp}`.replaceAll('.', '-');

  // Using window.postMessage rather than safePostMessage — the latter breaks the extend build.
  window.postMessage(
    {
      type: RECORD.ADD,
      payload: {
        type: 'event',
        event: 'capture',
        recordType: 'events',
        domain: 'screenshot',
        source: 'client',
        timestamp,
      },
    },
    '*',
  );

  const eventName = mode === 'single' ? SCREENSHOT.DISPLAY : SCREENSHOT.STORE;

  const event = new CustomEvent(eventName, {
    detail: {
      screenshots: screenshots.map(screenshot => ({
        ...screenshot,
        name: screenshotName,
        id: uuidv4(),
      })),
    },
  });

  window.dispatchEvent(event);
};

export const startScreenshotCapture = async ({
  type,
  mode = 'multiple',
}: {
  type: 'full-page' | 'viewport' | 'area';
  mode: 'single' | 'multiple';
}) => {
  if (type === 'full-page') {
    const scaleFactor = window.devicePixelRatio || 2;
    const fullCanvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      removeContainer: true,
      scale: scaleFactor,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      ignoreElements: (element: Element) => {
        return [
          'brie-minimized-preview',
          'screenshot-overlay',
          'selection-box',
          'dimension-label',
          'screenshot-loading-message',
        ].includes(element.id);
      },
    });

    saveAndNotify({ screenshots: [{ src: fullCanvas.toDataURL('image/png', 1.0) }], mode });
    return;
  }

  if (type === 'viewport') {
    hidePreview();
    await waitForRepaint();
    try {
      const viewport = await captureTab();
      saveAndNotify({ screenshots: [{ src: viewport }], mode });
    } finally {
      showPreview();
    }
    return;
  }

  createOverlay();
  showInstructions();
  hidePreview();

  overlay.addEventListener('keydown', onKeyDown);
  overlay.addEventListener('mousedown', e => onMouseDown(e, mode));
  overlay.addEventListener('touchstart', e => onMouseDown(e, mode));
};

export const cleanup = (): void => {
  isSelecting = false;

  overlay?.remove();
  selectionBox?.remove();
  dimensionLabel?.remove();
  message?.remove();
  loadingMessage?.remove();

  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('mousemove', updateSelectionBox);
  // Cursor-tracking listeners attached by showInstructions() must be removed here — otherwise
  // each cancelled capture session leaks another pair for the page's lifetime.
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('touchmove', onTouchMove);
  if (selectionMouseUpHandler) {
    document.removeEventListener('mouseup', selectionMouseUpHandler);
    selectionMouseUpHandler = null;
  }
  document.removeEventListener('touchmove', updateSelectionBox);
  if (selectionTouchEndHandler) {
    document.removeEventListener('touchend', selectionTouchEndHandler);
    selectionTouchEndHandler = null;
  }
  document.removeEventListener('scroll', onScroll);
};
