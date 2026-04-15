import type { Container } from "pixi.js";
import type { HudLayer } from "./HudLayer.js";

export interface IHud {
  addChild(layer: HudLayer, child: Container): void;
  removeChild(child: Container): void;
}
