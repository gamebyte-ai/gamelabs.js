export enum SettingsFieldType {
  Boolean = "boolean",
  Number = "number",
}

export type SettingsField = SettingsBooleanField | SettingsNumberField;

export class SettingsBooleanField {
  readonly type = SettingsFieldType.Boolean;
  readonly name: string;
  readonly label: string;
  readonly defaultValue: boolean;

  constructor(name: string, label: string, defaultValue: boolean) {
    this.name = name;
    this.label = label;
    this.defaultValue = defaultValue;
  }
}

export class SettingsNumberField {
  readonly type = SettingsFieldType.Number;
  readonly name: string;
  readonly label: string;
  readonly defaultValue: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;

  constructor(name: string, label: string, defaultValue: number, min: number, max: number, step: number = 1) {
    this.name = name;
    this.label = label;
    this.defaultValue = defaultValue;
    this.min = min;
    this.max = max;
    this.step = step;
  }
}
