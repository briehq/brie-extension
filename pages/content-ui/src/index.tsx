import { createRoot } from 'react-dom/client';

import { themeStorage } from '@extension/storage';

import App from '@src/App';

// @ts-expect-error Because file doesn't exist before build
import tailwindcssOutput from '../dist/tailwind-output.css?inline';

const root = document.createElement('div');
root.id = 'brie-root';

document.body.append(root);

const rootIntoShadow = document.createElement('div');
rootIntoShadow.id = 'shadow-root';

const shadowRoot = root.attachShadow({ mode: 'open' });

if (navigator.userAgent.includes('Firefox')) {
  /**
   * In the firefox environment, adoptedStyleSheets cannot be used due to the bug
   * @url https://bugzilla.mozilla.org/show_bug.cgi?id=1770592
   *
   * Injecting styles into the document, this may cause style conflicts with the host page
   */
  const styleElement = document.createElement('style');
  // textContent (not innerHTML) so strict-CSP host pages don't reject style injection.
  styleElement.textContent = tailwindcssOutput;
  shadowRoot.appendChild(styleElement);
} else {
  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(tailwindcssOutput);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];
}

themeStorage.applySystemTheme();
const unsubscribeFromThemeChanges = themeStorage.listenToSystemThemeChanges();

// SPA routers that nuke document.body trigger pagehide on the old document, then re-inject the
// content-ui. Without this unsubscribe, every re-injection added another matchMedia listener on
// the same MediaQueryList — two notifications per theme change, two redundant storage writes.
window.addEventListener('pagehide', unsubscribeFromThemeChanges, { once: true });

shadowRoot.appendChild(rootIntoShadow);
createRoot(rootIntoShadow).render(<App />);
