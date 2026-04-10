import type { IPopupView } from "../../../../core/ui/IPopupView.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

export interface ISettingsPopupView extends IPopupView {
  addBooleanField(name: string, label: string, value: boolean): void;
  addNumberField(name: string, label: string, value: number, min: number, max: number, step: number): void;
  updateFieldValue(name: string, value: unknown): void;
  onBooleanChanged(cb: (name: string, value: boolean) => void): Unsubscribe;
  onNumberChanged(cb: (name: string, value: number) => void): Unsubscribe;
  onCloseTapped(cb: () => void): Unsubscribe;
}
