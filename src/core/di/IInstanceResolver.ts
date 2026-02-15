import type { Ctor, InjectionToken, Token } from "./InjectionToken.js";

/**
 * Minimal DI resolver surface.
 * Intended for passing into systems that must resolve dependencies,
 * without exposing binding/registration APIs.
 */
export interface IInstanceResolver {
  getInstance<T>(token: InjectionToken<T>): T;
  getInstance<T>(token: Ctor<T>): T;
  getInstance<T>(token: Token<T>): T;
}

