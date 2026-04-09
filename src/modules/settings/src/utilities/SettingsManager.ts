import { StorageService } from "../../../../core/services/StorageService.js";
import { SettingsFieldType } from "../SettingsField.js";
import type { SettingsField, SettingsNumberField } from "../SettingsField.js";
import { SettingsEvents } from "../events/SettingsEvents.js";
import { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import { IInjectionTarget } from "../../../../core/di/IInjectionTarget.js";

/**
 * Manages typed settings fields with validation, persistence, and change events.
 *
 * - Fields are registered via `addField()` (before or after init).
 * - Values are loaded from `StorageService` on first access, falling back to the field's default.
 * - On every `setValue()`, the value is validated, persisted, and a change event is emitted.
 */
export class SettingsManager implements IInjectionTarget{
  //  FIELDS
  private _storage: StorageService | null = null;
  private _events: SettingsEvents | null = null;
  private readonly _fields = new Map<string, SettingsField>();
  private readonly _values = new Map<string, unknown>();

  public inject(resolver: IInstanceResolver): void {
    this._storage = resolver.getInstance(StorageService);
    this._events = resolver.getInstance(SettingsEvents);
  }
  // ── Field registration ──

  public addField(field: SettingsField): void {
    this._fields.set(field.name, field);

    // Load persisted value or use default
    const stored = this._storage?.load<unknown>(field.name);
    if (stored !== null && this._isValidValue(field, stored)) {
      this._values.set(field.name, stored);
    } else {
      this._values.set(field.name, field.defaultValue);
    }
  }

  public getFields(): Iterable<SettingsField> {
    return this._fields.values();
  }

  public getField(name: string): SettingsField | undefined {
    return this._fields.get(name);
  }

  // ── Typed getters ──

  public getBooleanValue(name: string): boolean {
    const field = this._fields.get(name);
    if (!field || field.type !== SettingsFieldType.Boolean) return false;
    return this._values.get(name) as boolean ?? field.defaultValue;
  }

  public getNumberValue(name: string): number {
    const field = this._fields.get(name);
    if (!field || field.type !== SettingsFieldType.Number) return 0;
    return this._values.get(name) as number ?? field.defaultValue;
  }

  // ── Typed setters ──

  public setBooleanValue(name: string, value: boolean): void {
    const field = this._fields.get(name);
    if (!field || field.type !== SettingsFieldType.Boolean) return;
    this._values.set(name, value);
    this._storage?.save(name, value);
    this._events?.emitValueChanged(name);
  }

  public setNumberValue(name: string, value: number): void {
    const field = this._fields.get(name);
    if (!field || field.type !== SettingsFieldType.Number) return;
    const nf = field as SettingsNumberField;
    const clamped = Math.max(nf.min, Math.min(nf.max, value));
    const stepped = nf.step > 0 ? Math.round(clamped / nf.step) * nf.step : clamped;
    this._values.set(name, stepped);
    this._storage?.save(name, stepped);
    this._events?.emitValueChanged(name);
  }

  // ── Reset ──

  public resetToDefaults(): void {
    for (const field of this._fields.values()) {
      this._values.set(field.name, field.defaultValue);
      this._storage?.save(field.name, field.defaultValue);
      this._events?.emitValueChanged(field.name);
    }
  }

  // ── Validation ──

  private _isValidValue(field: SettingsField, value: unknown): boolean {
    if (field.type === SettingsFieldType.Boolean) {
      return typeof value === "boolean";
    }
    if (field.type === SettingsFieldType.Number) {
      return typeof value === "number" && Number.isFinite(value);
    }
    return false;
  }
}
