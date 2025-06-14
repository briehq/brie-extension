/**
 * Heuristic to detect whether device emulation mode is likely active.
 */
export const isLikelyEmulated = (): boolean => {
  const dpr = window.devicePixelRatio;
  const ua = navigator.userAgent;
  const hasTouch = 'ontouchstart' in window;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isMobileUA = /Mobi|Android|iPhone|iPad/i.test(ua);
  const isSmall = window.innerWidth < 800;
  const spoofedTouch = maxTouchPoints > 0 && !hasTouch;
  const suspiciousDesktopUA = !isMobileUA && isSmall;
  const suspiciousZoomOrDPR = dpr >= 2 && screen.width < 800;
  const emulatedButLooksReal = isMobileUA && isSmall && maxTouchPoints > 0;

  return spoofedTouch || suspiciousDesktopUA || suspiciousZoomOrDPR || emulatedButLooksReal;
};

/**
 * Attempts to detect if DevTools is open by comparing outer and inner window sizes.
 * Useful in combination with `isLikelyEmulated()` to infer responsive testing.
 *
 * @returns Boolean indicating whether DevTools is likely open
 */
export const isDevToolsOpen = (): boolean => {
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;

  const isDocked = widthDiff > 120 || heightDiff > 120;
  const isUnDocked = window.innerHeight < 600;

  return isDocked || isUnDocked;
};
