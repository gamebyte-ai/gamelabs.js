import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Playable-ad build: produces a single self-contained HTML file with all
// JS / CSS / assets inlined as data: URIs. Open the output with file://
// and it runs with zero network requests.
//
// The optimizeDeps / dedupe block mirrors vite.config.ts — see that file
// for the full explanation. Same constraints apply in playable mode.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  optimizeDeps: {
    exclude: ["@gamebyte/gamelabsjs"],
    include: ["@pixi/ui > typed-signals", "@gamebyte/gamelabsjs > @js-basics/vector"],
  },
  resolve: {
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"],
  },
  build: {
    target: "es2022", // template main uses top-level await
    outDir: "dist-playable",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000, // inline every asset Vite sees
    rollupOptions: {
      input: "index.playable.html",
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
