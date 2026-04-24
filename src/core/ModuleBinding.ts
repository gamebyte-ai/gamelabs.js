import type { ViewFactory } from "./views/ViewFactory.js";
import type { DIContainer } from "./di/DIContainer.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";
import { AssetRequestList } from "./assets/AssetRequestList.js";

/**
 * Static, boot-time bundle of DI bindings, view registrations, and asset
 * requests. Created once during app construction and never unloaded.
 *
 * Modules MUST NOT own runtime behavior. Do not add `onInitialize`,
 * `onUpdate`, `onResize`, or `onDestroy` hooks here. The only job of a
 * `ModuleBinding` is to contribute bindings (`configureDI`), register
 * views (`configureViews`), and declare asset requests (`_assetRequestList`).
 *
 * Any runtime orchestration belongs in the `GamelabsApp` subclass:
 *   - `postInitialize()` for one-time wiring once world/hud/DI are ready
 *     (e.g. `cameraManager.initialize(this.world)`).
 *   - `onResize(w, h, dpr)` for viewport-dependent updates.
 *   - `onStep(dt)` for per-frame work.
 *   - `preDestroy()` for cleanup of anything the app itself wired.
 *
 * Bound dependencies are released with the DI container; assets are freed
 * by `AssetManager`. This deliberate static shape keeps module boundaries
 * inspectable and avoids implicit per-frame dispatch through modules.
 *
 * Binding shape rules:
 *   - Zero-arg class: construct and bind eagerly inside `configureDI`.
 *     `diContainer.bindInstance(Class, new Class())`.
 *     Do NOT store the instance in a binding field.
 *   - Class with dependencies: bind as a factory that resolves from DI.
 *     `diContainer.bindSingleton(Class, (r) => new Class(r.getInstance(Dep)))`.
 *   - Do NOT expose bound instances via getters on the binding. Callers
 *     resolve them through DI (typically in `GamelabsApp.postInitialize`)
 *     and call methods directly.
 *   - Do NOT add forwarding methods (e.g. `addControl`, `addField`) that
 *     proxy to a bound instance. Resolve and call directly at the app.
 *
 * Legitimate fields / constructor args on a binding:
 *   - Asset request data (preset strings, config) used to populate
 *     `_assetRequestList` in the constructor.
 *   - Class or factory overrides passed via the binding's constructor for
 *     customization (e.g. a custom view class, controller class, or
 *     object creator).
 *   - Optional pre-built dependencies the app supplies to the binding
 *     (e.g. an app-provided model implementation).
 */
export class ModuleBinding {
  //  FIELDS
  protected readonly _assetRequestList: AssetRequestList = new AssetRequestList();

  //  GETTERS
  public get assetRequestList(): AssetRequestList {
    return this._assetRequestList;
  }

  //  METHODS

  public configureDI(_diContainer: DIContainer, _viewDiContainer: DIContainer): void {}

  public configureViews(_viewFactory: ViewFactory<IInstanceResolver>): void {}
}
