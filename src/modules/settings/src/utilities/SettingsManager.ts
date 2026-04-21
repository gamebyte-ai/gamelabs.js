import { StorageService } from "../../../../core/services/StorageService.js";
import { SettingsFieldType } from "../constants/SettingsFieldType.js";
import type { SettingsField, SettingsNumberField } from "../SettingsField.js";
import { SettingsEvents } from "../events/SettingsEvents.js";
import { SettingsModel } from "../models/SettingsModel.js";
import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import type { IInjectionTarget } from "../../../../core/di/IInjectionTarget.js";

/**
 * Coordinates settings mutations: validation, persistence, and event emission.
 *
 * Read access goes through {@link ISettingsModel} (readonly interface).
 * This manager handles writes via typed setters that validate, update the
 * model, persist to storage, and emit change events.
 */
export class SettingsManager implements IInjectionTarget {
  private _model: SettingsModel | null = null;
  private _storage: StorageService | null = null;
  private _events: SettingsEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._model = resolver.getInstance(SettingsModel);
    this._storage = resolver.getInstance(StorageService);
    this._events = resolver.getInstance(SettingsEvents);
    this._rehydrateFields();
  }

  public addField(field: SettingsField): void {
    this._model!.addField(field);

    // Load persisted value if storage is available
    const stored = this._storage?.load<unknown>(field.name);
    if (stored !== null && this._model!.isValidValue(field, stored)) {
      this._model!.setValue(field.name, stored);
    }
  }

  public setBooleanValue(name: string, value: boolean): void {
    const field = this._model!.getField(name);
    if (!field || field.type !== SettingsFieldType.Boolean) return;
    this._model!.setValue(name, value);
    this._storage?.save(name, value);
    this._events?.emitValueChanged(name);
  }

  public setNumberValue(name: string, value: number): void {
    const field = this._model!.getField(name);
    if (!field || field.type !== SettingsFieldType.Number) return;
    const stepped = this._model!.clampNumberValue(field as SettingsNumberField, value);
    this._model!.setValue(name, stepped);
    this._storage?.save(name, stepped);
    this._events?.emitValueChanged(name);
  }

  public resetToDefaults(): void {
    for (const field of this._model!.getFields()) {
      this._model!.setValue(field.name, field.defaultValue);
      this._storage?.save(field.name, field.defaultValue);
      this._events?.emitValueChanged(field.name);
    }
  }

  /** Load persisted values for all registered fields from storage. */
  private _rehydrateFields(): void {
    if (!this._storage || !this._model) return;
    for (const field of this._model.getFields()) {
      const stored = this._storage.load<unknown>(field.name);
      if (stored !== null && this._model.isValidValue(field, stored)) {
        this._model.setValue(field.name, stored);
      }
    }
  }
}
