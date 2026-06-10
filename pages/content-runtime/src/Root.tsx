import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import App from '@src/App';
import injectedStyle from '@src/index.css?inline';

const ROOT_ID = 'brie-runtime-root';

let activeRoot: Root | null = null;

export const mount = () => {
  if (document.getElementById(ROOT_ID)) return;

  // SPA routers can replace document.body and detach our host element without unmounting React.
  if (activeRoot) {
    try {
      activeRoot.unmount();
    } catch {
      // Root may already be invalid.
    }
    activeRoot = null;
  }

  const root = document.createElement('div');
  root.id = ROOT_ID;

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
    styleElement.textContent = injectedStyle;
    shadowRoot.appendChild(styleElement);
  } else {
    /** Inject styles into shadow dom */
    const globalStyleSheet = new CSSStyleSheet();
    globalStyleSheet.replaceSync(injectedStyle);
    shadowRoot.adoptedStyleSheets = [globalStyleSheet];
  }

  shadowRoot.appendChild(rootIntoShadow);
  activeRoot = createRoot(rootIntoShadow);
  activeRoot.render(<App />);
};

export const unmount = () => {
  activeRoot?.unmount();
  activeRoot = null;
  document.getElementById(ROOT_ID)?.remove();
};
