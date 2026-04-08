import { InjectionToken } from "../di/InjectionToken.js";
import type { IGroundGrid } from "./IGroundGrid";
import type { ILogger } from "./ILogger";
import type { IStatsPanel } from "./IStatsPanel";

export interface IDevUtils {
  get logger(): ILogger;
  get statsPanel(): IStatsPanel;
  get groundGrid(): IGroundGrid;
}

export const IDevUtils = new InjectionToken<IDevUtils>("IDevUtils");
