// eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructor spread requires any[] for subclass assignability
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
// `_T` is a phantom type parameter — it associates the token with its target
// type at the type level but never appears in the runtime body. The leading
// underscore marks it as intentionally unused (matches eslint varsIgnorePattern).
export class InjectionToken<_T> {
  constructor(readonly description: string) {}
}

export type Token<T> = Ctor<T> | InjectionToken<T>;
