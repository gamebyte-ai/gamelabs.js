// Replaced at build-time by tsup/esbuild define.
declare const __GAMELABSJS_VERSION__: string;

export const VERSION =
  // `typeof` is safe even when the identifier is not defined at runtime.
  typeof __GAMELABSJS_VERSION__ !== "undefined" ? __GAMELABSJS_VERSION__ : "0.0.0-dev";

