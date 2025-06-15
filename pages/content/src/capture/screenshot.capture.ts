import html2canvas from 'html2canvas';

import { t } from '@extension/i18n';

let lastPointerX = 0;
let lastPointerY = 0;
let startX: number, startY: number;
let isSelecting = false;
// let cancelled = false;
let selectionBox: HTMLDivElement;
let overlay: HTMLDivElement;
let dimensionLabel: HTMLDivElement;
let message: HTMLDivElement | null = null;
let loadingMessage: HTMLDivElement | null = null;

const waitForRepaint = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

// Helper Functions
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

  // Adjust coordinates and dimensions by the scale factors
  const scaledX = x * scaleFactor;
  const scaledY = y * scaleFactor;
  const scaledWidth = width * scaleFactor;
  const scaledHeight = height * scaleFactor;

  ctx.strokeStyle = 'red';
  ctx.lineWidth = 4;
  ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
};

// Function to crop the selected area
const cropSelectedArea = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scaleFactor: number,
): HTMLCanvasElement => {
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = width * scaleFactor; // Scale the width for higher resolution
  croppedCanvas.height = height * scaleFactor; // Scale the height for higher resolution

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

// Function to remove the "Preparing Screenshot..." label from the screenshot
const cleanCanvas = (canvas: HTMLCanvasElement, element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Save the current canvas state before clearing
  ctx.save();

  // Clear the area where the message element is
  ctx.clearRect(rect.left, rect.top, rect.width, rect.height);

  // Restore the previous canvas state to avoid affecting other parts
  ctx.restore();
};

// Create an overlay for selection
const createOverlay = () => {
  overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '9999999',
    cursor: 'crosshair',
  });
  overlay.id = 'screenshot-overlay';
  document.body.appendChild(overlay);
};

// Create the selection box
const createSelectionBox = () => {
  selectionBox = document.createElement('div');
  Object.assign(selectionBox.style, {
    position: 'absolute',
    backgroundColor: 'rgba(252, 229, 25, 0.3)',
    pointerEvents: 'none',
    zIndex: '10000000',
    border: '1px solid rgba(252, 229, 25, 0.7)',
  });
  selectionBox.id = 'selection-box';
  document.body.appendChild(selectionBox);
};

// Create the dimension label
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
    zIndex: '10000000',
  });
  dimensionLabel.id = 'dimension-label';
  document.body.appendChild(dimensionLabel);
};

// Display a loading message
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
    zIndex: '10000000',
    whiteSpace: 'nowrap',
  });
  loadingMessage.textContent = 'Preparing Screenshot...';
  loadingMessage.id = 'screenshot-loading-message';
  document.documentElement.appendChild(loadingMessage);
};

// Hide the loading message
const hideLoadingMessage = () => {
  loadingMessage?.remove();
  loadingMessage = null;
};

const onScroll = () => {
  if (message) {
    positionInstructionsMessage(lastPointerX, lastPointerY);
  }
};

// Position the instructions message dynamically
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

// Event Handlers
// Update the selection box dimensions
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

// Start the selection process
const onMouseDown = (e: MouseEvent | TouchEvent) => {
  if ('button' in e && e.button !== 0) return; // Only respond to left-click

  isSelecting = true;

  // Use viewport-relative coordinates
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

  startX = clientX;
  startY = clientY;

  document.body.style.overflow = 'hidden';

  createSelectionBox();
  createDimensionLabel();

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('mousemove', updateSelectionBox, { passive: false });
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('touchmove', updateSelectionBox, { passive: false });
  document.addEventListener('touchend', onTouchEnd);

  message?.remove();
  message = null;
};

// Handle keydown events for ESC press
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    // cancelled = true; // Mark as cancelled when ESC is pressed
    cleanup(); // Cleanup on ESC

    // Notify Background on ESC
    chrome.runtime.sendMessage({ type: 'EXIT_CAPTURE' });
  }
};

// Start the selection process for touch
const onTouchStart = (e: TouchEvent) => {
  isSelecting = true;
  startX = e.touches[0].pageX;
  startY = e.touches[0].pageY;

  createSelectionBox();
  e.preventDefault();
};

// Finish the selection and capture the screenshot
const onMouseUp = async (e: MouseEvent | TouchEvent) => {
  if (!isSelecting) return;

  isSelecting = false;

  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

  const minX = Math.min(startX, clientX);
  const minY = Math.min(startY, clientY);

  const width = Math.abs(clientX - startX);
  const height = Math.abs(clientY - startY);

  cleanup();

  /**
   * @todo
   * Improve show loading message logic.
   * Note: The message should not be visible on screenshots. Only for user.
   */
  // showLoadingMessage();

  await waitForRepaint();

  await captureScreenshots(minX, minY, width, height);
  // hideLoadingMessage();
};

// Move the instructions message with the cursor
const onMouseMove = (e: MouseEvent) => {
  const { clientX, clientY } = e;

  lastPointerX = clientX;
  lastPointerY = clientY;
  positionInstructionsMessage(lastPointerX, lastPointerY);
};

// Finish the selection for touch and capture the screenshot
const onTouchEnd = async (e: TouchEvent) => {
  if (!isSelecting) return;

  isSelecting = false;

  const clientX = e.changedTouches[0].pageX;
  const clientY = e.changedTouches[0].pageY;

  const width = Math.abs(clientX - startX);
  const height = Math.abs(clientY - startY);

  cleanup();
  showLoadingMessage();

  await waitForRepaint();

  await captureScreenshots(startX, startY, width, height);
  hideLoadingMessage();
};

