import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const distIndexPath = decodeURIComponent(new URL("../../dist/index.js", import.meta.url).pathname);
const repoRootPath = decodeURIComponent(new URL("../..", import.meta.url).pathname);

export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  optimizeDeps: {
    exclude: ["@gamebyte/gamelabsjs"],
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@gamebyte/gamelabsjs": distIndexPath,
    },
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"],
  },
  server: {
    port: 5191,
    strictPort: true,
    fs: { allow: [repoRootPath] },
  },
  build: {
    target: "es2020",
    outDir: "dist-playable",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000, // inline everything Vite sees
    rollupOptions: {
      input: "index.playable.html",
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
