import { createRoot } from 'react-dom/client';

import { themeStorage } from '@extension/storage';
import { ReduxProvider, store } from '@extension/store';

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

  // Hoisted out of <Popup/> so the Redux provider doesn't sit inside the theme-reactive render
  // path. Theme changes triggered a re-render of Popup which previously rerendered ReduxProvider
  // and every descendant.
  root.render(
    <ReduxProvider store={store}>
      <Popup />
    </ReduxProvider>,
  );
};

init();
