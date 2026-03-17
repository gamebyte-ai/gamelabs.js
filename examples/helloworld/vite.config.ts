import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  optimizeDeps: {
    // Prevent Vite from caching/prebundling a stale local build of the framework.
    // We want changes in `../../dist/index.js` to be picked up immediately.
    exclude: ["gamelabsjs"]
  },
  resolve: {
    // Example uses `gamelabsjs: file:../..` (symlink) during local dev.
    preserveSymlinks: true,

    // Always resolve to the repo-local build output.
    alias: {
      gamelabsjs: resolve(__dirname, "../../dist/index.js")
    },

    // CRITICAL: Ensure we only ever bundle ONE copy of Pixi + layout/ui.
    // Otherwise Yoga may be initialized in one copy while `.layout = ...` uses another copy,
    // which crashes with `Cannot read properties of undefined (reading 'Node')`.
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"]
  },
  server: {
    port: 5175,
    strictPort: true
  }
});

