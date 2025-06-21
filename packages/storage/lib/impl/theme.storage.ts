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

const detectSystemTheme = (): Theme => {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

const applySystemTheme = () => {
  const systemTheme = detectSystemTheme();
  storage.set(() => systemTheme);
};

const listenToSystemThemeChanges = () => {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', applySystemTheme);
};

export const themeStorage: ThemeStorage & {
  applySystemTheme: () => void;
  listenToSystemThemeChanges: () => void;
} = {
  ...storage,
  toggle: async () => {
    await storage.set(currentTheme => (currentTheme === 'light' ? 'dark' : 'light'));
  },
  applySystemTheme,
  listenToSystemThemeChanges,
};
