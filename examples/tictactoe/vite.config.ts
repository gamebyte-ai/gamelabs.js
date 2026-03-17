import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  optimizeDeps: {
    exclude: ["gamelabsjs"]
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      gamelabsjs: resolve(__dirname, "../../dist/index.js")
    },
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"]
  },
  server: {
    port: 5177,
    strictPort: true
  }
});
