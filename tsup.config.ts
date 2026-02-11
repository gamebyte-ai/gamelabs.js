import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts", "src/2d/index.ts", "src/3d/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  sourcemap: true,
  // We run cleaning via npm script to avoid rare race issues
  // when multiple formats/entries clean concurrently.
  clean: false,
  treeshake: true,
  splitting: false,
  esbuildOptions(options) {
    options.define = {
      ...(options.define ?? {}),
      __GAMELABSJS_VERSION__: JSON.stringify(pkg.version)
    };
  }
});

