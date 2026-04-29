import { defineConfig } from "vite";

const distIndexPath = decodeURIComponent(new URL("../../dist/index.js", import.meta.url).pathname);
const repoRootPath = decodeURIComponent(new URL("../..", import.meta.url).pathname);

export default defineConfig({
  base: "./",
  optimizeDeps: {
    exclude: ["@gamebyte/gamelabsjs"]
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@gamebyte/gamelabsjs": distIndexPath
    },
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"]
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [repoRootPath] }
  }
});
