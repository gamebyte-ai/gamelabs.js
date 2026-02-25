import { InjectionToken } from "./di/InjectionToken.js";

export interface ILogger {
  get isVisible(): boolean;
  show(show: boolean): void;
  log(message: string): void;
}

export const ILogger = new InjectionToken<ILogger>("ILogger");
