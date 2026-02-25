import type { Hud } from "../Hud.js";
import type { World } from "../World.js";
import type { IStatsPanel } from "./IStatsPanel.js";
import type { IGroundGrid } from "./IGroundGrid.js";
import { GroundGrid } from "./GroundGrid.js";
import { Logger } from "./Logger.js";
import { LogPanel } from "./LogPanel.js";
import { StatsPanel } from "./StatsPanel.js";
import { ILogger } from "./ILogger.js";
import { IDevUtils } from "./IDevUtils.js";

export type { GroundGridOptions } from "./IGroundGrid.js";

export class DevUtils implements IDevUtils{
  public readonly world: World;
  private readonly _hud: Hud;
  private readonly _logger: Logger;
  private readonly _logPanel: LogPanel;
  private readonly _statsPanel: StatsPanel;
  private readonly _groundGrid: GroundGrid;

  public constructor(world: World, hud: Hud, logger: Logger) {
    this.world = world;
    this._hud = hud;

    this._logger = logger;
    this._logPanel = LogPanel.createPanel(this._hud);
    this._logger.attachPanel(this._logPanel);

    this._statsPanel = StatsPanel.createPanel(hud.overlayLayer);
    const r = (hud.app.renderer as any).resolution;
    if (typeof r === "number" && Number.isFinite(r)) this._statsPanel.resize(1, 1, r);

    this._groundGrid = new GroundGrid(this.world);
  }

  public get logger(): ILogger {
    return this._logger;
  }

  public get statsPanel(): IStatsPanel {
    return this._statsPanel;
  }

  public get groundGrid(): IGroundGrid {
    return this._groundGrid;
  }

  public resize(width: number, height: number, dpr?: number): void {
    const r = (this._hud.app.renderer as any).resolution;
    const effectiveDpr =
      typeof dpr === "number" && Number.isFinite(dpr) ? dpr : typeof r === "number" && Number.isFinite(r) ? r : 1;
    this._statsPanel.resize(width, height, effectiveDpr);

    this._logger.resize(width, height);
  }

  public destroy(): void {
    this._statsPanel.destroy();
    this._groundGrid.destroy();
    this._logger.detachPanel();
    this._logPanel.destroy();
  }
}

