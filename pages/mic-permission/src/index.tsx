import { createRoot } from 'react-dom/client';

import { themeStorage } from '@extension/storage';

import './index.css';
import { MicPermission } from './MicPermission';

themeStorage.applySystemTheme();
themeStorage.listenToSystemThemeChanges();

const root = document.getElementById('app-container');
if (root) {
  createRoot(root).render(<MicPermission />);
}
