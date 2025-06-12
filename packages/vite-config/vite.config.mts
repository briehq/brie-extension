import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const rootDir = resolve(import.meta.dirname);

export default defineConfig({
  build: {
    lib: {
      entry: resolve(rootDir, 'index.mts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: resolve(rootDir, 'dist'),
    sourcemap: true,
    emptyOutDir: false,
    rollupOptions: {
      external: (id: string) => {
        // Externalize all dependencies
        return !id.startsWith('.') && !id.startsWith('/') && !id.includes('?');
      },
      output: {
        entryFileNames: '[name].mjs',
        format: 'es',
      },
    },
  },
}); 