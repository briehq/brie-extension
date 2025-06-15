import html2canvas from 'html2canvas';

import { MessageType } from '@extension/shared';

const isFirefox = process.env.__FIREFOX__ === 'true';

let startX: number, startY: number;
let isSelecting = false;
// let cancelled = false;
let selectionBox: HTMLDivElement;
let overlay: HTMLDivElement;
let dimensionLabel: HTMLDivElement;
let message: HTMLDivElement | null = null;
let loadingMessage: HTMLDivElement | null = null;

// --- Helper Functions ---

// Function to draw the red boundary box on the full screenshot
const addBoundaryBox = (canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
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

  // Correct cropping offsets and alignment
  const adjustedStartX = startX - window.scrollX;
  const adjustedStartY = startY - window.scrollY;

  // Calculate the ratio based on the full-page canvas size and the visible viewport size
  const ratioX = canvas.width / window.innerWidth;
  const ratioY = canvas.height / window.innerHeight;

  ctx?.drawImage(
    canvas, // Use the full-page canvas as the source
    adjustedStartX * ratioX, // Adjust X coordinate
    adjustedStartY * ratioY, // Adjust Y coordinate
    width * ratioX, // Adjust width with ratio
    height * ratioY, // Adjust height with ratio
    0, // X coordinate in the cropped canvas
    0, // Y coordinate in the cropped canvas
    width * scaleFactor, // Apply scale factor for better resolution
    height * scaleFactor, // Apply scale factor for better resolution
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

  document.documentElement.appendChild(loadingMessage);
};

// Hide the loading message
const hideLoadingMessage = () => {
  loadingMessage?.remove();
  loadingMessage = null;
};

// Clean up all temporary elements
const cleanup = () => {
  isSelecting = false;

  //   startX = 0;
  //   startY = 0;
  //   cancelled = true;

  overlay?.remove();
  selectionBox?.remove();
  dimensionLabel?.remove();
  message?.remove();
  loadingMessage?.remove();

  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('mousemove', updateSelectionBox);
  //   document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('touchmove', updateSelectionBox);
  document.removeEventListener('touchend', onTouchEnd);
};

// Position the instructions message dynamically
const positionInstructionsMessage = (clientX: number, clientY: number) => {
  if (!message) return; // Ensure message is created before using

  const offset = 15;

  // Position message dynamically based on viewport
  if (clientX + message.offsetWidth + offset > window.innerWidth) {
    message.style.left = `${clientX - message.offsetWidth - offset}px`;
  } else {
    message.style.left = `${clientX + offset}px`;
  }

  message.style.top = `${clientY + offset}px`;
};

// --- Event Handlers ---

// Update the selection box dimensions
const updateSelectionBox = (e: MouseEvent | TouchEvent) => {
  if (!isSelecting) return;

  const clientX = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
  const clientY = 'touches' in e ? e.touches[0].pageY : (e as MouseEvent).pageY;

  const width = Math.abs(clientX - startX);
  const height = Math.abs(clientY - startY);

  Object.assign(selectionBox.style, {
    width: `${width}px`,
    height: `${height}px`,
    left: `${Math.min(startX, clientX)}px`,
    top: `${Math.min(startY, clientY)}px`,
  });

  Object.assign(dimensionLabel.style, {
    left: `${Math.min(startX, clientX)}px`,
    top: `${Math.min(startY, clientY) - 35}px`,
  });
  dimensionLabel.textContent = `W: ${width.toFixed(0)}px, H: ${height.toFixed(0)}px`;
};

// Start the selection process
const onMouseDown = (e: MouseEvent | TouchEvent) => {
  if ('button' in e && e.button !== 0) return; // Only respond to left-click (for mouse events)

  isSelecting = true;
  const clientX = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
  const clientY = 'touches' in e ? e.touches[0].pageY : (e as MouseEvent).pageY;

  startX = clientX;
  startY = clientY;

  document.body.style.overflow = 'hidden';
  createSelectionBox();
  createDimensionLabel();

  // Add keydown event listener
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
    chrome.runtime.sendMessage({ type: MessageType.EXIT_CAPTURE });
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

  const clientX = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
  const clientY = 'touches' in e ? e.touches[0].pageY : (e as MouseEvent).pageY;

  const width = Math.abs(clientX - startX);
  const height = Math.abs(clientY - startY);

  cleanup();
  showLoadingMessage();

  await captureScreenshots(startX, startY, width, height);
  hideLoadingMessage();
};

// Move the instructions message with the cursor
const onMouseMove = (e: MouseEvent) => {
  const { clientX, clientY } = e;
  positionInstructionsMessage(clientX, clientY);
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

  await captureScreenshots(startX, startY, width, height);
  hideLoadingMessage();
};

const onTouchMove = (e: TouchEvent) => {
  const { clientX, clientY } = e.touches[0];
  positionInstructionsMessage(clientX, clientY);
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
  message.textContent = 'Click or drag to select area for screenshot';
  document.body.appendChild(message);

  // Move instructions message on mouse/touch move
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('touchmove', onTouchMove);
};

// --- Screenshot Capturing ---

const captureScreenshots = async (x: number, y: number, width: number, height: number) => {
  try {
    const scaleFactor = window.devicePixelRatio || 2;

    // Capture full screenshot
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
      //   ignoreElements: element => {
      //     // Exclude hidden elements or those with specific attributes
      //  const isCrossOriginImage =
      //       element.tagName === 'IMG' && !element.src.startsWith(window.location.origin);
      //     return (
      //       element.tagName === 'IFRAME' || // Ignore iframes
      //       isCrossOriginImage || // Ignore cross-origin images
      //       element.hasAttribute('aria-hidden') || // Accessibility-related hidden elements
      //       element.style.display === 'none' || // Elements explicitly hidden
      //       element.style.visibility === 'hidden' || // Invisible elements
      //       element.style.opacity === '0' // Fully transparent elements
      //     );
      //   },
    });

    // Crop the selected area
    const croppedCanvas = cropSelectedArea(fullCanvas, x, y, width, height, scaleFactor);

    // Add a red boundary box on the full screenshot
    addBoundaryBox(fullCanvas, x, y, width, height);

    // Convert canvases to images
    let fullScreenshotImage: string | null = fullCanvas.toDataURL('image/png', 1.0);
    let croppedScreenshotImage =
      croppedCanvas.width && croppedCanvas.height ? croppedCanvas.toDataURL('image/png', 1.0) : null;

    saveAndNotify({ cropped: croppedScreenshotImage, full: fullScreenshotImage });

    fullScreenshotImage = null;
    croppedScreenshotImage = null;
    croppedCanvas?.remove();
    fullCanvas?.remove();
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  }
};

// Save and notify with screenshots
const saveAndNotify = ({ full, cropped }: { full: string; cropped: string | null }) => {
  const event = new CustomEvent('DISPLAY_MODAL', {
    detail: { screenshots: [...(cropped ? [{ name: 'cropped', image: cropped }] : []), { name: 'full', image: full }] },
  });
  window.dispatchEvent(event);
};

// Initialization
export const startScreenshotCapture = () => {
  createOverlay();
  showInstructions();

  overlay.addEventListener('keydown', onKeyDown); // Listen for ESC key press
  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('touchstart', onMouseDown);
};
