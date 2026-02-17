import type { Unsubscribe } from "../core/subscriptions.js";
import type { IInstanceResolver } from "../core/di/IInstanceResolver.js";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";

export type ControllerCtor<TView extends IView, TController extends IViewController<TView>> = new () => TController;

/**
 * Semi-automatic View ↔ Controller binder.
 *
 * - Creates controller
 * - Sets controller on view
 * - Calls `controller.initialize(view, resolver)`
 */
export class ViewBinder {
  bind<TView extends IView, TController extends IViewController<TView>>(
    view: TView,
    Controller: ControllerCtor<TView, TController>,
    resolver: IInstanceResolver
  ): TController {
    const controller = new Controller();
    view.setController(controller);
    controller.initialize(view, resolver);
    return controller;
  }
}

export type { Unsubscribe };

