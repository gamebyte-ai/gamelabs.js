/**
 * Simple key-value persistence layer backed by localStorage.
 * Keys are automatically prefixed to avoid collisions between games on the same domain.
 */
export class StorageService {
  private readonly _prefix: string;

  constructor(prefix: string) {
    this._prefix = prefix ? prefix + "." : "";
  }

  /** Save a value (serialized as JSON). */
  public save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this._prefix + key, JSON.stringify(value));
    } catch { /* quota exceeded or unavailable — silently ignore */ }
  }

  /** Load a value. Returns null if the key doesn't exist or parsing fails. */
  public load<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this._prefix + key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Remove a single key. */
  public remove(key: string): void {
    localStorage.removeItem(this._prefix + key);
  }

  /** Remove all keys with this service's prefix. */
  public clear(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this._prefix)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  }

  /** Check if a key exists. */
  public has(key: string): boolean {
    return localStorage.getItem(this._prefix + key) !== null;
  }
}
