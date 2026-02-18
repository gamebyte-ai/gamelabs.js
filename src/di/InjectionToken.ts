export type Ctor<T> = abstract new (...args: any[]) => T;

/**
 * Runtime token for types that don't exist at runtime (e.g. TypeScript interfaces).
 *
 * Usage:
 *
 * ```ts
 * export interface IFoo {}
 * export const IFoo = new InjectionToken<IFoo>("IFoo");
 * ```
 */
export class InjectionToken<T> {
  constructor(readonly description: string) {}
}

export type Token<T> = Ctor<T> | InjectionToken<T>;

