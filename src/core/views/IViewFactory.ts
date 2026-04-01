import type { IView } from "./IView.js";
import { InjectionToken } from "../di/InjectionToken.js";

/**
 * Restricted view creation capability.
 *
 * Intended for injecting into views/controllers so they can only create views,
 * without access to registration or app context.
 * Screen creation is handled via UIEvents, not through this interface.
 */
export interface IViewFactory {
  createView<TView extends IView>(View: new () => TView): TView;
  viewAdded(view: IView): void;
  viewRemoved(view: IView): void;
}

export const IViewFactory = new InjectionToken<IViewFactory>("IViewFactory");
