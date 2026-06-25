import type { Hud } from "../hud/Hud.js";
import type { IStatsPanel } from "./IStatsPanel.js";
import type { IGroundGrid } from "./IGroundGrid.js";
import type { Logger } from "./Logger.js";
import { LogPanel } from "./LogPanel.js";
import { StatsPanel } from "./StatsPanel.js";
import type { ILogger } from "./ILogger.js";
import type { IDevUtils } from "./IDevUtils.js";

export type { GroundGridOptions } from "./IGroundGrid.js";

export class DevUtils implements IDevUtils {
  protected readonly _hud: Hud;
  private readonly _logger: Logger;
  private readonly _logPanel: LogPanel;
  private readonly _statsPanel: StatsPanel;

  public constructor(hud: Hud, logger: Logger) {
    this._hud = hud;

    this._logger = logger;
    this._logPanel = LogPanel.createPanel(this._hud, { maxItems: this._logger.maxItems });
    this._logger.attachPanel(this._logPanel);

    this._statsPanel = StatsPanel.createPanel(hud);
    const r = hud.resolution;
    if (typeof r === "number" && Number.isFinite(r)) this._statsPanel.resize(1, 1, r);
  }

  public get logger(): ILogger {
    return this._logger;
  }

  public get statsPanel(): IStatsPanel {
    return this._statsPanel;
  }

  /**
   * Base DevUtils has no ground grid because the grid is a three.js
   * helper that lives in a World scene. Accessing it from a renderer-free
   * app is a contract error — use `DevUtils3D` (auto-wired by the 3D entry).
   */
  public get groundGrid(): IGroundGrid {
    throw new Error("DevUtils.groundGrid requires a World — use DevUtils3D from the 3D entry");
  }

  public resize(width: number, height: number, dpr?: number): void {
    const r = this._hud.resolution;
    const effectiveDpr = typeof dpr === "number" && Number.isFinite(dpr) ? dpr : typeof r === "number" && Number.isFinite(r) ? r : 1;
    this._statsPanel.resize(width, height, effectiveDpr);

    this._logger.resize(width, height);
  }

  public destroy(): void {
    this._statsPanel.destroy();
    this._logger.detachPanel();
    this._logPanel.destroy();
  }
}
