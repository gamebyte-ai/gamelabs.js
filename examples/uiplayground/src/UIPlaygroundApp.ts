import { GamelabsApp, LogTypes, UIEvents } from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "./UIPlaygroundConfig.js";
import { UIPlaygroundUIIds } from "./UIPlaygroundUIIds.js";
import { ButtonDemoViewController } from "./controllers/ButtonDemoViewController.js";
import { DropdownDemoViewController } from "./controllers/DropdownDemoViewController.js";
import { GridLayoutDemoViewController } from "./controllers/GridLayoutDemoViewController.js";
import { PlaygroundShellViewController } from "./controllers/PlaygroundShellViewController.js";
import { RadioButtonDemoViewController } from "./controllers/RadioButtonDemoViewController.js";
import { SliderDemoViewController } from "./controllers/SliderDemoViewController.js";
import { ToggleDemoViewController } from "./controllers/ToggleDemoViewController.js";
import { ControlsManager } from "./utilities/ControlsManager.js";
import { IControlsManager } from "./utilities/IControlsManager.js";
import { ButtonDemoView } from "./views/ButtonDemoView.pixi.js";
import { DropdownDemoView } from "./views/DropdownDemoView.pixi.js";
import { GridLayoutDemoView } from "./views/GridLayoutDemoView.pixi.js";
import { PlaygroundShellView } from "./views/PlaygroundShellView.pixi.js";
import { RadioButtonDemoView } from "./views/RadioButtonDemoView.pixi.js";
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

  public constructor(stageEl: HTMLElement) {
    super({ mount: stageEl });
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
