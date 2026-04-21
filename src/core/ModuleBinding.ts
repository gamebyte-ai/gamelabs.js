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
