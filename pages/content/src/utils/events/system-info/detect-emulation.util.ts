/**
 * Detects whether the page is likely being viewed using Chrome's
 * "Toggle device toolbar" (responsive design mode) in DevTools.
 *
 * This is based on heuristics: touch spoofing, small viewport, desktop UA, etc.
 *
 * @returns Boolean indicating if emulation is likely active
 */
/**
 * Heuristic to detect whether device emulation mode is likely active.
 */
export const isLikelyEmulated = (): boolean => {
  const dpr = window.devicePixelRatio;
  const ua = navigator.userAgent;
  const isTouchSpoofed = navigator.maxTouchPoints > 0 && !('ontouchstart' in window);
  const isMobileUA = /Mobi|Android|iPhone|iPad/i.test(ua);
  const isSmall = window.innerWidth < 800;
  const isDPRMismatch = dpr >= 2 && screen.width < 800;

  return isTouchSpoofed || (!isMobileUA && isSmall) || isDPRMismatch;
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
