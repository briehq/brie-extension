import { resolve } from 'node:path';
import { withLibraryConfig } from '@extension/vite-config';

const rootDir = resolve(import.meta.dirname);

export default withLibraryConfig({
  build: {
    lib: {
      entry: resolve(rootDir, 'index.mts'),
    },
    outDir: resolve(rootDir, 'dist'),
    target: 'node18', // Support top-level await
  },
}); 