import type { IInjectionTarget } from "../di/IInjectionTarget.js";
import type { IView } from "./IView.js";

export interface IViewController<TView extends IView = IView> extends IInjectionTarget {
  initialize(view: TView): void;
  destroy(): void;
}
