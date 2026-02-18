import * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import { HudViewBase } from "gamelabsjs";
import type { IDebugBarView, Unsubscribe } from "./IDebugBarView";

export class DebugBarView extends HudViewBase implements IDebugBarView {
  private static readonly gap = 10;

  private static readonly barPadding = 10;
  private static readonly barButtonHeight = 40;
  private static readonly barButtonMinWidth = 92;
  private static readonly barRadius = 14;

  // Must be initialized before any field initializer calls `createButtonView()`.
  private readonly cleanup: Array<() => void> = [];

  private readonly bar = new PIXI.Container({
    layout: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "flex-start",
      padding: DebugBarView.barPadding,
      gap: DebugBarView.gap
    }
  });
  private readonly barBg = new PIXI.Graphics({
    layout: {
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%"
    }
  });

  private readonly gridButtonView = this.createButtonView("Grid");
  private readonly gridButton = new Button(this.gridButtonView);

  private readonly statsButtonView = this.createButtonView("Stats");
  private readonly statsButton = new Button(this.statsButtonView);

  public postInitialize(): void {
    (this as any).layout = { width: "100%", padding: 16 };
    this.createBar();
    this.addChild(this.bar);

    this.setBarVisible(false);
  }

  private createBar(): void {
    this.bar.addChild(this.barBg);

    // IMPORTANT: @pixi/layout doesn't measure intrinsic content width for plain Containers,
    // so we must provide width constraints; otherwise children can overlap at x=0.
    for (const v of [this.gridButtonView, this.statsButtonView]) {
      (v as any).layout = {
        height: DebugBarView.barButtonHeight,
        minWidth: DebugBarView.barButtonMinWidth,
        flexGrow: 0,
        flexShrink: 0
      };
      this.bar.addChild(v);
    }

    const onBarLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.barBg.clear();
      this.barBg
        .roundRect(0, 0, w, h, DebugBarView.barRadius)
        .fill({ color: 0x0b1220, alpha: 0.9 })
        .stroke({ color: 0x334155, width: 1 });
    };
    this.bar.on("layout", onBarLayout);
    this.cleanup.push(() => this.bar.off("layout", onBarLayout));
  }

  private createButtonView(label: string): PIXI.Container {
    const view = new PIXI.Container();

    const bg = new PIXI.Graphics();
    (bg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    view.addChild(bg);

    const text = new PIXI.Text({
      text: label,
      style: {
        fill: 0xe8eef6,
        fontSize: 13,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
      }
    });
    text.position.set(12, 11);
    view.addChild(text);

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      bg.clear();
      bg.roundRect(0, 0, w, h, 10).fill({ color: 0x111827, alpha: 0.92 }).stroke({ color: 0x334155, width: 1 });
    };
    view.on("layout", onLayout);
    this.cleanup.push(() => view.off("layout", onLayout));

    return view;
  }

  onToggleGroundGrid(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.gridButton.onPress.connect(handler);
    return () => this.gridButton.onPress.disconnect(handler);
  }

  onToggleStats(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.statsButton.onPress.connect(handler);
    return () => this.statsButton.onPress.disconnect(handler);
  }

  setBarVisible(visible: boolean): void {
    this.bar.visible = visible;
  }

  resize(width: number, height: number): void {
    // Layout handles sizing/positioning; keep the method for API compatibility.
    void width;
    void height;
  }

  destroy(): void {
    for (const c of this.cleanup) c();
    this.cleanup.length = 0;
    super.destroy();
  }
}

