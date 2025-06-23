import { createRoot } from 'react-dom/client';

import { themeStorage } from '@extension/storage';

import Popup from '@src/Popup';
import '@src/index.css';

themeStorage.applySystemTheme();
themeStorage.listenToSystemThemeChanges();

const init = () => {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(<Popup />);
};

init();
