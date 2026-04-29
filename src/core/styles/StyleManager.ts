/**
 * A composable style source. Either a registered style id, an inline
 * partial, or an array of those (recursively). Used by
 * {@link StyleManager.resolve} to flatten N inputs into a single
 * style object — later sources win, plain objects deep-merge, arrays
 * replace, `undefined` is skipped.
 *
 * The partial form accepts explicit `undefined` values (skipped at
 * runtime) so callers can forward optional fields directly without
 * filtering, even under `exactOptionalPropertyTypes`.
 */
export type StyleSource<T> = string | { [K in keyof T]?: T[K] | undefined } | StyleSource<T>[];

/**
 * Flat style registry with multi-source composition.
 *
 * Modules call {@link add} once at boot to register their defaults.
 * Games call {@link modify} to tweak those defaults globally, and/or
 * pass {@link StyleSource} compositions to {@link resolve} for
 * per-instance overrides.
 *
 * Merge rules (used by both `modify` and `resolve`):
 * - plain objects deep-merge,
 * - arrays replace (no concatenation),
 * - `undefined` values are skipped,
 * - everything else replaces.
 */
export class StyleManager {
  private readonly _entries = new Map<string, Record<string, unknown>>();

  /**
   * Register a new style under `id`.
   *
   * @throws if `id` is already registered
   */
  public add<T extends object>(id: string, data: Partial<T>): void {
    if (this._entries.has(id)) {
      throw new Error(`StyleManager: style "${id}" is already registered`);
    }
    this._entries.set(id, deepClone(data) as Record<string, unknown>);
  }

  /**
   * Deep-merges `partial` into the registered default for `id`. The
   * change is visible to all subsequent {@link resolve} calls.
   *
   * @throws if `id` is not registered
   */
  public modify<T extends object>(id: string, partial: Partial<T>): void {
    const entry = this._entries.get(id);
    if (entry === undefined) {
      throw new Error(`StyleManager: style "${id}" not found`);
    }
    deepMergeInto(entry, partial as Record<string, unknown>);
  }

  /**
   * Composes N sources into a fresh object. Each source is either a
   * registered id (string), an inline partial, or an array of those.
   * Later sources win on conflict.
   *
   * The returned object is a deep copy — mutating it does not affect
   * the registered defaults.
   *
   * @throws if any string source references an unknown id
   */
  public resolve<T extends object>(...sources: StyleSource<T>[]): T {
    const out: Record<string, unknown> = {};
    for (const s of sources) this._mergeSource(out, s);
    return out as T;
  }

  private _mergeSource<T>(target: Record<string, unknown>, source: StyleSource<T>): void {
    if (typeof source === "string") {
      const entry = this._entries.get(source);
      if (entry === undefined) {
        throw new Error(`StyleManager: style "${source}" not found`);
      }
      deepMergeInto(target, entry);
      return;
    }
    if (Array.isArray(source)) {
      for (const item of source) this._mergeSource(target, item);
      return;
    }
    deepMergeInto(target, source as Record<string, unknown>);
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepClone<T>(v: T): T {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(deepClone) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as object)) {
    out[k] = deepClone((v as Record<string, unknown>)[k]);
  }
  return out as T;
}

function deepMergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const k of Object.keys(source)) {
    const sv = source[k];
    if (sv === undefined) continue;
    const tv = target[k];
    if (isPlainObject(sv) && isPlainObject(tv)) {
      deepMergeInto(tv, sv);
    } else if (sv === null || typeof sv !== "object") {
      target[k] = sv;
    } else {
      target[k] = deepClone(sv);
    }
  }
}
