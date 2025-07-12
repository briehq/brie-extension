import { resolve } from 'node:path';
import { makeEntryPointPlugin } from '@extension/hmr';
import { withPageConfig } from '@extension/vite-config';
import { IS_DEV } from '@extension/env';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'),
  plugins: [IS_DEV && makeEntryPointPlugin()],
  build: {
    minify: false,
    rollupOptions: {
      input: {
        index: resolve(rootDir, 'src/index.ts'),
        extend: resolve(rootDir, 'src/interceptors/index.ts'),
      },
      output: {
        entryFileNames: '[name].iife.js',
        manualChunks: undefined,
        inlineDynamicImports: false,
      },
    },
    outDir: resolve(rootDir, '..', '..', 'dist', 'content'),
  },
});
