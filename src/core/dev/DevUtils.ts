import * as THREE from "three";

import type { Hud } from "../Hud.js";
import type { World } from "../World.js";
import type { IStatsPanel } from "./IStatsPanel.js";
import { Logger } from "./Logger.js";
import { LogPanel } from "./LogPanel.js";
import { StatsPanel } from "./StatsPanel.js";
import { ILogger } from "./ILogger.js";

export type GroundGridOptions = {
  size?: number;
  divisions?: number;
  color1?: THREE.ColorRepresentation;
  color2?: THREE.ColorRepresentation;
  y?: number;
};

export class DevUtils {
  public readonly world: World;
  private readonly _hud: Hud;
  private readonly _logger: Logger;
  private readonly _statsPanel: StatsPanel;

  private _groundGrid: THREE.GridHelper | null = null;

  public constructor(world: World, hud: Hud) {
    this.world = world;
    this._hud = hud;

    this._logger = new Logger();
    const panel = LogPanel.createPanel(hud);
    this._logger.attachPanel(panel);

    this._statsPanel = StatsPanel.createPanel(hud.overlayLayer);
    const r = (hud.app.renderer as any).resolution;
    if (typeof r === "number" && Number.isFinite(r)) this._statsPanel.resize(1, 1, r);
  }

  public get isGroundGridVisible(): boolean {
    return this._groundGrid?.visible ?? false;
  }

  public get logger(): ILogger {
    return this._logger;
  }

  public get statsPanel(): IStatsPanel {
    return this._statsPanel;
  }

  public createGroundGrid(options: GroundGridOptions = {}): THREE.GridHelper {
    const size = options.size ?? 20;
    const divisions = options.divisions ?? 20;
    const color1 = options.color1 ?? 0x223047;
    const color2 = options.color2 ?? 0x152033;
    const y = options.y ?? 0;

    if (this._groundGrid) {
      this.world.scene.remove(this._groundGrid);
      this._groundGrid.geometry.dispose();
      const material = this._groundGrid.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this._groundGrid = null;
    }

    const grid = new THREE.GridHelper(size, divisions, color1, color2);
    grid.position.y = y;
    grid.visible = true;

    this.world.scene.add(grid);
    this._groundGrid = grid;
    return grid;
  }

  public showGroundGrid(visible: boolean): void {
    if (!this._groundGrid) {
      if (!visible) return;
      this.createGroundGrid();
    }
    if (this._groundGrid) this._groundGrid.visible = visible;
  }

  public showStats(show: boolean): void {
    this.statsPanel.show(show);
  }

  public resize(width: number, height: number, dpr?: number): void {
    this._hud.resize(width, height, dpr);

    const r = (this._hud.app.renderer as any).resolution;
    const effectiveDpr =
      typeof dpr === "number" && Number.isFinite(dpr) ? dpr : typeof r === "number" && Number.isFinite(r) ? r : 1;
    this._statsPanel.resize(width, height, effectiveDpr);

    this._logger.resize(width, height);
  }

  public destroy(): void {
    this._statsPanel.destroy();

    if (this._groundGrid) {
      this.world.scene.remove(this._groundGrid);
      this._groundGrid.geometry.dispose();
      const material = this._groundGrid.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this._groundGrid = null;
    }
  }
}

