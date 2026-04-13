import { SettingsFieldType } from "./constants/SettingsFieldType.js";

export { SettingsFieldType };

export type SettingsField = SettingsBooleanField | SettingsNumberField;

export class SettingsBooleanField {
  public readonly type = SettingsFieldType.Boolean;
  public readonly name: string;
  public readonly label: string;
  public readonly defaultValue: boolean;

  public constructor(name: string, label: string, defaultValue: boolean) {
    this.name = name;
    this.label = label;
    this.defaultValue = defaultValue;
  }
}

export class SettingsNumberField {
  public readonly type = SettingsFieldType.Number;
  public readonly name: string;
  public readonly label: string;
  public readonly defaultValue: number;
  public readonly min: number;
  public readonly max: number;
  public readonly step: number;

  public constructor(name: string, label: string, defaultValue: number, min: number, max: number, step: number = 1) {
    this.name = name;
    this.label = label;
    this.defaultValue = defaultValue;
    this.min = min;
    this.max = max;
    this.step = step;
  }
}
