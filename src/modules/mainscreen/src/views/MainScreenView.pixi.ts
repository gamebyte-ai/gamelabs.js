import { ScreenView } from "../../../../core/ui/ScreenView.pixi.js";
import { ButtonComponent } from "../../../uicomponents/src/views/ButtonComponent.pixi.js";
import { BackgroundComponent } from "../../../uicomponents/src/views/BackgroundComponent.pixi.js";
import {
  VerticalLayoutComponent,
  parseVerticalLayoutComponentPreset,
} from "../../../uicomponents/src/views/VerticalLayoutComponent.pixi.js";
import { HorizontalLayoutComponent } from "../../../uicomponents/src/views/HorizontalLayoutComponent.pixi.js";
import { ImageComponent } from "../../../uicomponents/src/views/ImageComponent.pixi.js";
import {
  UIComponentsStyleIds,
  type BackgroundComponentStyle,
  type ButtonComponentStyle,
} from "../../../uicomponents/src/UIComponentsStyleTypes.js";
import type { IMainScreenView } from "./IMainScreenView.js";
import { MainScreenAssetIds } from "../MainScreenAssetIds.js";

/**
 * Screens main screen (Pixi).
 *
 * Minimal HUD: full-screen background + centered play & settings buttons.
 */
export class MainScreenView extends ScreenView implements IMainScreenView {
  private static readonly logoWidth = 520;
  private static readonly logoHeight = 140;

  private buttonsCol!: VerticalLayoutComponent;

  private readonly logoBar = new HorizontalLayoutComponent({
    position: "absolute",
    left: 0,
    top: 56,
    width: "100%",
    height: MainScreenView.logoHeight,
    justifyContent: "center",
    alignItems: "center",
  });

  private readonly logo = new ImageComponent({
    width: MainScreenView.logoWidth,
    height: MainScreenView.logoHeight,
    textureId: MainScreenAssetIds.Logo,
    fit: "contain",
    padding: 0.96,
  });

  private background!: BackgroundComponent;
  private playButton!: ButtonComponent;
  private settingsButton!: ButtonComponent;

  public override postInitialize(): void {
    super.postInitialize();

    // Background — override the framework default's bg slot to point at
    // the screen's own backdrop texture. Apps re-theme via
    // `styleManager.modify(UIComponentsStyleIds.Background, …)`.
    const backgroundStyle = this.styleManager.resolve<BackgroundComponentStyle>(UIComponentsStyleIds.Background, {
      bg: { textureId: MainScreenAssetIds.Background },
    });
    this.background = new BackgroundComponent(this.assetLoader, backgroundStyle);

    // Play button — full-screen-style image button with no label. Each
    // pointer state shares the same texture id; runtime tinting flows
    // through `Container.tint` if apps want hover/pressed feedback.
    const playButtonStyle = this.styleManager.resolve<ButtonComponentStyle>(UIComponentsStyleIds.Button, {
      idle: { textureId: MainScreenAssetIds.PlayButtonBg },
      hover: { textureId: MainScreenAssetIds.PlayButtonBg },
      pressed: { textureId: MainScreenAssetIds.PlayButtonBg },
      disabled: { textureId: MainScreenAssetIds.PlayButtonBg },
    });
    this.playButton = new ButtonComponent(this.assetLoader, playButtonStyle, { width: 400, height: 200 });

    // Settings button — labelled, all states share the same texture.
    const settingsButtonStyle = this.styleManager.resolve<ButtonComponentStyle>(UIComponentsStyleIds.Button, {
      idle: { textureId: MainScreenAssetIds.SettingsButtonBg },
      hover: { textureId: MainScreenAssetIds.SettingsButtonBg },
      pressed: { textureId: MainScreenAssetIds.SettingsButtonBg },
      disabled: { textureId: MainScreenAssetIds.SettingsButtonBg },
      label: { fontSize: 24, fontWeight: "800", letterSpacing: 1.5 },
    });
    this.settingsButton = new ButtonComponent(this.assetLoader, settingsButtonStyle, {
      width: 400,
      height: 100,
      label: "SETTINGS",
    });

    const buttonsColPresetJson = this.assetLoader.getAsset<string>(MainScreenAssetIds.ButtonsColPreset) ?? "{}";
    this.buttonsCol = new VerticalLayoutComponent(parseVerticalLayoutComponentPreset(buttonsColPresetJson));

    this.addChild(this.background);

    // Logo bar: absolute positioned so it doesn't affect centered button layout.
    this.logo.resolveAssets(this.assetLoader);
    this.logoBar.addChild(this.logo);
    this.addChild(this.logoBar);

    // Centered buttons column (layout centers it).
    this.addChild(this.buttonsCol);
    this.buttonsCol.addChild(this.playButton);
    this.buttonsCol.addChild(this.settingsButton);
  }

  public override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    // Full-screen container that centers its children.
    this.layout = { width: w, height: h, justifyContent: "center", alignItems: "center" };
  }

  onPlayClick(cb: () => void): () => void {
    return this.playButton.onPress(() => {
      if (this.isInTransition) return;
      cb();
    });
  }

  onSettingsClick(cb: () => void): () => void {
    return this.settingsButton.onPress(() => {
      if (this.isInTransition) return;
      cb();
    });
  }
}
