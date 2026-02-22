import * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import { ScreenView } from "../../../../core/ui/ScreenView.pixi.js";
import type { ILevelProgressScreenView } from "./ILevelProgressScreenView.js";
import { LevelProgressScreenAssets } from "../LevelProgressScreenAssets.js";

type LevelItemRefs = {
  view: PIXI.Container;
  bgPlaceholder: PIXI.Graphics;
  bgSprite: PIXI.Sprite;
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
  private static readonly itemActiveExtraWidth = 22;
  private static readonly itemActiveExtraHeight = 10;
  private static readonly itemActiveTint = 0x22c55e;
  private static readonly backButtonWidth = 220;
  private static readonly backButtonHeight = 88;
  private static readonly backButtonAspect = 2.5;

  private readonly cleanup: Array<() => void> = [];

  private readonly bgImage = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly bg = new PIXI.Graphics();

  private backButtonBgTargetWidth = LevelProgressScreenView.backButtonWidth;
  private backButtonBgTargetHeight = LevelProgressScreenView.backButtonHeight;

  private readonly backButtonBgPlaceholder = new PIXI.Graphics();
  private readonly backButtonBg = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly backButtonLabel = new PIXI.Text({
    text: "BACK",
    style: {
      fill: 0xe8eef6,
      fontSize: 16,
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

  public constructor(opts: { visibleCount?: number; currentLevel?: number } = {}) {
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

    // IMPORTANT: do not put the background sprite under @pixi/layout control.
    // We manually size/position it for "cover" behavior in `redrawBackground()`.
    this.bgImage.visible = false;
    this.addChild(this.bgImage);

    (this.bg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.addChild(this.bg);

    // Top-right back button.
    this.applyBackButtonLayout((this as any).layout?.width ?? 1);
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
    this.applyTexturesIfAvailable();
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    (this as any).layout = { width: w, height: h };
    this.applyBackButtonLayout(w);
    this.redrawBackground(w, h);
  }

  private applyBackButtonLayout(screenWidth: number): void {
    const w = Math.max(1, Math.floor(screenWidth));
    const targetW = Math.max(220, Math.min(340, Math.round(w * 0.22)));
    const targetH = Math.max(64, Math.round(targetW / LevelProgressScreenView.backButtonAspect));

    (this.backButtonView as any).layout = {
      position: "absolute",
      top: 16,
      right: 16,
      width: targetW,
      height: targetH
    };

    const targetFontSize = Math.max(16, Math.min(22, Math.round(targetH * 0.34)));
    this.backButtonLabel.style = { ...this.backButtonLabel.style, fontSize: targetFontSize } as any;
  }

  public setCurrentLevel(level: number): void {
    const next = Math.max(1, Math.floor(level));
    if (next === this.currentLevel) return;
    this.currentLevel = next;
    this.applyLevels();
  }

  public setVisibleCount(count: number): void {
    const next = Math.max(1, Math.floor(count));
    if (next === this.visibleCount) return;
    this.visibleCount = next;
    this.rebuildItems();
    this.applyLevels();
  }

  public onCurrentLevelClick(cb: () => void): () => void {
    this.currentLevelClickListeners.add(cb);
    return () => this.currentLevelClickListeners.delete(cb);
  }

  public onBackClick(cb: () => void): () => void {
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
    // If the JPEG is available, scale it to COVER the screen without distortion.
    if (this.bgImage.texture !== PIXI.Texture.EMPTY) {
      this.bgImage.visible = true;
      const tw = Math.max(1, this.bgImage.texture.width);
      const th = Math.max(1, this.bgImage.texture.height);
      const scale = Math.max(width / tw, height / th);
      this.bgImage.scale.set(scale, scale);
      this.bgImage.position.set((width - tw * scale) / 2, (height - th * scale) / 2);

      // Optional subtle dark overlay for UI readability.
      this.bg.clear();
      this.bg.rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.12 });
      return;
    }

    // Fallback if the texture isn't loaded yet.
    this.bgImage.visible = false;
    this.bg.clear();
    this.bg.rect(0, 0, width, height).fill({ color: 0x020617, alpha: 0.55 });
  }

  private applyTexturesIfAvailable(): void {
    const backButtonBg = this.assetLoader.getAsset<PIXI.Texture>(LevelProgressScreenAssets.BackButtonBg.id);
    if (backButtonBg && this.backButtonBg.texture === PIXI.Texture.EMPTY) {
      this.backButtonBg.texture = backButtonBg;
      this.backButtonBg.visible = true;
      this.backButtonBgPlaceholder.visible = false;
      this.applyBackButtonBgSize();
    }

    this.applyLevelItemBgTextures();

    const background = this.assetLoader.getAsset<PIXI.Texture>(LevelProgressScreenAssets.Background.id);
    if (background && this.bgImage.texture === PIXI.Texture.EMPTY) {
      this.bgImage.texture = background;
      const layout = (this as any).layout;
      if (layout?.width && layout?.height) this.redrawBackground(layout.width, layout.height);
    }
  }

  private createBackButtonView(): PIXI.Container {
    const view = new PIXI.Container();

    (this.backButtonBgPlaceholder as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    view.addChild(this.backButtonBgPlaceholder);

    (this.backButtonBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.backButtonBg.visible = false;
    view.addChild(this.backButtonBg);

    this.backButtonLabel.anchor.set(0.5, 0.5);
    view.addChild(this.backButtonLabel);

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.backButtonBgTargetWidth = w;
      this.backButtonBgTargetHeight = h;
      this.backButtonLabel.position.set(w / 2, h / 2);
      this.redrawBackButtonPlaceholder(w, h);
      this.applyBackButtonBgSize();
    };
    view.on("layout", onLayout);
    this.cleanup.push(() => view.off("layout", onLayout));

    return view;
  }

  private redrawBackButtonPlaceholder(width: number, height: number): void {
    this.backButtonBgPlaceholder.clear();
    this.backButtonBgPlaceholder.roundRect(0, 0, width, height, 12).fill({ color: 0x0b1220, alpha: 0.75 }).stroke({ color: 0x334155, width: 1 });
  }

  private applyBackButtonBgSize(): void {
    if (this.backButtonBg.texture === PIXI.Texture.EMPTY) return;
    this.backButtonBg.scale.set(1, 1);
    this.backButtonBg.width = this.backButtonBgTargetWidth;
    this.backButtonBg.height = this.backButtonBgTargetHeight;
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
      const { view, bgPlaceholder, bgSprite, text, button } = this.createLevelItemView(i);
      (view as any).layout = { width: LevelProgressScreenView.itemWidth, height: LevelProgressScreenView.itemHeight };
      this.items.push({ view, bgPlaceholder, bgSprite, text, button });
      this.levelsCol.addChild(view);
    }
  }

  private createLevelItemView(index: number): LevelItemRefs {
    const view = new PIXI.Container();

    const bgPlaceholder = new PIXI.Graphics({
      layout: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }
    });
    view.addChild(bgPlaceholder);

    const bgSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    (bgSprite as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    bgSprite.visible = false;
    view.addChild(bgSprite);

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

      bgPlaceholder.clear();
      const isActive = index === this.getCurrentIndex();
      bgPlaceholder.roundRect(0, 0, w, h, 18).fill({ color: isActive ? 0x052e16 : 0x0b1220, alpha: isActive ? 0.78 : 0.72 }).stroke({ color: isActive ? 0x22c55e : 0x475569, width: 2, alpha: 0.9 });

      if (bgSprite.texture !== PIXI.Texture.EMPTY) {
        bgSprite.scale.set(1, 1);
        bgSprite.width = w;
        bgSprite.height = h;
      }
    };
    view.on("layout", onLayout);
    this.cleanup.push(() => view.off("layout", onLayout));

    return { view, bgPlaceholder, bgSprite, text, button };
  }

  private applyLevels(): void {
    const { levels, currentIndex } = this.computeWindow();

    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (!it) continue;
      const levelNo = levels[i] ?? "";
      it.text.text = String(levelNo);
      it.text.style = {
        ...it.text.style,
        fill: i === currentIndex ? 0xffffff : 0xdbe7ff
      } as any;

      // Visual cue: only current looks clickable (cursor/alpha).
      it.view.alpha = i === currentIndex ? 1 : 0.85;
    }

    this.applyLevelItemBgTextures();

    // Redraw connectors (in case current styling changes).
    const lc = (this.levelsCol as any).layout;
    if (lc?.width && lc?.height) this.redrawConnectors(lc.width, lc.height);
  }

  private applyLevelItemBgTextures(): void {
    if (!this.items.length) return;

    const { currentIndex } = this.computeWindow();
    const normal = this.assetLoader.getAsset<PIXI.Texture>(LevelProgressScreenAssets.LevelItemBg.id);

    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]!;
      const isActive = i === currentIndex;
      const desired = normal;
      if (!desired) continue;

      if (it.bgSprite.texture !== desired) {
        it.bgSprite.texture = desired;
        it.bgSprite.visible = true;
        it.bgPlaceholder.visible = false;
      }

      it.bgSprite.tint = isActive ? LevelProgressScreenView.itemActiveTint : 0xffffff;

      const baseW = LevelProgressScreenView.itemWidth;
      const baseH = LevelProgressScreenView.itemHeight;
      const w = isActive ? baseW + LevelProgressScreenView.itemActiveExtraWidth : baseW;
      const h = isActive ? baseH + LevelProgressScreenView.itemActiveExtraHeight : baseH;
      (it.view as any).layout = { width: w, height: h };

      it.bgSprite.scale.set(1, 1);
      it.bgSprite.width = w;
      it.bgSprite.height = h;
    }
  }

  private redrawConnectors(_w: number, _h: number): void {
    this.connectors.clear();

    if (this.items.length < 2) return;

    // Draw a vertical spine passing through the centers of item backgrounds.
    const pad = 10;

    this.connectors.stroke({ color: 0x94a3b8, width: 6, alpha: 0.18, cap: "round" as any });
    for (let i = 0; i < this.items.length - 1; i++) {
      const a = this.items[i]!;
      const b = this.items[i + 1]!;
      const aw = (a.view as any).layout?.width ?? LevelProgressScreenView.itemWidth;
      const ah = (a.view as any).layout?.height ?? LevelProgressScreenView.itemHeight;
      const bh = (b.view as any).layout?.height ?? LevelProgressScreenView.itemHeight;
      const cx = a.view.x + aw / 2;
      const ay = a.view.y + ah - pad;
      const by = b.view.y + pad;
      this.connectors.moveTo(cx, ay);
      this.connectors.lineTo(cx, by);
    }
  }

  private computeWindow(): { levels: number[]; currentIndex: number } {
    const count = this.visibleCount;
    const mid = Math.floor(count / 2);
    const desiredIndex = Math.min(mid, Math.max(0, this.currentLevel - 1));
    const start = Math.max(1, this.currentLevel - desiredIndex);
    const levelsAsc = Array.from({ length: count }, (_, i) => start + i);
    const currentIndexAsc = this.currentLevel - start;

    // Display in reverse order (highest at the top).
    const levels = levelsAsc.slice().reverse();
    const currentIndex = Math.max(0, Math.min(count - 1, (count - 1) - currentIndexAsc));
    return { levels, currentIndex };
  }

  private getCurrentIndex(): number {
    return this.computeWindow().currentIndex;
  }

  public override destroy(): void {
    for (const c of this.cleanup) c();
    this.cleanup.length = 0;
    this.items.length = 0;
    super.destroy();
  }
}