const onTouchMove = (e: TouchEvent) => {
  const { clientX, clientY } = e.touches[0];

  lastPointerX = clientX;
  lastPointerY = clientY;
  positionInstructionsMessage(lastPointerX, lastPointerY);
};

// Show instructions message
const showInstructions = () => {
  if (message) return; // Prevent duplicate creation of the message

  message = document.createElement('div');
  Object.assign(message.style, {
    position: 'absolute',
    background: 'rgba(252, 229, 25, 0.7)',
    color: '#09080e',
    padding: '10px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600',
    zIndex: '10000000',
  });
  message.textContent = t('selectArea');
  document.body.appendChild(message);

  // Move instructions message on mouse/touch move
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('touchmove', onTouchMove);
  document.addEventListener('scroll', onScroll);
};

const captureTab = (): Promise<string> =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, response => {
      if (chrome.runtime.lastError) {
        // Error from Chrome's runtime
        console.log('chrome.runtime.lastError.message', chrome.runtime.lastError.message);

        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response || !response.success) {
        console.log('response?.message', response?.message);
        // Error from the response itself
        reject(new Error(response?.message || 'Failed to capture screenshot.'));
      } else {
        // Successfully received data URL
        resolve(response.dataUrl);
      }
    });
  });

const checkIfNativeCaptureAvailable = () =>
  new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'checkNativeCapture' }, response => {
      resolve(response?.isAvailable || false);
    });
  });

// Screenshot Capturing
const captureScreenshots = async (x: number, y: number, width: number, height: number) => {
  try {
    const scaleFactor = window.devicePixelRatio || 2;

    // Check if Native Capture API is available
    const isNativeCaptureAvailable = await checkIfNativeCaptureAvailable();

    if (isNativeCaptureAvailable) {
      // Use Native Capture API through the background script
      // if (loadingMessage) loadingMessage.hidden = true;

      const dataUrl = await captureTab();

      // if (loadingMessage) loadingMessage.hidden = false;

      // Process the screenshot from the Native Capture API
      return processScreenshot(dataUrl, x, y, width, height, scaleFactor);
    } else {
      // Fallback to html2canvas logic
      const fullCanvas = await html2canvas(document.body, {
        useCORS: true, // Ensures external resources don't block rendering
        allowTaint: true, // Skips cross-origin restrictions
        logging: false, // Disables debug logs
        removeContainer: true, // Removes temporary DOM elements
        scale: scaleFactor, // Increase the scale factor for higher resolution
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

      return processScreenshot(fullCanvas.toDataURL('image/png', 1.0), x, y, width, height, scaleFactor);
    }
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  }
};

// Helper: Process the screenshot
const processScreenshot = async (
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
  scaleFactor: number,
) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = dataUrl;
  await new Promise(resolve => (img.onload = resolve));

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = img.width;
  fullCanvas.height = img.height;

  const ctx: CanvasRenderingContext2D | null = fullCanvas.getContext('2d');
  ctx?.drawImage(img, 0, 0);

  // Crop the selected area
  const croppedCanvas = cropSelectedArea(fullCanvas, x, y, width, height, scaleFactor);

  // Add a red boundary box on the full screenshot
  addBoundaryBox(fullCanvas, x, y, width, height, scaleFactor);

  // Convert canvases to images
  let fullScreenshotImage: string | null = fullCanvas.toDataURL('image/jpeg', 1);
  let croppedScreenshotImage =
    croppedCanvas.width && croppedCanvas.height ? croppedCanvas.toDataURL('image/jpeg', 1) : null;

  saveAndNotify({ primary: croppedScreenshotImage, secondary: fullScreenshotImage });

  // Cleanup
  fullScreenshotImage = null;
  croppedScreenshotImage = null;
  croppedCanvas?.remove();
  fullCanvas?.remove();
};

// Save and notify with screenshots
const saveAndNotify = ({ secondary, primary }: { secondary: string; primary: string | null }) => {
  const timestamp = Date.now();

  /**
   * @todo use safePostMessage
   * currently brakes the build (because of extend)
   */
  window.postMessage(
    {
      type: 'ADD_RECORD',
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

  const event = new CustomEvent('DISPLAY_MODAL', {
    detail: {
      screenshots: [...(primary ? [{ name: 'primary', image: primary }] : []), { name: 'secondary', image: secondary }],
    },
  });
  window.dispatchEvent(event);
};

// Initialization
export const startScreenshotCapture = async ({ type }: { type: 'full-page' | 'viewport' | 'area' }) => {
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
    });

    saveAndNotify({ primary: null, secondary: fullCanvas.toDataURL('image/png', 1.0) });
    return;
  }

  if (type === 'viewport') {
    const viewport = await captureTab();

    saveAndNotify({ primary: null, secondary: viewport });

    return;
  }

  createOverlay();
  showInstructions();

  overlay.addEventListener('keydown', onKeyDown); // Listen for ESC key press
  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('touchstart', onMouseDown);
};

// Clean up all temporary elements
export const cleanup = (): void => {
  isSelecting = false;

  // Reset any necessary state
  // startX = 0;
  // startY = 0;
  // cancelled = true;

  overlay?.remove();
  selectionBox?.remove();
  dimensionLabel?.remove();
  message?.remove();
  loadingMessage?.remove();

  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('mousemove', updateSelectionBox);
  // document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('touchmove', updateSelectionBox);
  document.removeEventListener('touchend', onTouchEnd);
  document.removeEventListener('scroll', onScroll);
};
