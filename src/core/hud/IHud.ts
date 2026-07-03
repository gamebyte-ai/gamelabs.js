import type { Container } from "pixi.js";
import type { HudLayer } from "./HudLayer.js";

export interface IHud {
  addChild(layer: HudLayer, child: Container): void;
  removeChild(child: Container): void;
  resize(width: number, height: number): void;
  destroy(): void;
  hitTest(x: number, y: number): Container | null;
  readonly canvas: HTMLElement;
  readonly resolution: number;
}
