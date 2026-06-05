import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    // Optional physics modules ship as separate subpath entries so games that
    // don't use physics never load matter-js / cannon-es. They are NOT part of
    // the main `index` entry — importing physics is opt-in via the subpath.
    physics2d: "src/modules/physics2d/src/index.ts",
    physics3d: "src/modules/physics3d/src/index.ts",
  },
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  sourcemap: true,
  // IMPORTANT: keep peer deps external so apps use a single runtime instance.
  // Otherwise, mixing different `three` or `pixi` copies will crash at runtime.
  // The physics engines are optional peers — keep them external so the CJS
  // build never eagerly `require()`s an uninstalled package.
  external: ["three", "pixi.js", "@pixi/layout", "@pixi/ui", "matter-js", "cannon-es"],
  define: {
    __GAMELABSJS_VERSION__: JSON.stringify(pkg.version)
  },
  // We run cleaning via npm script to avoid rare race issues
  // when multiple formats/entries clean concurrently.
  clean: false,
  onSuccess: "node scripts/copy-module-assets.mjs",
  treeshake: true,
  splitting: false,
  // Also set via esbuildOptions for older tsup behavior.
  esbuildOptions(options) {
    options.define = {
      ...(options.define ?? {}),
      __GAMELABSJS_VERSION__: JSON.stringify(pkg.version)
    };
  }
});

