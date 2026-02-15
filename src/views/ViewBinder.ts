import type { Unsubscribe } from "../core/subscriptions.js";
import type { IInstanceResolver } from "../core/di/IInstanceResolver.js";
import type { IView } from "./IView.js";
import type { IViewController } from "./IViewController.js";

export type ControllerCtor<TView extends IView, TController extends IViewController> = new (deps: {
  view: TView;
  resolver: IInstanceResolver;
}) => TController;

/**
 * Semi-automatic View ↔ Controller binder.
 *
 * - Creates controller with `{ view, resolver }`
 * - Calls `controller.initialize()`
 */
export class ViewBinder {
  bind<TView extends IView, TController extends IViewController>(
    view: TView,
    Controller: ControllerCtor<TView, TController>,
    resolver: IInstanceResolver
  ): TController {
    const controller = new Controller({ view, resolver });
    view.setController(controller);
    controller.initialize();
    return controller;
  }
}

export type { Unsubscribe };

