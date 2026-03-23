import { HudViewBase } from "./HudViewBase";


export interface IHud {
    addView(view: HudViewBase): void;
    removeView(view: HudViewBase): void;
}
  