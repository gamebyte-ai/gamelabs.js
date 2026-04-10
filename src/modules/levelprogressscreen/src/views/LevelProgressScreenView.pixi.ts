import * as PIXI from "pixi.js";
import { ScreenView } from "../../../../core/ui/ScreenView.pixi.js";
import { ButtonComponent, parseButtonComponentPreset } from "../../../uicomponents/src/ButtonComponent.pixi.js";
import {
  BackgroundComponent,
  parseBackgroundComponentPreset,
} from "../../../uicomponents/src/BackgroundComponent.pixi.js";
import {
  VerticalLayoutComponent,
  parseVerticalLayoutComponentPreset,
} from "../../../uicomponents/src/VerticalLayoutComponent.pixi.js";
import type { ILevelProgressScreenView } from "./ILevelProgressScreenView.js";
import { LevelProgressScreenAssetIds } from "../LevelProgressScreenAssetIds.js";

type LevelItemRefs = {
  button: ButtonComponent;
  text: PIXI.Text;
};

/**
 * Screens level progress screen (Pixi).
 *
 * Shows a vertical list of level numbers (previous/current/next),
 * with the current one being clickable.
 */
export class LevelProgressScreenView extends ScreenView implements ILevelProgressScreenView {
  private static readonly defaultVisibleCount = 5;

  private static readonly itemWidth = 180;
  private static readonly itemHeight = 84;
  private static readonly itemActiveExtraWidth = 22;
  private static readonly itemActiveExtraHeight = 10;
  private static readonly itemActiveTint = 0x22c55e;
  private static readonly backButtonAspect = 2.5;

  private background!: BackgroundComponent;
  private backButton!: ButtonComponent;

  private levelsCol!: VerticalLayoutComponent;

  private readonly connectors = new PIXI.Container();
  private connectorSprites: PIXI.Sprite[] = [];

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
    this.layout = {
      width: 1,
      height: 1,
      justifyContent: "center",
      alignItems: "center",
    };

    // Background component.
    const bgPresetJson = this.assetLoader.getAsset<string>(LevelProgressScreenAssetIds.BackgroundPreset) ?? "{}";
    this.background = new BackgroundComponent(parseBackgroundComponentPreset(bgPresetJson));
    this.background.resolveAssets(this.assetLoader);
    this.addChild(this.background);

    // Top-right back button.
    const backButtonPresetJson =
      this.assetLoader.getAsset<string>(LevelProgressScreenAssetIds.BackButtonPreset) ?? "{}";
    this.backButton = new ButtonComponent(parseButtonComponentPreset(backButtonPresetJson));
    this.backButton.resolveAssets(this.assetLoader);
    const initialWidth = this.layout?.style?.width;
    this.applyBackButtonLayout(typeof initialWidth === "number" ? initialWidth : 1);
    this.addChild(this.backButton);
    this.backButton.onPress(() => {
      if (this.isInTransition) return;
      this.emitBackClick();
    });

    // Connectors are a sibling of levelsCol, drawn on top in screen space.
    this.addChild(this.connectors);

    // Levels column.
    const levelsColPresetJson = this.assetLoader.getAsset<string>(LevelProgressScreenAssetIds.LevelsColPreset) ?? "{}";
    this.levelsCol = new VerticalLayoutComponent(parseVerticalLayoutComponentPreset(levelsColPresetJson));
    this.addChild(this.levelsCol);

    // Redraw connectors after the screen's layout is computed (all descendants positioned).
    this.on("layout", () => {
      this.redrawConnectors();
    });

