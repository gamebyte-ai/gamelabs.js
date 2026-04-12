import { UnsubscribeBag } from "../../../../core/events/subscriptions.js";
import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import type { IViewController } from "../../../../core/views/IViewController.js";
import { UIEvents } from "../../../../core/ui/UIEvents.js";
import type { ISettingsPopupView } from "../views/ISettingsPopupView.js";
import { SettingsManager } from "../utilities/SettingsManager.js";
import { SettingsFieldType } from "../SettingsField.js";
import type { SettingsNumberField } from "../SettingsField.js";

export class SettingsPopupViewController implements IViewController<ISettingsPopupView> {
  private _view: ISettingsPopupView | null = null;
  private _manager: SettingsManager | null = null;
  private _uiEvents: UIEvents | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._manager = resolver.getInstance(SettingsManager);
    this._uiEvents = resolver.getInstance(UIEvents);
  }

  public initialize(view: ISettingsPopupView): void {
    this._view = view;

    // Populate view with current fields
    for (const field of this._manager!.getFields()) {
      if (field.type === SettingsFieldType.Boolean) {
        view.addBooleanField(field.name, field.label, this._manager!.getBooleanValue(field.name));
      } else if (field.type === SettingsFieldType.Number) {
        const nf = field as SettingsNumberField;
        view.addNumberField(field.name, field.label, this._manager!.getNumberValue(field.name), nf.min, nf.max, nf.step);
      }
    }

    // View → Manager
    this._subs.add(
      view.onBooleanChanged((name, value) => {
        this._manager?.setBooleanValue(name, value);
      }),
    );

    this._subs.add(
      view.onNumberChanged((name, value) => {
        this._manager?.setNumberValue(name, value);
      }),
    );

    this._subs.add(
      view.onCloseTapped(() => {
        this._uiEvents?.removeTopPopup();
      }),
    );
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._manager = null;
    this._uiEvents = null;
  }
}
