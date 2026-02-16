import * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import { ScreenView, type ScreenTransition } from "gamelabsjs";
import type { IMainScreen } from "./IMainScreen.js";
import playButtonBgUrl from "../../assets/play_button_bg.png";

/**
 * Example02 main screen (Pixi).
 *
 * Minimal HUD: full-screen background + centered play button.
 */
export class MainScreen extends ScreenView implements IMainScreen {
  private static readonly buttonWidth = 400;
  private static readonly buttonHeight = 200;
  private static readonly logoWidth = 360;
  private static readonly logoHeight = 84;

  private static playButtonBgTexture: PIXI.Texture | null = null;

  private readonly bg = new PIXI.Graphics();

  private readonly cleanup: Array<() => void> = [];

  private playButtonBgTargetWidth = MainScreen.buttonWidth;
  private playButtonBgTargetHeight = MainScreen.buttonHeight;

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

  constructor() {
    super();

    // Full-screen layout container that centers its children.
    (this as any).layout = {
      width: 1,
      height: 1,
      justifyContent: "center",
      alignItems: "center"
    };

    // Background should cover the whole screen.
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
      height: MainScreen.logoHeight,
      justifyContent: "center",
      alignItems: "center"
    };
    this.addChild(this.logoBar);

    // Logo panel with a subtle background and centered title text.
    (this.logo as any).layout = { width: MainScreen.logoWidth, height: MainScreen.logoHeight };
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

    // Centered play button with fixed size (parent layout centers it).
    (this.playButtonView as any).layout = {
      width: MainScreen.buttonWidth,
      height: MainScreen.buttonHeight
    };
    this.addChild(this.playButtonView);

    // Kick off asset load early; texture is applied once ready.
    void this.ensurePlayButtonBgLoaded();
  }

  override async onEnter(_transition: ScreenTransition): Promise<void> {
    await this.ensurePlayButtonBgLoaded();
  }

  override onExit(_transition: ScreenTransition): void | Promise<void> {
    // Intentionally empty (template).
  }

  resize(width: number, height: number): void {
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

  private redrawBackground(width: number, height: number): void {
    this.bg.clear();
    // Slightly translucent so the 3D world remains visible underneath.
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

  private async ensurePlayButtonBgLoaded(): Promise<void> {
    if (MainScreen.playButtonBgTexture) {
      this.playButtonBg.texture = MainScreen.playButtonBgTexture;
      this.playButtonBg.visible = true;
      this.playButtonBgPlaceholder.visible = false;
      this.applyPlayButtonBgSize();
      return;
    }

    // Ensure the asset is loaded into Pixi's cache before using it.
    const tex = (await PIXI.Assets.load(playButtonBgUrl)) as PIXI.Texture;
    MainScreen.playButtonBgTexture = tex;
    this.playButtonBg.texture = tex;
    this.playButtonBg.visible = true;
    this.playButtonBgPlaceholder.visible = false;
    this.applyPlayButtonBgSize();
  }

  override destroy(): void {
    // Views are expected to own controller lifetime.
    this.controller?.destroy();
    this.controller = null;

    // Keep it consistent with other Pixi views: no recursive Pixi destroy.
    for (const c of this.cleanup) c();
    this.cleanup.length = 0;
    this.removeAllListeners();
    this.removeFromParent();
  }
}

