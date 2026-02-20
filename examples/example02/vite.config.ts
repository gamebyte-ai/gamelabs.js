import { defineConfig } from "vite";

const distIndexPath = decodeURIComponent(new URL("../../dist/index.js", import.meta.url).pathname);
const repoRootPath = decodeURIComponent(new URL("../..", import.meta.url).pathname);

export default defineConfig({
  base: "./",
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
      gamelabsjs: distIndexPath
    },

    // CRITICAL: Ensure we only ever bundle ONE copy of Pixi + layout/ui.
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"]
  },
  server: {
    port: 5176,
    strictPort: true,
    fs: { allow: [repoRootPath] }
  }
});

