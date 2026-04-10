import * as PIXI from "pixi.js";
import { HudViewBase, ButtonComponent, HorizontalLayoutComponent } from "@gamebyte/gamelabsjs";
import type { IDebugBarView, Unsubscribe } from "./IDebugBarView";

export class DebugBarView extends HudViewBase implements IDebugBarView {
  private static readonly gap = 10;
  private static readonly barPadding = 10;
  private static readonly barButtonHeight = 40;
  private static readonly barButtonWidth = 100;
  private static readonly barRadius = 14;

  private readonly bar = new HorizontalLayoutComponent({
    width: "100%",
    padding: DebugBarView.barPadding,
    gap: DebugBarView.gap,
    justifyContent: "flex-start",
  });

  private readonly barBg = new PIXI.Graphics({
    layout: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }
  });

  private readonly gridButton = new ButtonComponent({
    width: DebugBarView.barButtonWidth,
    height: DebugBarView.barButtonHeight,
    label: "Grid:Off",
    labelStyle: { fontSize: 13 },
    radius: 10,
  });

  private readonly statsButton = new ButtonComponent({
    width: DebugBarView.barButtonWidth,
    height: DebugBarView.barButtonHeight,
    label: "Stats:Off",
    labelStyle: { fontSize: 13 },
    radius: 10,
  });

  private readonly logButton = new ButtonComponent({
    width: DebugBarView.barButtonWidth,
    height: DebugBarView.barButtonHeight,
    label: "Log:Off",
    labelStyle: { fontSize: 13 },
    radius: 10,
  });

  public postInitialize(): void {
    (this as any).layout = { width: "100%", padding: 16 };

    this.bar.addChild(this.barBg);
    this.bar.addChild(this.gridButton);
    this.bar.addChild(this.statsButton);
    this.bar.addChild(this.logButton);

    this.bar.on("layout", (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.barBg.clear();
      this.barBg
        .roundRect(0, 0, w, h, DebugBarView.barRadius)
        .fill({ color: 0x0b1220, alpha: 0.9 })
        .stroke({ color: 0x334155, width: 1 });
    });

    this.addChild(this.bar);
    this.setBarVisible(false);
  }

  public setGridLabel(text: string): void {
    this.gridButton.setLabel(text);
  }

  public setStatsLabel(text: string): void {
    this.statsButton.setLabel(text);
  }

  public setLogLabel(text: string): void {
    this.logButton.setLabel(text);
  }

  onToggleGroundGrid(cb: () => void): Unsubscribe {
    return this.gridButton.onPress(cb);
  }

  onToggleStats(cb: () => void): Unsubscribe {
    return this.statsButton.onPress(cb);
  }

  onToggleLog(cb: () => void): Unsubscribe {
    return this.logButton.onPress(cb);
  }

  setBarVisible(visible: boolean): void {
    this.bar.visible = visible;
  }

  resize(_width: number, _height: number): void {
    // Layout handles sizing/positioning.
  }
}
