import * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import { ScreenView } from "../../../../core/ui/ScreenView.pixi.js";
import type { ScreenTransition } from "../../../../core/ui/ScreenTransition.js";
import type { IMainScreenView } from "./IMainScreenView.js";
import { MainScreenAssets } from "../MainScreenAssets.js";

/**
 * Example02 main screen (Pixi).
 *
 * Minimal HUD: full-screen background + centered play button.
 */
export class MainScreenView extends ScreenView implements IMainScreenView {
  private static readonly buttonWidth = 400;
  private static readonly buttonHeight = 200;
  private static readonly settingsButtonWidth = 400;
  private static readonly settingsButtonHeight = 100;
  private static readonly buttonsGap = 18;
  private static readonly logoWidth = 360;
  private static readonly logoHeight = 84;

  private readonly bgImage = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly bg = new PIXI.Graphics();

  private readonly cleanup: Array<() => void> = [];

  private playButtonBgTargetWidth = MainScreenView.buttonWidth;
  private playButtonBgTargetHeight = MainScreenView.buttonHeight;

  private readonly buttonsCol = new PIXI.Container({
    layout: {
      width: MainScreenView.buttonWidth,
      flexDirection: "column",
      gap: MainScreenView.buttonsGap,
      alignItems: "center"
    }
  });

  private readonly logoBar = new PIXI.Container();
  private readonly logo = new PIXI.Container();
  private readonly logoBg = new PIXI.Graphics();
  private readonly title = new PIXI.Text({
    text: "Example 02",
    style: {
      fill: 0xe8eef6,
      fontSize: 28,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontWeight: "700",
      letterSpacing: 0.5
    }
  });

  private readonly playButtonBgPlaceholder = new PIXI.Graphics();
  private readonly playButtonBg = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly playButtonView = this.createButtonView();
  private readonly playButton = new Button(this.playButtonView);

  private readonly settingsButtonBg = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly settingsLabel = new PIXI.Text({
    text: "SETTINGS",
    style: {
      fill: 0xffffff,
      fontSize: 24,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontWeight: "800",
      letterSpacing: 1.5
    }
  });
  private readonly settingsButtonView = this.createSettingsButtonView();
  private readonly settingsButton = new Button(this.settingsButtonView);

  public postInitialize(): void {
    // Full-screen layout container that centers its children.
    (this as any).layout = {
      width: 1,
      height: 1,
      justifyContent: "center",
      alignItems: "center"
    };

    // Background should cover the whole screen.
    (this.bgImage as any).layout = { position: "absolute", left: 0, top: 0 };
    this.bgImage.visible = false;
    this.addChild(this.bgImage);
    (this.bg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.addChild(this.bg);

    // Redraw background whenever *this* container is laid out.
    // (Layout events are emitted on the container, not reliably on Graphics children.)
    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.redrawBackground(w, h);
    };
    this.on("layout", onLayout);
    this.cleanup.push(() => this.off("layout", onLayout));

    // Logo bar: absolute positioned so it doesn't affect centered button layout.
    (this.logoBar as any).layout = {
      position: "absolute",
      left: 0,
      top: 56,
      width: "100%",
      height: MainScreenView.logoHeight,
      justifyContent: "center",
      alignItems: "center"
    };
    this.addChild(this.logoBar);

    // Logo panel with a subtle background and centered title text.
    (this.logo as any).layout = { width: MainScreenView.logoWidth, height: MainScreenView.logoHeight };
    (this.logoBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.logo.addChild(this.logoBg);

    this.title.anchor.set(0.5, 0.5);
    this.logo.addChild(this.title);

    const onLogoLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.logoBg.clear();
      this.logoBg.roundRect(0, 0, w, h, 18).fill({ color: 0x0b1220, alpha: 0.65 }).stroke({ color: 0x334155, width: 1 });
      this.title.position.set(w / 2, h / 2);
    };
    this.logo.on("layout", onLogoLayout);
    this.cleanup.push(() => this.logo.off("layout", onLogoLayout));

    this.logoBar.addChild(this.logo);

    // Centered buttons column (layout centers it).
    this.addChild(this.buttonsCol);

    // Play button with fixed size.
    (this.playButtonView as any).layout = {
      width: MainScreenView.buttonWidth,
      height: MainScreenView.buttonHeight
    };
    this.buttonsCol.addChild(this.playButtonView);

    // Settings button under play button.
    (this.settingsButtonView as any).layout = {
      width: MainScreenView.settingsButtonWidth,
      height: MainScreenView.settingsButtonHeight
    };
    this.buttonsCol.addChild(this.settingsButtonView);

    this.applyTexturesIfAvailable();
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    (this as any).layout = { width: w, height: h };
    this.redrawBackground(w, h);
  }

