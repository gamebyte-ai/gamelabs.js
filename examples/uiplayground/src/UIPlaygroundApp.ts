import { AssetTypes, GamelabsApp, LogTypes, UIComponentsBinding, UIEvents } from "@gamebyte/gamelabsjs";
import { UIPlaygroundAssetIds } from "./UIPlaygroundAssetIds.js";
import { UIPlaygroundConfig } from "./UIPlaygroundConfig.js";
import { UIPlaygroundUIIds } from "./UIPlaygroundUIIds.js";
import { ButtonDemoViewController } from "./controllers/ButtonDemoViewController.js";
import { DropdownDemoViewController } from "./controllers/DropdownDemoViewController.js";
import { GridLayoutDemoViewController } from "./controllers/GridLayoutDemoViewController.js";
import { ListDemoViewController } from "./controllers/ListDemoViewController.js";
import { PlaygroundShellViewController } from "./controllers/PlaygroundShellViewController.js";
import { RadioButtonDemoViewController } from "./controllers/RadioButtonDemoViewController.js";
import { RadioButtonGroupDemoViewController } from "./controllers/RadioButtonGroupDemoViewController.js";
import { ScrollViewDemoViewController } from "./controllers/ScrollViewDemoViewController.js";
import { SliderDemoViewController } from "./controllers/SliderDemoViewController.js";
import { ToggleDemoViewController } from "./controllers/ToggleDemoViewController.js";
import { ControlsManager } from "./utilities/ControlsManager.js";
import { IControlsManager } from "./utilities/IControlsManager.js";
import { ButtonDemoView } from "./views/ButtonDemoView.pixi.js";
import { DropdownDemoView } from "./views/DropdownDemoView.pixi.js";
import { GridLayoutDemoView } from "./views/GridLayoutDemoView.pixi.js";
import { ListDemoView } from "./views/ListDemoView.pixi.js";
import { PlaygroundShellView } from "./views/PlaygroundShellView.pixi.js";
import { RadioButtonDemoView } from "./views/RadioButtonDemoView.pixi.js";
import { RadioButtonGroupDemoView } from "./views/RadioButtonGroupDemoView.pixi.js";
import { ScrollViewDemoView } from "./views/ScrollViewDemoView.pixi.js";
import { SliderDemoView } from "./views/SliderDemoView.pixi.js";
import { ToggleDemoView } from "./views/ToggleDemoView.pixi.js";

/**
 * UI Components Playground.
 *
 * Single-screen Pixi shell with four regions — sidebar / stage /
 * controls / event log. Every framework `uicomponents` member gets a
 * full View + ViewController pair so its props can be tweaked live.
 *
 * To add a new component playground:
 *   1. Create the View + Controller pair under `views/<X>DemoView.pixi.ts`
 *      and `controllers/<X>DemoViewController.ts`.
 *   2. Register them with the framework's view factory in
 *      {@link configureViews} (this file).
 *   3. Add a row to `DEMO_REGISTRY` in `constants/DemoRegistry.ts`.
 *   4. Map the id → View class inside
 *      `PlaygroundShellView._DEMO_VIEW_BY_ID`.
 *
 * No world content (the framework still creates a 3D World by default
 * but this example never adds anything to it). All visuals live on
 * the HUD.
 */
