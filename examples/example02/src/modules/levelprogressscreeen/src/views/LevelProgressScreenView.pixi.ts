import * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import { ScreenView, type ScreenTransition } from "gamelabsjs";
import type { ILevelProgressScreenView } from "./ILevelProgressScreenView.js";

type LevelItemRefs = {
  view: PIXI.Container;
  bg: PIXI.Graphics;
  text: PIXI.Text;
  button: Button;
};

/**
 * Example02 level progress screen (Pixi).
 *
 * Shows a vertical list of level numbers (previous/current/next),
 * with the current one being clickable.
 */
export class LevelProgressScreenView extends ScreenView implements ILevelProgressScreenView {
  private static readonly defaultVisibleCount = 5;

  private static readonly itemWidth = 180;
  private static readonly itemHeight = 84;
  private static readonly itemGap = 18;
  private static readonly circleRadius = 28;
  private static readonly backButtonWidth = 110;
  private static readonly backButtonHeight = 44;

  private readonly cleanup: Array<() => void> = [];

  private readonly bg = new PIXI.Graphics();

  private readonly backButtonBg = new PIXI.Graphics();
  private readonly backButtonLabel = new PIXI.Text({
    text: "BACK",
    style: {
      fill: 0xe8eef6,
      fontSize: 14,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontWeight: "800",
      letterSpacing: 1
    }
  });
  private readonly backButtonView = this.createBackButtonView();
  private readonly backButton = new Button(this.backButtonView);

  private readonly levelsCol = new PIXI.Container({
    layout: {
      flexDirection: "column",
      gap: LevelProgressScreenView.itemGap,
      alignItems: "center"
    }
  });

