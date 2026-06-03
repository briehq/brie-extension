import react from '@vitejs/plugin-react-swc';
import deepmerge from 'deepmerge';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import env, { IS_DEV, IS_FIREFOX, IS_PROD } from '@extension/env';
import { watchRebuildPlugin } from '@extension/hmr';

export const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined;

export type WithPageConfigOptions = UserConfig & {
  nodePolyfills?: boolean;
};

export const withPageConfig = ({ nodePolyfills: enablePolyfills = false, ...config }: WithPageConfigOptions = {}) =>
  defineConfig(
    deepmerge(
      {
        define: {
          'process.env': env,
        },
        base: '',
        plugins: [react(), IS_DEV && watchRebuildPlugin({ refresh: true }), enablePolyfills && nodePolyfills()].filter(
          Boolean,
        ),
        build: {
          target: IS_FIREFOX ? 'firefox109' : 'chrome120',
          sourcemap: IS_DEV,
          minify: IS_PROD,
          reportCompressedSize: IS_PROD,
          emptyOutDir: IS_PROD,
          watch: watchOption,
          rollupOptions: {
            external: ['chrome'],
          },
        },
      },
      config,
    ),
  );
