import { ScreenView } from "../../../../core/ui/ScreenView.pixi.js";
import { ButtonComponent, parseButtonComponentPreset } from "../../../uicomponents/src/views/ButtonComponent.pixi.js";
import { BackgroundComponent, parseBackgroundComponentPreset } from "../../../uicomponents/src/views/BackgroundComponent.pixi.js";
import {
  VerticalLayoutComponent,
  parseVerticalLayoutComponentPreset,
} from "../../../uicomponents/src/views/VerticalLayoutComponent.pixi.js";
import { HorizontalLayoutComponent } from "../../../uicomponents/src/views/HorizontalLayoutComponent.pixi.js";
import { ImageComponent } from "../../../uicomponents/src/views/ImageComponent.pixi.js";
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

  public postInitialize(): void {
    // Create components from presets stored in asset manager.
    const bgPresetJson = this.assetLoader.getAsset<string>(MainScreenAssetIds.BackgroundPreset) ?? "{}";
    this.background = new BackgroundComponent(parseBackgroundComponentPreset(bgPresetJson));
    this.background.resolveAssets(this.assetLoader);

    const playPresetJson = this.assetLoader.getAsset<string>(MainScreenAssetIds.PlayButtonPreset) ?? "{}";
    this.playButton = new ButtonComponent(parseButtonComponentPreset(playPresetJson));
    this.playButton.resolveAssets(this.assetLoader);

    const settingsPresetJson = this.assetLoader.getAsset<string>(MainScreenAssetIds.SettingsButtonPreset) ?? "{}";
    this.settingsButton = new ButtonComponent(parseButtonComponentPreset(settingsPresetJson));
    this.settingsButton.resolveAssets(this.assetLoader);

    const buttonsColPresetJson = this.assetLoader.getAsset<string>(MainScreenAssetIds.ButtonsColPreset) ?? "{}";
    this.buttonsCol = new VerticalLayoutComponent(parseVerticalLayoutComponentPreset(buttonsColPresetJson));

    // Full-screen layout container that centers its children.
    this.layout = {
      width: 1,
      height: 1,
      justifyContent: "center",
      alignItems: "center",
    };

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

  public override onResize(width: number, height: number, _dpr: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.layout = { width: w, height: h };
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
