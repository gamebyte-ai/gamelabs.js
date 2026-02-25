import { InjectionToken } from "../di/InjectionToken.js";
import { IGroundGrid } from "./IGroundGrid";
import { ILogger } from "./ILogger";
import { IStatsPanel } from "./IStatsPanel";

export interface IDevUtils {
    get logger(): ILogger ;
    get statsPanel(): IStatsPanel;
    get groundGrid(): IGroundGrid;
}


export const IDevUtils = new InjectionToken<IDevUtils>("IDevUtils");