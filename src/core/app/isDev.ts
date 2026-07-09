export function computeIsDev(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = typeof import.meta !== "undefined" ? (import.meta as any) : undefined;
    if (meta?.env?.DEV === true) return true;
    if (meta?.env?.MODE === "development") return true;
  } catch {
    // import.meta not available in this bundler
  }
  try {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      return true;
    }
  } catch {
    // process not available
  }
  return false;
}