export class UIPlaygroundApp extends GamelabsApp {
  private readonly _config = new UIPlaygroundConfig();
  private readonly _controlsManager = new ControlsManager();
  private readonly _uiComponentsBinding = new UIComponentsBinding();

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
  }

  protected override registerModules(): void {
    // Ships the framework default button skin (idle/hover/pressed/disabled)
    // so the Button demo's "default" button has art without us providing any.
    this.addModule(this._uiComponentsBinding);
  }

  protected override loadAssets(): void {
    // Custom skin used by the second button in the Button demo. Demonstrates
    // the override flow: the skin's asset ids point at example-owned PNGs
    // registered here, distinct from the default-skin ids shipped by
    // UIComponentsBinding.
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomButtonIdle,
      new URL("../assets/button/idle.png", import.meta.url).href,
    );
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomButtonHover,
      new URL("../assets/button/hover.png", import.meta.url).href,
    );
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomButtonPressed,
      new URL("../assets/button/pressed.png", import.meta.url).href,
    );
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomButtonDisabled,
      new URL("../assets/button/disabled.png", import.meta.url).href,
    );

    // Custom slider skin for the SliderDemo's RGB section. Neutral white
    // textures so per-channel `.tint` (R/G/B) multiplies cleanly.
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomSliderTrack,
      new URL("../assets/slider/track.png", import.meta.url).href,
    );
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomSliderFill,
      new URL("../assets/slider/fill.png", import.meta.url).href,
    );
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomSliderThumb,
      new URL("../assets/slider/thumb.png", import.meta.url).href,
    );

    // Custom radio skin for the RadioButtonDemo's "custom" example.
    // Two indicator textures with a different palette than the default
    // skin so the side-by-side comparison is visually distinct.
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomRadioUnselected,
      new URL("../assets/radio/unselected.png", import.meta.url).href,
    );
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomRadioSelected,
      new URL("../assets/radio/selected.png", import.meta.url).href,
    );

    // Custom toggle skin for the ToggleDemo's "custom" example.
    // Rectangle track + square thumb in a violet / amber palette so it
    // visibly contrasts with the default rounded-pill skin.
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomToggleTrackOn,
      new URL("../assets/toggle/track-on.png", import.meta.url).href,
    );
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomToggleTrackOff,
      new URL("../assets/toggle/track-off.png", import.meta.url).href,
    );
    this.assetManager.load(
      AssetTypes.HudTexture,
      UIPlaygroundAssetIds.CustomToggleThumb,
      new URL("../assets/toggle/thumb.png", import.meta.url).href,
    );
  }

  protected override configureDI(): void {
    this.diContainer.bindInstance(UIPlaygroundConfig, this._config);
    this.viewDiContainer.bindInstance(UIPlaygroundConfig, this._config);

    // ControlsManager is the bridge between demo controllers and the
    // shell view's controls/log regions. Demos resolve `IControlsManager`
    // (the readonly demo-facing interface); the shell controller resolves
    // `ControlsManager` (the class, with `bindShell` / `unbindShell`).
    this.diContainer.bindInstance(ControlsManager, this._controlsManager, [IControlsManager]);
  }

  protected override configureViews(): void {
    this.viewFactory.registerScreen(
      UIPlaygroundUIIds.PlaygroundShell,
      PlaygroundShellView,
      PlaygroundShellViewController,
    );
    // Demo View ↔ Controller pairs. `viewFactory.createView()` (called
    // from inside the shell view's `mountDemo`) walks these registrations
    // to build + initialise the controller automatically.
    this.viewFactory.register(ButtonDemoView, ButtonDemoViewController);
    this.viewFactory.register(SliderDemoView, SliderDemoViewController);
    this.viewFactory.register(ToggleDemoView, ToggleDemoViewController);
    this.viewFactory.register(GridLayoutDemoView, GridLayoutDemoViewController);
    this.viewFactory.register(DropdownDemoView, DropdownDemoViewController);
    this.viewFactory.register(RadioButtonDemoView, RadioButtonDemoViewController);
    this.viewFactory.register(RadioButtonGroupDemoView, RadioButtonGroupDemoViewController);
    this.viewFactory.register(ScrollViewDemoView, ScrollViewDemoViewController);
    this.viewFactory.register(ListDemoView, ListDemoViewController);
  }

  protected override postInitialize(): void {
    if (!this.hud) {
      this.logger.log("HUD is not initialized", LogTypes.Error);
      throw new Error("HUD is not initialized");
    }
    this.diContainer
      .getInstance(UIEvents)
      .createScreen(UIPlaygroundUIIds.PlaygroundShell, this._config.transitions.screenEnter);
  }
}
