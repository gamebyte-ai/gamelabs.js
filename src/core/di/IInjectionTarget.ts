import type { IInstanceResolver } from "./IInstanceResolver.js";

/**
 * Interface for objects that receive dependencies via injection.
 * When an instance is resolved from DIContainer, if it implements this interface,
 * `inject(resolver)` is called after the instance is stored, enabling circular dependency resolution.
 */
export interface IInjectionTarget {
  inject(resolver: IInstanceResolver): void;
}
