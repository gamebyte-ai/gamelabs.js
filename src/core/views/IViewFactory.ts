import type { IView } from "./IView.js";
import type { IScreenView } from "../ui/IScreenView.js";
import type { ScreenTransition } from "../ui/ScreenTransition.js";
import { InjectionToken } from "../di/InjectionToken.js";

/**
 * Restricted view creation capability.
 *
 * Intended for injecting into views/controllers so they can only create views,
 * without access to registration or app context.
 */
export interface IViewFactory {
  createView<TView extends IView>(View: new () => TView): TView;
  createScreenView<TView extends IScreenView>(View: new () => TView, enterTransition: ScreenTransition | null): void;
  viewAdded(view: IView): void;
  viewRemoved(view: IView): void;
}

export const IViewFactory = new InjectionToken<IViewFactory>("IViewFactory");
