import { defineConfig } from "vite";

const distIndexPath = decodeURIComponent(new URL("../../dist/index.js", import.meta.url).pathname);
const repoRootPath = decodeURIComponent(new URL("../..", import.meta.url).pathname);

export default defineConfig({
  base: "./",
  optimizeDeps: {
    exclude: ["gamelabsjs"]
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      gamelabsjs: distIndexPath
    },
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"]
  },
  server: {
    port: 5181,
    strictPort: true,
    fs: { allow: [repoRootPath] }
  }
});