  private readonly connectors = new PIXI.Graphics({
    layout: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }
  });

  private visibleCount = LevelProgressScreenView.defaultVisibleCount;
  private currentLevel = 1;

  private readonly initialVisibleCount: number | undefined;
  private readonly initialCurrentLevel: number | undefined;

  private items: LevelItemRefs[] = [];
  private readonly currentLevelClickListeners = new Set<() => void>();
  private readonly backClickListeners = new Set<() => void>();

  constructor(opts: { visibleCount?: number; currentLevel?: number } = {}) {
    super();
    this.initialVisibleCount = opts.visibleCount;
    this.initialCurrentLevel = opts.currentLevel;
  }

  public postInitialize(): void {
    if (typeof this.initialVisibleCount === "number") {
      this.visibleCount = Math.max(1, Math.floor(this.initialVisibleCount));
    }
    if (typeof this.initialCurrentLevel === "number") {
      this.currentLevel = Math.max(1, Math.floor(this.initialCurrentLevel));
    }

    // Full-screen container that centers its children.
    (this as any).layout = {
      width: 1,
      height: 1,
      justifyContent: "center",
      alignItems: "center"
    };

    (this.bg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.addChild(this.bg);

    // Top-right back button.
    (this.backButtonView as any).layout = {
      position: "absolute",
      top: 16,
      right: 16,
      width: LevelProgressScreenView.backButtonWidth,
      height: LevelProgressScreenView.backButtonHeight
    };
    this.addChild(this.backButtonView);
    const onBackPress = () => this.emitBackClick();
    this.backButton.onPress.connect(onBackPress);
    this.cleanup.push(() => this.backButton.onPress.disconnect(onBackPress));

    // Keep connectors behind the items.
    this.levelsCol.addChild(this.connectors);
    this.addChild(this.levelsCol);

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.redrawBackground(w, h);
    };
    this.on("layout", onLayout);
    this.cleanup.push(() => this.off("layout", onLayout));

    const onLevelsLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.redrawConnectors(w, h);
    };
    this.levelsCol.on("layout", onLevelsLayout);
    this.cleanup.push(() => this.levelsCol.off("layout", onLevelsLayout));

    this.rebuildItems();
    this.applyLevels();
  }

  override onResize(width: number, height: number, _dpr: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    (this as any).layout = { width: w, height: h };
    this.redrawBackground(w, h);
  }

  setCurrentLevel(level: number): void {
    const next = Math.max(1, Math.floor(level));
    if (next === this.currentLevel) return;
    this.currentLevel = next;
    this.applyLevels();
  }

  setVisibleCount(count: number): void {
    const next = Math.max(1, Math.floor(count));
    if (next === this.visibleCount) return;
    this.visibleCount = next;
    this.rebuildItems();
    this.applyLevels();
  }

  onCurrentLevelClick(cb: () => void): () => void {
    this.currentLevelClickListeners.add(cb);
    return () => this.currentLevelClickListeners.delete(cb);
  }

  onBackClick(cb: () => void): () => void {
    this.backClickListeners.add(cb);
    return () => this.backClickListeners.delete(cb);
  }

  private emitCurrentLevelClick(): void {
    for (const cb of this.currentLevelClickListeners) cb();
  }

  private emitBackClick(): void {
    for (const cb of this.backClickListeners) cb();
  }

  private redrawBackground(width: number, height: number): void {
    this.bg.clear();
    this.bg.rect(0, 0, width, height).fill({ color: 0x020617, alpha: 0.55 });
  }

  private createBackButtonView(): PIXI.Container {
    const view = new PIXI.Container();

    (this.backButtonBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    view.addChild(this.backButtonBg);

    this.backButtonLabel.anchor.set(0.5, 0.5);
    view.addChild(this.backButtonLabel);

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.backButtonLabel.position.set(w / 2, h / 2);
      this.backButtonBg.clear();
      this.backButtonBg.roundRect(0, 0, w, h, 12).fill({ color: 0x0b1220, alpha: 0.75 }).stroke({ color: 0x334155, width: 1 });
    };
    view.on("layout", onLayout);
    this.cleanup.push(() => view.off("layout", onLayout));

    return view;
  }

  private rebuildItems(): void {
    for (const it of this.items) {
      it.view.removeAllListeners();
      it.view.removeFromParent();
    }
    this.items = [];

    // Keep connectors as first child so it's behind.
    if (!this.connectors.parent) this.levelsCol.addChild(this.connectors);

    for (let i = 0; i < this.visibleCount; i++) {
      const { view, bg, text, button } = this.createLevelItemView(i);
      (view as any).layout = { width: LevelProgressScreenView.itemWidth, height: LevelProgressScreenView.itemHeight };
      this.items.push({ view, bg, text, button });
      this.levelsCol.addChild(view);
    }
  }

  private createLevelItemView(index: number): LevelItemRefs {
    const view = new PIXI.Container();

    const bg = new PIXI.Graphics({
      layout: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }
    });
    view.addChild(bg);

    const text = new PIXI.Text({
      text: "",
      style: {
        fill: 0xe8eef6,
        fontSize: 24,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontWeight: "800"
      }
    });
    text.anchor.set(0.5, 0.5);
    view.addChild(text);

    const button = new Button(view);
    const onPress = () => {
      // Only current level is clickable.
      if (index !== this.getCurrentIndex()) return;
      this.emitCurrentLevelClick();
    };
    button.onPress.connect(onPress);
    this.cleanup.push(() => button.onPress.disconnect(onPress));

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      text.position.set(w / 2, h / 2);
      this.redrawItem(bg, w, h, index === this.getCurrentIndex());
    };
    view.on("layout", onLayout);
    this.cleanup.push(() => view.off("layout", onLayout));

    return { view, bg, text, button };
  }

  private redrawItem(g: PIXI.Graphics, w: number, h: number, isCurrent: boolean): void {
    g.clear();
    const r = LevelProgressScreenView.circleRadius;
    const cx = w / 2;
    const cy = h / 2;

    // Outer subtle glow / stroke.
    g.circle(cx, cy, r + (isCurrent ? 6 : 3)).fill({ color: isCurrent ? 0x60a5fa : 0x334155, alpha: isCurrent ? 0.22 : 0.15 });

    // Main circle.
    g.circle(cx, cy, r).fill({ color: isCurrent ? 0x22c55e : 0x0b1220, alpha: isCurrent ? 0.95 : 0.72 });
    g.circle(cx, cy, r).stroke({ color: isCurrent ? 0x86efac : 0x475569, width: isCurrent ? 3 : 2, alpha: 0.9 });

    // Tiny top highlight.
    g.circle(cx - r * 0.25, cy - r * 0.25, r * 0.55).fill({ color: 0xffffff, alpha: isCurrent ? 0.18 : 0.10 });
  }

  private applyLevels(): void {
    const { levels, currentIndex } = this.computeWindow();

    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const levelNo = levels[i] ?? "";
      it.text.text = String(levelNo);
      it.text.style = {
        ...it.text.style,
        fill: i === currentIndex ? 0xffffff : 0xdbe7ff
      } as any;

      // Force redraw of the circle for current/non-current.
      const layout = (it.view as any).layout;
      if (layout?.width && layout?.height) this.redrawItem(it.bg, layout.width, layout.height, i === currentIndex);
      else this.redrawItem(it.bg, LevelProgressScreenView.itemWidth, LevelProgressScreenView.itemHeight, i === currentIndex);

      // Visual cue: only current looks clickable (cursor/alpha).
      it.view.alpha = i === currentIndex ? 1 : 0.85;
    }

    // Redraw connectors (in case current styling changes).
    const lc = (this.levelsCol as any).layout;
    if (lc?.width && lc?.height) this.redrawConnectors(lc.width, lc.height);
  }

  private redrawConnectors(_w: number, _h: number): void {
    this.connectors.clear();

    if (this.items.length < 2) return;

    // Draw a vertical spine passing through the centers of item circles.
    // Since items are centered in the column, use the first item's center X.
    const first = this.items[0]!;
    const itemW = (first.view as any).layout?.width ?? LevelProgressScreenView.itemWidth;
    const itemH = (first.view as any).layout?.height ?? LevelProgressScreenView.itemHeight;
    const cx = first.view.x + itemW / 2;
    const r = LevelProgressScreenView.circleRadius;

    this.connectors.stroke({ color: 0x94a3b8, width: 6, alpha: 0.18, cap: "round" as any });
    for (let i = 0; i < this.items.length - 1; i++) {
      const a = this.items[i]!;
      const b = this.items[i + 1]!;
      const ay = a.view.y + itemH / 2 + r + 8;
      const by = b.view.y + itemH / 2 - r - 8;
      this.connectors.moveTo(cx, ay);
      this.connectors.lineTo(cx, by);
    }
  }

  private computeWindow(): { levels: number[]; currentIndex: number } {
    const count = this.visibleCount;
    const mid = Math.floor(count / 2);
    const desiredIndex = Math.min(mid, Math.max(0, this.currentLevel - 1));
    const start = Math.max(1, this.currentLevel - desiredIndex);
    const levels = Array.from({ length: count }, (_, i) => start + i);
    const currentIndex = this.currentLevel - start;
    return { levels, currentIndex };
  }

  private getCurrentIndex(): number {
    return this.computeWindow().currentIndex;
  }

  override destroy(): void {
    for (const c of this.cleanup) c();
    this.cleanup.length = 0;
    this.items.length = 0;
    super.destroy();
  }
}

