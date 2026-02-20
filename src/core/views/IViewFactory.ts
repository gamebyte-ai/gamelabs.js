import type { IView } from "./IView.js";
import type { IScreen } from "../ui/IScreen.js";
import type { ScreenTransition } from "../ui/ScreenTransition.js";

/**
 * Restricted view creation capability.
 *
 * Intended for injecting into views/controllers so they can only create views,
 * without access to registration or app context.
 */
export interface IViewFactory {
  createView<TView extends IView>(View: new () => TView, parent: unknown): TView;
  createScreen<TView extends IView & IScreen>(
    View: new () => TView,
    parent: unknown,
    enterTransition: ScreenTransition
  ): void;
}

