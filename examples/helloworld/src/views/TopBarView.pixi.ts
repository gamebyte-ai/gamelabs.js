import * as PIXI from "pixi.js";
import { HudViewBase, ButtonComponent, VerticalLayoutComponent, HorizontalLayoutComponent } from "gamelabsjs";
import type { ITopBarView, Unsubscribe } from "./ITopBarView";

export class TopBarView extends HudViewBase implements ITopBarView {
  private static readonly gap = 10;
  private static readonly buttonHeight = 44;
  private static readonly barPadding = 10;
  private static readonly barRadius = 14;

  private readonly bar = new VerticalLayoutComponent({
    width: "100%",
    padding: TopBarView.barPadding,
    gap: TopBarView.gap,
    alignItems: "stretch",
  });

  private readonly barBg = new PIXI.Graphics({
    layout: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }
  });

  private readonly title = new PIXI.Text({
    text: "Example 01",
    style: {
      fill: 0xe8eef6,
      fontSize: 14,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontWeight: "600"
    }
  });

  private readonly buttonsRow = new HorizontalLayoutComponent({
    width: "100%",
    gap: TopBarView.gap,
    justifyContent: "flex-start",
  });

  private readonly toggleColorButton = new ButtonComponent({
    width: 200,
    height: TopBarView.buttonHeight,
    label: "Toggle cube color",
    labelStyle: { fontSize: 14, fontWeight: "400" },
    radius: 12,
    fillAlpha: 0.85,
  });

  private readonly toggleRotationButton = new ButtonComponent({
    width: 200,
    height: TopBarView.buttonHeight,
    label: "Toggle cube rotation",
    labelStyle: { fontSize: 14, fontWeight: "400" },
    radius: 12,
    fillAlpha: 0.85,
  });

  private readonly debugButton = new ButtonComponent({
    width: 100,
    height: TopBarView.buttonHeight,
    label: "Debug",
    labelStyle: { fontSize: 14 },
    radius: 12,
    fillAlpha: 0.85,
  });

  public postInitialize(): void {
    (this as any).layout = { width: "100%", padding: 16 };

    this.bar.addChild(this.barBg);

    (this.title as any).layout = { alignSelf: "center" };
    this.bar.addChild(this.title);

    this.buttonsRow.addChild(this.toggleColorButton);
    this.buttonsRow.addChild(this.toggleRotationButton);
    this.buttonsRow.addChild(this.debugButton);
    this.bar.addChild(this.buttonsRow);

    this.bar.on("layout", (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.barBg.clear();
      this.barBg
        .roundRect(0, 0, w, h, TopBarView.barRadius)
        .fill({ color: 0x0b1220, alpha: 0.9 })
        .stroke({ color: 0x334155, width: 1 });
    });

    this.addChild(this.bar);
  }

  onToggleColor(cb: () => void): Unsubscribe {
    return this.toggleColorButton.onPress(cb);
  }

  onToggleRotation(cb: () => void): Unsubscribe {
    return this.toggleRotationButton.onPress(cb);
  }

  onToggleDebug(cb: () => void): Unsubscribe {
    return this.debugButton.onPress(cb);
  }

  resize(_width: number, _height: number): void {
    // Layout handles sizing/positioning.
  }
}
