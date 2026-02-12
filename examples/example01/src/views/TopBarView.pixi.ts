import * as PIXI from "pixi.js";
import type { ITopBarView, Unsubscribe } from "./ITopBarView";

export class TopBarView extends PIXI.Container implements ITopBarView {
  private readonly toggleButton = new PIXI.Container();
  private readonly rotationButton = new PIXI.Container();

  constructor() {
    super();

    const label = new PIXI.Text({
      text: "Example 01",
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
      text: "Toggle cube color",
      style: { fill: 0xe8eef6, fontSize: 14 }
    });
    btnText.position.set(14, 12);
    this.toggleButton.addChild(btnText);

    this.addChild(this.toggleButton);

    this.rotationButton.eventMode = "static";
    this.rotationButton.cursor = "pointer";
    this.rotationButton.position.set(16, 102);

    const rotBg = new PIXI.Graphics()
      .roundRect(0, 0, 220, 44, 12)
      .fill({ color: 0x111827, alpha: 0.85 })
      .stroke({ color: 0x334155, width: 1 });
    this.rotationButton.addChild(rotBg);

    const rotText = new PIXI.Text({
      text: "Toggle cube rotation",
      style: { fill: 0xe8eef6, fontSize: 14 }
    });
    rotText.position.set(14, 12);
    this.rotationButton.addChild(rotText);

    this.addChild(this.rotationButton);
  }

  onToggleColor(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.toggleButton.on("pointertap", handler);
    return () => this.toggleButton.off("pointertap", handler);
  }

  onToggleRotation(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.rotationButton.on("pointertap", handler);
    return () => this.rotationButton.off("pointertap", handler);
  }

  resize(_width: number, _height: number): void {
    // No-op for now. Keep for future responsive UI layout.
  }

  destroy(): void {
    this.toggleButton.removeAllListeners();
    this.rotationButton.removeAllListeners();
    this.removeFromParent();
  }
}

