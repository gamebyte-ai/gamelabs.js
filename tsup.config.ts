import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts", "src/2d/index.ts", "src/3d/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  esbuildOptions(options) {
    options.define = {
      ...(options.define ?? {}),
      __GAMELABSJS_VERSION__: JSON.stringify(pkg.version)
    };
  }
});

