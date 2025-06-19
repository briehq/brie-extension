import react from '@vitejs/plugin-react-swc';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import env, { IS_DEV, IS_PROD } from '@extension/env';
import { watchRebuildPlugin } from '@extension/hmr';

export const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined;

export const withPageConfig = (config: UserConfig) => {
  const plugins: any[] = [react(), nodePolyfills()];

  if (IS_DEV) {
    plugins.push(watchRebuildPlugin({ refresh: true }));
  }

  const mergedConfig = {
    define: {
      'process.env': env,
    },
    base: '',
    plugins: [...plugins, ...(config.plugins || [])],
    build: {
      sourcemap: IS_DEV,
      minify: IS_PROD,
      reportCompressedSize: IS_PROD,
      emptyOutDir: IS_PROD,
      watch: watchOption,
      rollupOptions: {
        external: ['chrome'],
        ...config.build?.rollupOptions,
      },
    },
    ...config,
  };

  return defineConfig(mergedConfig as any);
};
