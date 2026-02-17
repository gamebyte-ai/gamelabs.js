import type { IInstanceResolver } from "../core/di/IInstanceResolver.js";
import type { IView } from "./IView.js";

export interface IViewController<TView extends IView = IView> {
  initialize(view: TView, resolver: IInstanceResolver): void;
  destroy(): void;
}

