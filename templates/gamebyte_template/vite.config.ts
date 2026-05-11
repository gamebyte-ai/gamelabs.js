import { defineConfig } from "vite";

// ────────────────────────────────────────────────────────────────────────
// optimizeDeps.exclude — REQUIRED for @gamebyte/gamelabsjs.
//
// The framework's bundled dist/index.js references its default UI
// textures with `new URL("./assets/<module>/...", import.meta.url)`.
// If Vite pre-bundles the package into node_modules/.vite/deps/,
// `import.meta.url` shifts away from the real dist directory and the
// relative `./assets/...` URLs resolve to non-existent paths — every
// default-skinned UI component renders with Pixi's magenta missing-
// texture marker. Excluding the package keeps import.meta.url anchored
// at node_modules/@gamebyte/gamelabsjs/dist/index.js so assets load.
//
// optimizeDeps.include — collateral fix forced by the exclude above.
//
// Excluding the framework also stops Vite from pre-bundling its
// transitive deps. `@pixi/ui` does `import { Signal } from "typed-
// signals"` and the framework does `import { vector } from "@js-
// basics/vector"` — both are CJS-only packages. Without pre-bundling,
// the browser sees `import { Signal }` against an `exports.Signal`
// CJS module and throws. The `'esm-dep > cjs-dep'` syntax tells Vite
// to pre-bundle these specific CJS deps and synthesize ESM named
// exports based on how their ESM parent imports them.
//
// resolve.dedupe — ensures one copy of three.js / Pixi shared between
// the app and the framework. Mixing copies causes Yoga (in @pixi/layout)
// to initialize against one copy while `.layout = ...` uses another,
// crashing with "Cannot read properties of undefined (reading 'Node')".
// ────────────────────────────────────────────────────────────────────────
export default defineConfig({
  base: "./",
  optimizeDeps: {
    exclude: ["@gamebyte/gamelabsjs"],
    include: ["@pixi/ui > typed-signals", "@gamebyte/gamelabsjs > @js-basics/vector"],
  },
  resolve: {
    dedupe: ["three", "pixi.js", "@pixi/layout", "@pixi/ui"],
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
  },
});
