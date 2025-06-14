import deepmerge from 'deepmerge';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';

// Environment detection using Node.js standard
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PROD = process.env.NODE_ENV === 'production';

const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined;

export const withLibraryConfig = (config: UserConfig) =>
  defineConfig(
    deepmerge(
      {
        plugins: [],
        build: {
          lib: {
            entry: (typeof config.build?.lib === 'object' && config.build.lib.entry) || 'index.mts',
            formats: ['es'],
            fileName: 'index',
          },
          sourcemap: IS_DEV,
          minify: IS_PROD,
          reportCompressedSize: IS_PROD,
          emptyOutDir: false,
          watch: watchOption,
          rollupOptions: {
            external: (id: string) => {
              // Externalize workspace dependencies and node_modules
              return id.startsWith('@extension/') || (!id.startsWith('.') && !id.startsWith('/') && !id.includes('?'));
            },
            output: {
              // Ensure .js extensions in output for Node.js compatibility
              entryFileNames: '[name].mjs',
              format: 'es',
            },
          },
        },
      },
      config,
    ),
  );
