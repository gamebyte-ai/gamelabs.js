import type { IInstanceResolver } from "./IInstanceResolver.js";
import type { IInjectionTarget } from "./IInjectionTarget.js";
import type { Token } from "./InjectionToken.js";
import { InjectionToken } from "./InjectionToken.js";
import type { ILogger } from "../dev/ILogger.js";
import { LogTypes } from "../dev/LogTypes.js";

type SingletonFactory<T> = (resolver: IInstanceResolver) => T;

type Provider<T> =
  | { kind: "instance"; value: T }
  | {
      kind: "factory";
      factory: SingletonFactory<T>;
      hasInstance: boolean;
      instance: T | undefined;
      creating: boolean;
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts heterogeneous tokens
function describeToken(token: Token<any>): string {
  if (token instanceof InjectionToken) return token.description || "(anonymous token)";
  // constructor
  return (token as { name?: string }).name || "(anonymous ctor)";
}

/**
 * Minimal dependency injection container.
 *
 * - Singleton bindings only
 * - Supports aliasing: one primary token can be resolved by multiple tokens
 * - Implements `IInstanceResolver` via `getInstance()`
 */
export class DIContainer implements IInstanceResolver {
  private readonly _logger: ILogger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type erasure: heterogeneous container
  private readonly providers = new Map<Token<any>, Provider<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type erasure: heterogeneous container
  private readonly aliasToPrimary = new Map<Token<any>, Token<any>>();

  public constructor(logger: ILogger) {
    this._logger = logger;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- aliases accept heterogeneous tokens
  bindSingleton<T>(primary: Token<T>, factory: SingletonFactory<T>, aliases: readonly Token<any>[] = []): void {
    if (this.providers.has(primary)) {
      const msg = `Token is already bound: ${describeToken(primary)}`;
      this._logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    this.providers.set(primary, { kind: "factory", factory, hasInstance: false, instance: undefined, creating: false });
    this.bindAliases(primary, aliases);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- aliases accept heterogeneous tokens
  bindInstance<T>(primary: Token<T>, instance: T, aliases: readonly Token<any>[] = []): void {
    if (this.providers.has(primary)) {
      const msg = `Token is already bound: ${describeToken(primary)}`;
      this._logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    this.providers.set(primary, { kind: "instance", value: instance });
    this.bindAliases(primary, aliases);
  }

  private _isInjectionTarget(value: unknown): value is IInjectionTarget {
    return typeof value === "object" && value !== null && typeof (value as IInjectionTarget).inject === "function";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type erasure: heterogeneous tokens
  private bindAliases(primary: Token<any>, aliases: readonly Token<any>[]): void {
    for (const alias of aliases) {
      const existing = this.aliasToPrimary.get(alias);
      if (existing && existing !== primary) {
        const msg = `Alias token is already mapped: ${describeToken(alias)} -> ${describeToken(existing)}`;
        this._logger.log(msg, LogTypes.Error);
        throw new Error(msg);
      }
      this.aliasToPrimary.set(alias, primary);
    }
  }

  getInstance<T>(token: Token<T>): T;
  getInstance<T>(token: Token<T>): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- upcast to look up in heterogeneous map
    const primary = (this.aliasToPrimary.get(token as Token<any>) ?? token) as Token<T>;
    const provider = this.providers.get(primary) as Provider<T> | undefined;

    if (!provider) {
      const requested = describeToken(token);
      const resolved = primary === token ? requested : `${requested} (alias of ${describeToken(primary)})`;
      const msg = `No binding found for token: ${resolved}`;
      this._logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    if (provider.kind === "instance") return provider.value;

    if (provider.hasInstance) return provider.instance as T;
    if (provider.creating) {
      const msg = `Circular dependency while creating: ${describeToken(primary)}`;
      this._logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    provider.creating = true;
    try {
      const created = provider.factory(this);

      if (this._isInjectionTarget(created)) {
        created.inject(this);
      }

      // Only mark cached after both factory and inject succeed. If either
      // throws, the next getInstance() call retries cleanly from scratch
      // instead of returning a partially initialized instance.
      provider.instance = created;
      provider.hasInstance = true;
      return created;
    } finally {
      provider.creating = false;
    }
  }
}
