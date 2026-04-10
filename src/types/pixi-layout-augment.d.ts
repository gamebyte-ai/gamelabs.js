/**
 * Re-augments `PixiMixins.Container` with the `layout` member that
 * `@pixi/layout` adds at runtime.
 *
 * Why this file exists:
 * `@pixi/layout/dist/index.d.ts` declares its augmentation as
 * `namespace PixiMixins { interface Container { ... } }` (without a generic
 * parameter), but `pixi.js` extends `PixiMixins.Container<C>` (with a generic
 * `C extends ContainerChild`). The two signatures don't match, so TypeScript
 * silently drops the merge — every `(this as any).layout = ...` cast in the
 * codebase exists because of this.
 *
 * This file declares the augmentation with the correct generic signature so
 * the merge actually happens, letting consumers write `this.layout = ...`
 * directly without any casts.
 *
 * If `@pixi/layout` ever fixes its declaration to use `<C>`, this file
 * becomes redundant and can be deleted.
 */
import type { ContainerChild } from "pixi.js";
import type { Layout, LayoutOptions } from "@pixi/layout";

declare global {
  namespace PixiMixins {
    // The `C` generic must use the same name as pixi.js's
    // `Container<C extends ContainerChild>` for TypeScript declaration merging
    // to apply. It's unreferenced in this augmentation (we only add layout
    // members), so eslint flags it; the underscore-prefix workaround breaks
    // merging, so we suppress the rule for this one line instead.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Container<C extends ContainerChild> {
      _layout: Layout | null;
      get layout(): Layout | null;
      set layout(value: Omit<LayoutOptions, "target"> | null | boolean);
      onLayout(value: Layout): void;
      updateLocalTransformWithLayout: () => void;
    }
  }
}

export {};
