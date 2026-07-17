import type { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";

export type ConfigOverrideJson = Readonly<Record<string, unknown>>;

export interface HasOverrideHook {
  onOverridesApplied?(): void;
}

export async function loadConfigOverrides(url: string, logger?: ILogger): Promise<ConfigOverrideJson | null> {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      logger?.log(`Config overrides fetch returned ${response.status} for ${url}; using defaults`, LogTypes.Warning);
      return null;
    }
    const parsed: unknown = await response.json();
    if (!isPlainObject(parsed)) {
      logger?.log(`Config overrides at ${url} is not a plain object; using defaults`, LogTypes.Warning);
      return null;
    }
    return parsed as ConfigOverrideJson;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger?.log(`Config overrides load failed for ${url}: ${detail}; using defaults`, LogTypes.Warning);
    return null;
  }
}

export function applyConfigOverrides<T extends object>(target: T, overrides: ConfigOverrideJson | null | undefined): T {
  if (!overrides) return target;
  const record = target as Record<string, unknown>;
  for (const key of Object.keys(overrides)) {
    if (!(key in record)) continue;
    const currentValue = record[key];
    const overrideValue = overrides[key];
    if (isPlainObject(currentValue) && isPlainObject(overrideValue)) {
      applyConfigOverrides(currentValue, overrideValue);
    } else {
      record[key] = overrideValue;
    }
  }
  return target;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
