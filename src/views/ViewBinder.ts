import type { Unsubscribe } from "../core/subscriptions.js";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";

export type ControllerCtor<TView extends IView, TDeps extends object, TController extends IViewController> = new (
  deps: { view: TView } & TDeps
) => TController;

/**
 * Semi-automatic View ↔ Controller binder.
 *
 * - Creates controller with `{ view, ...deps }`
 * - Calls `controller.initialize()`
 */
export class ViewBinder {
  bind<TView extends IView, TDeps extends object, TController extends IViewController>(
    view: TView,
    Controller: ControllerCtor<TView, TDeps, TController>,
    deps: TDeps
  ): TController {
    const controller = new Controller({ view, ...deps });
    view.setController(controller);
    controller.initialize();
    return controller;
  }
}

export type { Unsubscribe };

