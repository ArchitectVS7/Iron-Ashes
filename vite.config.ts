import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * Vite config — bundles BOTH the v2 UI (index.html) and the v3 UI (index-v3.html).
 * The v2 build must keep working, so index.html stays the default entry; index-v3.html
 * is added as a second rollup input. `npm run dev` serves both (open /index-v3.html).
 */
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        v3: fileURLToPath(new URL('./index-v3.html', import.meta.url)),
      },
    },
  },
});
