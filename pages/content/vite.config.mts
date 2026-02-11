import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { makeEntryPointPlugin } from '@extension/hmr';
import { withPageConfig } from '@extension/vite-config';
import { IS_DEV } from '@extension/env';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');

/**
 * Rollup plugin that makes entry chunks self-contained for content scripts.
 * Content scripts run as plain `<script>` tags — they cannot use ES `import`
 * or `export`. This plugin:
 *  1. Inlines shared chunks back into each entry that imports them.
 *  2. Strips any `export default …` that Rollup's CJS-interop emits.
 */
const selfContainedEntriesPlugin = (): Plugin => {
  return {
    name: 'self-contained-entries',
    enforce: 'pre',
    generateBundle(_, bundle) {
      // ── 1. Inline shared chunks ──────────────────────────────────────
      const sharedChunks = new Map<string, (typeof bundle)[string] & { type: 'chunk' }>();

      for (const [fileName, info] of Object.entries(bundle)) {
        if (info.type === 'chunk' && !info.isEntry) {
          sharedChunks.set(fileName, info);
        }
      }

      for (const entry of Object.values(bundle)) {
        if (entry.type !== 'chunk' || !entry.isEntry) continue;

        let { code } = entry;

        for (const [chunkFile, chunk] of sharedChunks) {
          if (!entry.imports.includes(chunkFile)) continue;

          const escaped = chunkFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const importRe = new RegExp(`import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*["']\\.\\/` + escaped + `["']\\s*;?`);
          const importMatch = code.match(importRe);
          if (!importMatch) continue;

          // Parse import bindings, e.g. "R as RECORD_MSG, U as UI_MSG"
          const importBindings = importMatch[1].split(',').map(s => {
            const [imported, local] = s.trim().split(/\s+as\s+/);
            return { imported: imported.trim(), local: (local || imported).trim() };
          });

          // Parse the chunk's export statement
          const exportMatch = chunk.code.match(/export\s*\{\s*([^}]+)\s*\}\s*;?/);
          const exportMap = new Map<string, string>();
          if (exportMatch) {
            for (const s of exportMatch[1].split(',')) {
              const [local, exported] = s.trim().split(/\s+as\s+/);
              exportMap.set((exported || local).trim(), local.trim());
            }
          }

          // Strip export from chunk code
          let inlined = chunk.code.replace(/export\s*\{[^}]*\}\s*;?\s*/g, '').trim();

          // Add alias declarations when chunk-local name differs from import-local name
          for (const { imported, local } of importBindings) {
            const chunkLocal = exportMap.get(imported) ?? imported;
            if (chunkLocal !== local) {
              inlined += `\nvar ${local} = ${chunkLocal};`;
            }
          }

          code = code.replace(importRe, inlined);
          entry.imports = entry.imports.filter(i => i !== chunkFile);
        }

        // ── 2. Strip `export default` keyword but keep the expression ──
        code = code.replace(/^export\s+default\s+/gm, '');

        entry.code = code;
      }

      // Remove shared chunks from the bundle
      for (const name of sharedChunks.keys()) {
        delete bundle[name];
      }
    },
  };
};

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'),
  plugins: [selfContainedEntriesPlugin(), IS_DEV && makeEntryPointPlugin()],
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
