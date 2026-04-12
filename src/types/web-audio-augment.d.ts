/**
 * Safari fallback: `webkitAudioContext` is not in standard typings
 * but exists at runtime on older Safari/iOS versions.
 */
interface Window {
  webkitAudioContext?: typeof AudioContext;
}

declare namespace globalThis {
  // eslint-disable-next-line no-var
  var webkitAudioContext: typeof AudioContext | undefined;
}
