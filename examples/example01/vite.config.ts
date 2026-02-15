import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    // Example uses `gamelabsjs: file:../..` (symlink) during local dev.
    preserveSymlinks: true,

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

