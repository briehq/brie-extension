import { createStorage, StorageEnum } from '../base/index.js';
import type { BaseStorage } from '../base/index.js';

type Theme = 'light' | 'dark';

type ThemeStorage = BaseStorage<Theme> & {
  toggle: () => Promise<void>;
};

const storage = createStorage<Theme>('theme-storage-key', 'light', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const applyTheme = (theme: Theme) => {
  const shadowHost = document.querySelector('#brie-root');
  // as the main is rendered by index.html so now targeting that
  const isPopup = window.location.pathname.includes('index.html');

  // targetingf to only #shadow-root
  if (shadowHost) {
    shadowHost.classList.remove('dark', 'light');
    shadowHost.classList.add(theme);
  }

  // Apply to popup <html>
  if (isPopup) {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }
};

// Detecting the sytem theme
const detectSystemTheme = (): Theme => {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

// applying the theme
const applySystemTheme = () => {
  const systemTheme = detectSystemTheme();
  applyTheme(systemTheme);
  // storing the theme setting
  storage.set(() => systemTheme);
};

const listenToSystemThemeChanges = () => {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', applySystemTheme);
};

// You can extend it with your own methods
export const themeStorage: ThemeStorage & {
  applyTheme: (theme: Theme) => void;
  applySystemTheme: () => void;
  listenToSystemThemeChanges: () => void;
} = {
  ...storage,
  toggle: async () => {
    await storage.set(currentTheme => (currentTheme === 'light' ? 'dark' : 'light'));
  },
  applyTheme,
  applySystemTheme,
  listenToSystemThemeChanges,
};
