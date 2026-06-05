import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";

import { Physics2DManager } from "./Physics2DManager.js";
import type { Physics2DConfig } from "./types.js";

/**
 * Registers a single {@link Physics2DManager} into the app's DI container.
 *
 * The manager is constructed eagerly (no `inject()` dependency), sidestepping
 * the `bindInstance` inject asymmetry. The app resolves it in
 * `postInitialize()` and registers `manager.step` with the `UpdateManager` —
 * the module never owns runtime behavior (see {@link ModuleBinding}).
 *
 * ```ts
 * protected registerModules() {
 *   this.addModule(new Physics2DBinding({ gravity: { x: 0, y: 1 } }));
 * }
 * ```
 */
export class Physics2DBinding extends ModuleBinding {
  public constructor(private readonly _config?: Physics2DConfig) {
    super();
  }

  public override configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(Physics2DManager, new Physics2DManager(this._config));
  }
}
