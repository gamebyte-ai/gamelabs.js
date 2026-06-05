import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";

import { Physics3DManager } from "./Physics3DManager.js";
import type { Physics3DConfig } from "./types.js";

/**
 * Registers a single {@link Physics3DManager} into the app's DI container.
 * The app resolves it in `postInitialize()` and registers `manager.step` with
 * the `UpdateManager` — the module never owns runtime behavior.
 *
 * ```ts
 * protected registerModules() {
 *   this.addModule(new Physics3DBinding({ gravity: { x: 0, y: -9.82, z: 0 } }));
 * }
 * ```
 */
export class Physics3DBinding extends ModuleBinding {
  public constructor(private readonly _config?: Physics3DConfig) {
    super();
  }

  public override configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(Physics3DManager, new Physics3DManager(this._config));
  }
}
