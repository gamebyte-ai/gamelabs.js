import { SettingsFieldType } from "../constants/SettingsFieldType.js";
import type { SettingsField, SettingsNumberField } from "../SettingsField.js";
import type { ISettingsModel } from "./ISettingsModel.js";

/**
 * Holds settings field definitions and their current values.
 *
 * Read access is available through the {@link ISettingsModel} interface.
 * Mutations (set/reset) go through {@link SettingsManager}.
 */
export class SettingsModel implements ISettingsModel {
  private readonly _fields = new Map<string, SettingsField>();
  private readonly _values = new Map<string, unknown>();

  public addField(field: SettingsField): void {
    this._fields.set(field.name, field);
    if (!this._values.has(field.name)) {
      this._values.set(field.name, field.defaultValue);
    }
  }

  public getFields(): Iterable<SettingsField> {
    return this._fields.values();
  }

  public getField(name: string): SettingsField | undefined {
    return this._fields.get(name);
  }

  public getBooleanValue(name: string): boolean {
    const field = this._fields.get(name);
    if (!field || field.type !== SettingsFieldType.Boolean) return false;
    return (this._values.get(name) as boolean) ?? field.defaultValue;
  }

  public getNumberValue(name: string): number {
    const field = this._fields.get(name);
    if (!field || field.type !== SettingsFieldType.Number) return 0;
    return (this._values.get(name) as number) ?? field.defaultValue;
  }

  public setValue(name: string, value: unknown): void {
    this._values.set(name, value);
  }

  public isValidValue(field: SettingsField, value: unknown): boolean {
    if (field.type === SettingsFieldType.Boolean) {
      return typeof value === "boolean";
    }
    if (field.type === SettingsFieldType.Number) {
      return typeof value === "number" && Number.isFinite(value);
    }
    return false;
  }

  public clampNumberValue(field: SettingsNumberField, value: number): number {
    const clamped = Math.max(field.min, Math.min(field.max, value));
    return field.step > 0 ? Math.round(clamped / field.step) * field.step : clamped;
  }
}
