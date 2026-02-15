import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  sourcemap: true,
  // IMPORTANT: keep peer deps external so apps use a single runtime instance.
  // Otherwise, mixing different `three` or `pixi` copies will crash at runtime.
  external: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"],
  define: {
    __GAMELABSJS_VERSION__: JSON.stringify(pkg.version)
  },
  // We run cleaning via npm script to avoid rare race issues
  // when multiple formats/entries clean concurrently.
  clean: false,
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