  onPlayClick(cb: () => void): () => void {
    const handler = () => cb();
    this.playButton.onPress.connect(handler);
    return () => this.playButton.onPress.disconnect(handler);
  }

  onSettingsClick(cb: () => void): () => void {
    const handler = () => cb();
    this.settingsButton.onPress.connect(handler);
    return () => this.settingsButton.onPress.disconnect(handler);
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

  private createButtonView(): PIXI.Container {
    const view = new PIXI.Container();

    // Placeholder (shown immediately) so the button has a stable visual size
    // even before the PNG has finished loading.
    (this.playButtonBgPlaceholder as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    view.addChild(this.playButtonBgPlaceholder);

    // Fill parent container via layout (we still set width/height on "layout" event for safety).
    (this.playButtonBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    // Keep it hidden until the real texture is loaded.
    this.playButtonBg.visible = false;
    view.addChild(this.playButtonBg);

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.playButtonBgTargetWidth = w;
      this.playButtonBgTargetHeight = h;
      this.redrawPlayButtonPlaceholder(w, h);
      this.applyPlayButtonBgSize();
    };
    view.on("layout", onLayout);
    this.cleanup.push(() => view.off("layout", onLayout));

    return view;
  }

  private createSettingsButtonView(): PIXI.Container {
    const view = new PIXI.Container();

    (this.settingsButtonBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.settingsButtonBg.visible = false;
    view.addChild(this.settingsButtonBg);

    this.settingsLabel.anchor.set(0.5, 0.5);
    view.addChild(this.settingsLabel);

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.settingsLabel.position.set(w / 2, h / 2);

      if (this.settingsButtonBg.texture !== PIXI.Texture.EMPTY) {
        this.settingsButtonBg.scale.set(1, 1);
        this.settingsButtonBg.width = w;
        this.settingsButtonBg.height = h;
      }
    };
    view.on("layout", onLayout);
    this.cleanup.push(() => view.off("layout", onLayout));

    return view;
  }

  private redrawPlayButtonPlaceholder(width: number, height: number): void {
    this.playButtonBgPlaceholder.clear();
    // Simple fallback that matches the old style closely.
    this.playButtonBgPlaceholder
      .roundRect(0, 0, width, height, 14)
      .fill({ color: 0x111827, alpha: 0.92 })
      .stroke({ color: 0x334155, width: 1 });
  }

  private applyPlayButtonBgSize(): void {
    if (this.playButtonBg.texture === PIXI.Texture.EMPTY) return;

    // Ensure the sprite matches the computed size (layout engines won't always set sprite dimensions).
    // Reset scale first to avoid compounding from any previous sizing.
    this.playButtonBg.scale.set(1, 1);
    this.playButtonBg.width = this.playButtonBgTargetWidth;
    this.playButtonBg.height = this.playButtonBgTargetHeight;
  }

  private applyTexturesIfAvailable(): void {
    const playButtonBg = this.assetLoader.getAsset<PIXI.Texture>(MainScreenAssets.PlayButtonBg.id);
    if (playButtonBg && this.playButtonBg.texture === PIXI.Texture.EMPTY) {
      this.playButtonBg.texture = playButtonBg;
      this.playButtonBg.visible = true;
      this.playButtonBgPlaceholder.visible = false;
      this.applyPlayButtonBgSize();
    }

    const settingsButtonBg = this.assetLoader.getAsset<PIXI.Texture>(MainScreenAssets.SettingsButtonBg.id);
    if (settingsButtonBg && this.settingsButtonBg.texture === PIXI.Texture.EMPTY) {
      this.settingsButtonBg.texture = settingsButtonBg;
      this.settingsButtonBg.visible = true;
    }

    const background = this.assetLoader.getAsset<PIXI.Texture>(MainScreenAssets.Background.id);
    if (background && this.bgImage.texture === PIXI.Texture.EMPTY) {
      this.bgImage.texture = background;
      const layout = (this as any).layout;
      if (layout?.width && layout?.height) this.redrawBackground(layout.width, layout.height);
    }
  }

  public override destroy(): void {
    for (const c of this.cleanup) c();
    this.cleanup.length = 0;
    super.destroy();
  }
}

