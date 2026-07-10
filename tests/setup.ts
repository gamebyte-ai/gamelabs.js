// Vitest runs in Node env by default. Some transitive imports (pixi.js →
// isSafari on module load) read `navigator` at import time and throw
// ReferenceError in Node < 21. A minimal stub satisfies the check without
// pulling in jsdom.
if (typeof (globalThis as { navigator?: unknown }).navigator === "undefined") {
  (globalThis as { navigator: { userAgent: string } }).navigator = { userAgent: "" };
}