    this.rebuildItems();
    this.applyLevels();
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.layout = { width: w, height: h };
    this.applyBackButtonLayout(w);
  }

  private applyBackButtonLayout(screenWidth: number): void {
    const w = Math.max(1, Math.floor(screenWidth));
    const targetW = Math.max(220, Math.min(340, Math.round(w * 0.22)));
    const targetH = Math.max(64, Math.round(targetW / LevelProgressScreenView.backButtonAspect));

    this.backButton.layout = {
      position: "absolute",
      top: 16,
      right: 16,
      width: targetW,
      height: targetH,
      justifyContent: "center",
      alignItems: "center",
    };
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

  private rebuildItems(): void {
    for (const it of this.items) {
      it.button.removeFromParent();
    }
    this.items = [];

    for (let i = 0; i < this.visibleCount; i++) {
      const item = this.createLevelItem(i);
      this.items.push(item);
      this.levelsCol.addChild(item.button);
    }
  }

  private createLevelItem(index: number): LevelItemRefs {
    const isActive = index === this.getCurrentIndex();

    const button = new ButtonComponent({
      width: LevelProgressScreenView.itemWidth,
      height: LevelProgressScreenView.itemHeight,
      radius: 18,
      fillColor: isActive ? 0x052e16 : 0x0b1220,
      fillAlpha: isActive ? 0.78 : 0.72,
      strokeColor: isActive ? 0x22c55e : 0x475569,
      strokeWidth: 2,
    });

    const text = new PIXI.Text({
      text: "",
      style: {
        fill: 0xe8eef6,
        fontSize: 24,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontWeight: "800",
      },
    });
    text.anchor.set(0.5, 0.5);
    text.layout = {};
    button.addChild(text);

    button.onPress(() => {
      if (this.isInTransition) return;
      if (index !== this.getCurrentIndex()) return;
      this.emitCurrentLevelClick();
    });

    return { button, text };
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
        fill: i === currentIndex ? 0xffffff : 0xdbe7ff,
      } as any;

      it.button.alpha = i === currentIndex ? 1 : 0.85;
    }

    this.applyLevelItemBgTextures();
    this.redrawConnectors();
  }

  private applyLevelItemBgTextures(): void {
    if (!this.items.length) return;

    const { currentIndex } = this.computeWindow();
    const normal = this.assetLoader.getAsset<PIXI.Texture>(LevelProgressScreenAssetIds.LevelItemBg);

    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]!;
      const isActive = i === currentIndex;

      if (normal) it.button.setTexture(normal);
      it.button.tint = isActive ? LevelProgressScreenView.itemActiveTint : 0xffffff;

      const baseW = LevelProgressScreenView.itemWidth;
      const baseH = LevelProgressScreenView.itemHeight;
      const w = isActive ? baseW + LevelProgressScreenView.itemActiveExtraWidth : baseW;
      const h = isActive ? baseH + LevelProgressScreenView.itemActiveExtraHeight : baseH;
      it.button.layout = { width: w, height: h };
    }
  }

  private redrawConnectors(): void {
    // Remove previous sprites.
    for (const s of this.connectorSprites) s.destroy();
    this.connectorSprites = [];

    if (this.items.length < 2) return;

    const texture = this.assetLoader.getAsset<PIXI.Texture>(LevelProgressScreenAssetIds.Connector);
    if (!texture) return;

    const { currentIndex } = this.computeWindow();

    const getItemDims = (i: number): { w: number; h: number } => {
      const isActive = i === currentIndex;
      const w = isActive
        ? LevelProgressScreenView.itemWidth + LevelProgressScreenView.itemActiveExtraWidth
        : LevelProgressScreenView.itemWidth;
      const h = isActive
        ? LevelProgressScreenView.itemHeight + LevelProgressScreenView.itemActiveExtraHeight
        : LevelProgressScreenView.itemHeight;
      return { w, h };
    };

    // Convert each button's top-left (its local 0,0) into connectors' local space.
    const topLeftInConnectors = (button: PIXI.Container): PIXI.Point => {
      return this.connectors.toLocal(new PIXI.Point(0, 0), button);
    };

    const spriteWidth = 8;
    for (let i = 0; i < this.items.length - 1; i++) {
      const a = this.items[i]!;
      const b = this.items[i + 1]!;
      const { w: aw, h: ah } = getItemDims(i);
      const { h: bh } = getItemDims(i + 1);
      const aPos = topLeftInConnectors(a.button);
      const bPos = topLeftInConnectors(b.button);
      const cx = aPos.x + aw / 2;
      const ay = aPos.y + ah / 2;
      const by = bPos.y + bh / 2;
      const length = by - ay;
      if (length <= 0) continue;

      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0);
      sprite.width = spriteWidth;
      sprite.height = length;
      sprite.position.set(cx, ay);
      sprite.alpha = 0.6;
      this.connectors.addChild(sprite);
      this.connectorSprites.push(sprite);
    }
  }

  private computeWindow(): { levels: number[]; currentIndex: number } {
    const count = this.visibleCount;
    const mid = Math.floor(count / 2);
    const desiredIndex = Math.min(mid, Math.max(0, this.currentLevel - 1));
    const start = Math.max(1, this.currentLevel - desiredIndex);
    const levelsAsc = Array.from({ length: count }, (_, i) => start + i);
    const currentIndexAsc = this.currentLevel - start;

    const levels = levelsAsc.slice().reverse();
    const currentIndex = Math.max(0, Math.min(count - 1, count - 1 - currentIndexAsc));
    return { levels, currentIndex };
  }

  private getCurrentIndex(): number {
    return this.computeWindow().currentIndex;
  }
}
