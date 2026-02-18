import * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import { HudViewBase } from "gamelabsjs";
import type { ITopBarView, Unsubscribe } from "./ITopBarView";

export class TopBarView extends HudViewBase implements ITopBarView {
  private static readonly gap = 10;
  private static readonly buttonHeight = 44;
  private static readonly buttonMaxWidth = 220;
  private static readonly barPadding = 10;
  private static readonly barRadius = 14;

  // Must be initialized before any field initializer calls `createButtonView()`.
  private readonly cleanup: Array<() => void> = [];

  private readonly bar = new PIXI.Container({
    layout: {
      width: "100%",
      flexDirection: "column",
      padding: TopBarView.barPadding,
      gap: TopBarView.gap
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

  private readonly title = new PIXI.Text({
    text: "Example 01",
    style: {
      fill: 0xe8eef6,
      fontSize: 14,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontWeight: "600"
    }
  });

  private readonly buttonsRow = new PIXI.Container({
    layout: { width: "100%", flexDirection: "row", gap: TopBarView.gap }
  });

  private readonly toggleButtonView = this.createButtonView("Toggle cube color");
  private readonly rotationButtonView = this.createButtonView("Toggle cube rotation");
  private readonly debugButtonView = this.createButtonView("Debug", { strong: true });

  private readonly toggleButton = new Button(this.toggleButtonView);
  private readonly rotationButton = new Button(this.rotationButtonView);
  private readonly debugButton = new Button(this.debugButtonView);

  public postInitialize(): void {
    (this as any).layout = { width: "100%", padding: 16 };
    this.bar.addChild(this.barBg);

    // Title should size intrinsically and center itself.
    (this.title as any).layout = { alignSelf: "center" };
    this.bar.addChild(this.title);

    // Buttons row fills horizontally; buttons flex to available width with a max.
    for (const v of [this.toggleButtonView, this.rotationButtonView, this.debugButtonView]) {
      (v as any).layout = {
        height: TopBarView.buttonHeight,
        flexGrow: 1,
        flexShrink: 1,
        maxWidth: TopBarView.buttonMaxWidth
      };
      this.buttonsRow.addChild(v);
    }
    this.bar.addChild(this.buttonsRow);

    // Redraw bar background whenever layout changes.
    const onBarLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.barBg.clear();
      this.barBg
        .roundRect(0, 0, w, h, TopBarView.barRadius)
        .fill({ color: 0x0b1220, alpha: 0.9 })
        .stroke({ color: 0x334155, width: 1 });
    };
    this.bar.on("layout", onBarLayout);
    this.cleanup.push(() => this.bar.off("layout", onBarLayout));

    this.addChild(this.bar);
  }

  private createButtonView(label: string, opts: { strong?: boolean } = {}): PIXI.Container {
    const view = new PIXI.Container();

    // Layout: the parent assigns width; we handle height + maxWidth.
    (view as any).layout = { height: TopBarView.buttonHeight };

    const bg = new PIXI.Graphics({
      layout: {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%"
      }
    });
    view.addChild(bg);

    const text = new PIXI.Text({
      text: label,
      style: {
        fill: 0xe8eef6,
        fontSize: 14,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        ...(opts.strong ? { fontWeight: "600" } : null)
      }
    });
    // Keep it simple: padding-based placement. Layout will keep the view sized.
    text.position.set(14, 12);
    view.addChild(text);

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      bg.clear();
      bg.roundRect(0, 0, w, h, 12).fill({ color: 0x111827, alpha: 0.85 }).stroke({ color: 0x334155, width: 1 });
    };
    view.on("layout", onLayout);
    this.cleanup.push(() => view.off("layout", onLayout));

    return view;
  }

  onToggleColor(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.toggleButton.onPress.connect(handler);
    return () => this.toggleButton.onPress.disconnect(handler);
  }

  onToggleRotation(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.rotationButton.onPress.connect(handler);
    return () => this.rotationButton.onPress.disconnect(handler);
  }

  onToggleDebug(cb: () => void): Unsubscribe {
    const handler = () => cb();
    this.debugButton.onPress.connect(handler);
    return () => this.debugButton.onPress.disconnect(handler);
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

