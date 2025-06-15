import { resolve } from 'node:path';
import { withLibraryConfig } from '@extension/vite-config';

const rootDir = resolve(import.meta.dirname);

export default withLibraryConfig({
  resolve: {
    alias: {
      '@src': resolve(rootDir, 'lib'),
    },
  },
  build: {
    lib: {
      entry: resolve(rootDir, 'index.mts'),
    },
    outDir: resolve(rootDir, 'dist'),
  },
}); 