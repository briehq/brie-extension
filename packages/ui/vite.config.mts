import { resolve } from 'node:path';
import { withLibraryConfig } from '@extension/vite-config';

const rootDir = resolve(import.meta.dirname);

export default withLibraryConfig({
  resolve: {
    alias: {
      '@': resolve(rootDir),
    },
  },
  build: {
    lib: {
      entry: resolve(rootDir, 'index.ts'),
    },
    outDir: resolve(rootDir, 'dist'),
  },
}); 