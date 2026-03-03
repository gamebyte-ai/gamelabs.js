import { InjectionToken } from "../di/InjectionToken.js";
import type { LogType } from "./LogTypes.js";

export interface ILogger {
  get isVisible(): boolean;
  show(show: boolean): void;
  log(message: string, type?: LogType): void;
}

export const ILogger = new InjectionToken<ILogger>("ILogger");

