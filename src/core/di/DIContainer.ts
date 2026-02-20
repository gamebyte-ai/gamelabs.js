import type { IInstanceResolver } from "./IInstanceResolver.js";
import type { Token } from "./InjectionToken.js";
import { InjectionToken } from "./InjectionToken.js";

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

function describeToken(token: Token<any>): string {
  if (token instanceof InjectionToken) return token.description || "(anonymous token)";
  // constructor
  return (token as any).name || "(anonymous ctor)";
}

/**
 * Minimal dependency injection container.
 *
 * - Singleton bindings only
 * - Supports aliasing: one primary token can be resolved by multiple tokens
 * - Implements `IInstanceResolver` via `getInstance()`
 */
export class DIContainer implements IInstanceResolver {
  private readonly providers = new Map<Token<any>, Provider<any>>();
  private readonly aliasToPrimary = new Map<Token<any>, Token<any>>();

  bindSingleton<T>(primary: Token<T>, factory: SingletonFactory<T>, aliases: readonly Token<any>[] = []): void {
    if (this.providers.has(primary)) {
      throw new Error(`Token is already bound: ${describeToken(primary)}`);
    }

    this.providers.set(primary, { kind: "factory", factory, hasInstance: false, instance: undefined, creating: false });
    this.bindAliases(primary, aliases);
  }

  bindInstance<T>(primary: Token<T>, instance: T, aliases: readonly Token<any>[] = []): void {
    if (this.providers.has(primary)) {
      throw new Error(`Token is already bound: ${describeToken(primary)}`);
    }

    this.providers.set(primary, { kind: "instance", value: instance });
    this.bindAliases(primary, aliases);
  }

  private bindAliases(primary: Token<any>, aliases: readonly Token<any>[]): void {
    for (const alias of aliases) {
      const existing = this.aliasToPrimary.get(alias);
      if (existing && existing !== primary) {
        throw new Error(
          `Alias token is already mapped: ${describeToken(alias)} -> ${describeToken(existing)}`
        );
      }
      this.aliasToPrimary.set(alias, primary);
    }
  }

  getInstance<T>(token: Token<T>): T;
  getInstance<T>(token: Token<T>): T {
    const primary = (this.aliasToPrimary.get(token as Token<any>) ?? token) as Token<T>;
    const provider = this.providers.get(primary) as Provider<T> | undefined;

    if (!provider) {
      const requested = describeToken(token);
      const resolved = primary === token ? requested : `${requested} (alias of ${describeToken(primary)})`;
      throw new Error(`No binding found for token: ${resolved}`);
    }

    if (provider.kind === "instance") return provider.value;

    if (provider.hasInstance) return provider.instance as T;
    if (provider.creating) {
      throw new Error(`Circular dependency while creating: ${describeToken(primary)}`);
    }

    provider.creating = true;
    try {
      const created = provider.factory(this);
      provider.instance = created;
      provider.hasInstance = true;
      return created;
    } finally {
      provider.creating = false;
    }
  }
}

