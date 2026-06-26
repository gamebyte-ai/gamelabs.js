import type { IHud } from "../hud/IHud.js";
import type { World } from "../world/World.js";
import type { Logger } from "./Logger.js";
import type { IGroundGrid } from "./IGroundGrid.js";
import { DevUtils } from "./DevUtils.js";
import { GroundGrid } from "./GroundGrid.js";

/**
 * Three.js-aware dev utilities. Adds a `GroundGrid` on top of the base
 * `LogPanel` + `StatsPanel` so that 2D / renderer-free builds can skip
 * three.js entirely.
 */
export class DevUtils3D extends DevUtils {
  public readonly world: World;
  private readonly _groundGrid: GroundGrid;

  public constructor(world: World, hud: IHud, logger: Logger) {
    super(hud, logger);
    this.world = world;
    this._groundGrid = new GroundGrid(this.world);
  }

  public override get groundGrid(): IGroundGrid {
    return this._groundGrid;
  }

  public override destroy(): void {
    this._groundGrid.destroy();
    super.destroy();
  }
}
