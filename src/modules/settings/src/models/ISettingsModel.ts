import { InjectionToken } from "../../../../core/di/InjectionToken.js";
import type { SettingsField } from "../SettingsField.js";

export interface ISettingsModel {
  getFields(): Iterable<SettingsField>;
  getField(name: string): SettingsField | undefined;
  getBooleanValue(name: string): boolean;
  getNumberValue(name: string): number;
}

export const ISettingsModel = new InjectionToken<ISettingsModel>("ISettingsModel");
