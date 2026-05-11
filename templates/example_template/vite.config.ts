import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: "./",
  optimizeDeps: {
    // Keep @gamebyte/gamelabsjs un-pre-bundled so its default-skin
    // texture URLs (new URL("./assets/...", import.meta.url)) resolve
    // against the real dist directory, not .vite/deps. The nested
    // includes force pre-bundling of two CJS transitive deps that the
    // exclude would otherwise also skip (typed-signals and
    // @js-basics/vector) — without this, `import { Signal }` /
    // `import { vector }` against those CJS modules throw at runtime.
    exclude: ["@gamebyte/gamelabsjs"],
    include: ["@pixi/ui > typed-signals", "@gamebyte/gamelabsjs > @js-basics/vector"],
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@gamebyte/gamelabsjs": resolve(__dirname, "../../dist/index.js"),
    },
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"],
  },
  server: {
    port: 5176,
    strictPort: true,
  },
});
