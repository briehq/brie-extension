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
        // Force esbuild to escape every non-ASCII codepoint in string literals.
        // PostCSS (and a couple of other vendored deps) embed U+FFFE as a CSS
        // BOM sentinel; under the default utf8 charset esbuild emits the raw
        // EF BF BE bytes, which Chrome 130+ rejects when validating content
        // script files ("Could not load file ... It isn't UTF-8 encoded").
        // Escaping non-ASCII keeps the same runtime behavior and avoids the
        // content-script loader hitting the rejected codepoint.
        esbuild: {
          charset: 'ascii',
        },
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
