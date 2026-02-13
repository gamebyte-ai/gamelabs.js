import * as PIXI from "pixi.js";
import type { IViewController } from "gamelabsjs";
import type { ITopBarView, Unsubscribe } from "./ITopBarView";

export class TopBarView extends PIXI.Container implements ITopBarView {
  private static readonly margin = 16;
  private static readonly gap = 10;
  private static readonly titleY = 12;
  private static readonly buttonsY = 50;

  private static readonly buttonWidth = 220;
  private static readonly buttonHeight = 44;
  private static readonly buttonCount = 3;

  private static readonly barPadding = 10;
  private static readonly barRadius = 14;

  private readonly bar = new PIXI.Container();
  private readonly barBg = new PIXI.Graphics();

  private readonly title = new PIXI.Text({
    text: "Example 01",
    style: {
      fill: 0xe8eef6,
      fontSize: 14,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontWeight: "600"
    }
  });

  private readonly toggleBg = new PIXI.Graphics();
  private readonly rotationBg = new PIXI.Graphics();
  private readonly debugBg = new PIXI.Graphics();

  private readonly toggleButton = new PIXI.Container();
  private readonly rotationButton = new PIXI.Container();
  private readonly debugButton = new PIXI.Container();

  private controller: IViewController | null = null;

  constructor() {
    super();

    this.createBarBackground();

    this.title.position.set(0, TopBarView.titleY);
    this.bar.addChild(this.title);

    this.toggleButton.eventMode = "static";
    this.toggleButton.cursor = "pointer";
    this.toggleButton.position.set(0, 0);

    this.toggleBg
      .roundRect(0, 0, 10, TopBarView.buttonHeight, 12)
      .fill({ color: 0x111827, alpha: 0.85 })
      .stroke({ color: 0x334155, width: 1 });
    this.toggleButton.addChild(this.toggleBg);

    const btnText = new PIXI.Text({
      text: "Toggle cube color",
      style: {
        fill: 0xe8eef6,
        fontSize: 14,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
      }
    });
    btnText.position.set(14, 12);
    this.toggleButton.addChild(btnText);

    this.bar.addChild(this.toggleButton);

    this.rotationButton.eventMode = "static";
    this.rotationButton.cursor = "pointer";
    this.rotationButton.position.set(0, 0);

    this.rotationBg
      .roundRect(0, 0, 10, TopBarView.buttonHeight, 12)
      .fill({ color: 0x111827, alpha: 0.85 })
      .stroke({ color: 0x334155, width: 1 });
    this.rotationButton.addChild(this.rotationBg);

    const rotText = new PIXI.Text({
      text: "Toggle cube rotation",
      style: {
        fill: 0xe8eef6,
        fontSize: 14,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
      }
    });
    rotText.position.set(14, 12);
    this.rotationButton.addChild(rotText);

    this.bar.addChild(this.rotationButton);

    this.debugButton.eventMode = "static";
    this.debugButton.cursor = "pointer";
    this.debugButton.position.set(0, 0);

    this.debugBg
      .roundRect(0, 0, 10, TopBarView.buttonHeight, 12)
      .fill({ color: 0x111827, alpha: 0.85 })
      .stroke({ color: 0x334155, width: 1 });
    this.debugButton.addChild(this.debugBg);

    const debugText = new PIXI.Text({
      text: "Debug",
      style: {
        fill: 0xe8eef6,
        fontSize: 14,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontWeight: "600"
      }
    });
    debugText.position.set(14, 12);
    this.debugButton.addChild(debugText);

    this.bar.addChild(this.debugButton);

    this.addChild(this.bar);

    // Initial layout (proper sizing happens on first real resize pass).
    this.bar.position.set(TopBarView.margin, 0);
  }

  setController(controller: IViewController | null): void {
    this.controller = controller;
  }

  private createBarBackground(): void {
    // Background width is computed in `resize()` to fill available canvas width.
    const barHeight = TopBarView.barPadding * 2 + TopBarView.buttonHeight;
    this.barBg
      .roundRect(0, 0, 10, barHeight, TopBarView.barRadius)
      .fill({ color: 0x0b1220, alpha: 0.9 })
      .stroke({ color: 0x334155, width: 1 });
    this.bar.addChild(this.barBg);
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

  onToggleDebug(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.debugButton.on("pointertap", handler);
    return () => this.debugButton.off("pointertap", handler);
  }

  resize(width: number, height: number): void {
    const margin = TopBarView.margin;
    const barHeight = TopBarView.buttonsY + TopBarView.buttonHeight + TopBarView.barPadding;

    const desiredBarX = margin;
    const desiredBarY = 0;

    const barWidth = Math.max(0, width - margin * 2);

    // Clamp Y so it doesn't drift off small viewports.
    const maxY = Math.max(0, height - barHeight);
    const barY = Math.max(0, Math.min(desiredBarY, maxY));

    // Redraw stretch background.
    this.barBg.clear();
    this.barBg
      .roundRect(0, 0, barWidth, barHeight, TopBarView.barRadius)
      .fill({ color: 0x0b1220, alpha: 0.9 })
      .stroke({ color: 0x334155, width: 1 });

    const innerWidth = Math.max(0, barWidth - TopBarView.barPadding * 2);
    const totalGap = TopBarView.gap * (TopBarView.buttonCount - 1);
    const perButtonWidth = Math.max(0, Math.floor((innerWidth - totalGap) / TopBarView.buttonCount));
    const buttonWidth = Math.min(TopBarView.buttonWidth, perButtonWidth);

    // Center the title horizontally within the stretched bar.
    const titleX = Math.max(0, (barWidth - this.title.width) / 2);
    this.title.position.set(titleX, TopBarView.titleY);

    // Redraw button backgrounds to match computed width.
    for (const bg of [this.toggleBg, this.rotationBg, this.debugBg]) {
      bg.clear();
      bg.roundRect(0, 0, buttonWidth, TopBarView.buttonHeight, 12)
        .fill({ color: 0x111827, alpha: 0.85 })
        .stroke({ color: 0x334155, width: 1 });
    }

    const y = TopBarView.buttonsY;
    this.toggleButton.position.set(TopBarView.barPadding, y);
    this.rotationButton.position.set(TopBarView.barPadding + (buttonWidth + TopBarView.gap) * 1, y);
    this.debugButton.position.set(TopBarView.barPadding + (buttonWidth + TopBarView.gap) * 2, y);

    this.bar.position.set(desiredBarX, barY);
  }

  destroy(): void {
    this.controller?.destroy();
    this.controller = null;

    this.toggleButton.removeAllListeners();
    this.rotationButton.removeAllListeners();
    this.debugButton.removeAllListeners();
    this.removeFromParent();
  }
}

