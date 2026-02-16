import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    // Example uses `gamelabsjs: file:../..` (symlink) during local dev.
    preserveSymlinks: true,

    // CRITICAL: Ensure we only ever bundle ONE copy of Pixi + layout/ui.
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"]
  },
  server: {
    port: 5176,
    strictPort: true
  }
});

