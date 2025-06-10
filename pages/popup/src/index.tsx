import { createRoot } from 'react-dom/client';

import Popup from '@src/Popup';
import '@src/index.css';

// Function to apply system theme
const applySystemTheme = () => {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Apply theme on load
applySystemTheme();

// Listen for changes in the system's color scheme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme);

const init = () => {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(<Popup />);
};

init();
