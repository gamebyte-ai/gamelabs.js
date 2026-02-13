import type { IView } from "./IView.js";

/**
 * Restricted view creation capability.
 *
 * Intended for injecting into views/controllers so they can only create views,
 * without access to registration or app context.
 */
export interface IViewFactory {
  createView<TView extends IView>(View: new () => TView, parent: unknown): TView;
}

