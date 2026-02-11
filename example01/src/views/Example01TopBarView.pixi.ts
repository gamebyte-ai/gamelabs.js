import * as PIXI from "pixi.js";
import type { IExample01TopBarView, Unsubscribe } from "./IExample01TopBarView";

export class Example01TopBarView extends PIXI.Container implements IExample01TopBarView {
  private readonly toggleButton = new PIXI.Container();

  constructor() {
    super();

    const label = new PIXI.Text({
      text: "Pixi UI over Three world",
      style: {
        fill: 0xe8eef6,
        fontSize: 18,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
      }
    });
    label.position.set(16, 14);
    this.addChild(label);

    this.toggleButton.eventMode = "static";
    this.toggleButton.cursor = "pointer";
    this.toggleButton.position.set(16, 50);

    const btnBg = new PIXI.Graphics()
      .roundRect(0, 0, 220, 44, 12)
      .fill({ color: 0x111827, alpha: 0.85 })
      .stroke({ color: 0x334155, width: 1 });
    this.toggleButton.addChild(btnBg);

    const btnText = new PIXI.Text({
      text: "Click: toggle cube color",
      style: { fill: 0xe8eef6, fontSize: 14 }
    });
    btnText.position.set(14, 12);
    this.toggleButton.addChild(btnText);

    this.addChild(this.toggleButton);
  }

  onToggleColor(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.toggleButton.on("pointertap", handler);
    return () => this.toggleButton.off("pointertap", handler);
  }

  resize(_width: number, _height: number): void {
    // No-op for now. Keep for future responsive UI layout.
  }

  destroy(): void {
    this.toggleButton.removeAllListeners();
    this.removeFromParent();
  }
}

