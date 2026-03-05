# MainScreen Module

Main menu / title screen with a logo, play button, and settings button. Intended for use as the first screen when starting a game or navigating back to the main menu.

## Purpose

- Provides a ready-to-use main menu HUD screen built with PixiJS.
- Registers `MainScreenView` and `MainScreenController` with the `ViewFactory`.
- Exposes `MainScreenEvents` for app-level wiring (e.g. play click → go to level select, settings click → open settings).

## Usage

### Basic wiring

```ts
import { GamelabsApp } from "gamelabsjs";
import { MainScreenBinding, MainScreenEvents, MainScreenView } from "gamelabsjs";

export class MyApp extends GamelabsApp {
  private readonly mainScreenBinding = new MainScreenBinding();

  protected override registerModules(): void {
    this.addModule(this.mainScreenBinding);
  }

  protected override postInitialize(): void {
    const mainEvents = this.diContainer.getInstance(MainScreenEvents);
    mainEvents.onPlayClick(() => this.showLevelSelect());
    mainEvents.onSettingsClick(() => this.openSettings());

    this.viewFactory.createScreen(MainScreenView, null, { type: "instant", durationMs: 0 });
  }
}
```

### Asset overrides

Replace default assets (background, logo, button backgrounds) before adding the module:

```ts
this.mainScreenBinding.assetRequestList.overrideRequestUrl(MainScreenAssetIds.Logo, myLogoUrl);
this.mainScreenBinding.assetRequestList.overrideRequestUrl(MainScreenAssetIds.Background, myBgUrl);
this.addModule(this.mainScreenBinding);
```

### Events

- `MainScreenEvents.onPlayClick(cb)` / `emitPlayClick()` — play button tapped.
- `MainScreenEvents.onSettingsClick(cb)` / `emitSettingsClick()` — settings button tapped.

Subscribe in `postInitialize()` and route to your navigation or settings logic.

## What can be overridden

| Area | How |
|------|-----|
| **View** | Extend `MainScreenView`, implement `IMainScreenView`. Register your custom view in a module binding that overrides `configureViews` to use your class instead of `MainScreenView`. |
| **Controller** | Use a different controller by registering a custom View/Controller pair in `configureViews` (your binding replaces `MainScreenView` + `MainScreenController`). |
| **Events** | `MainScreenEvents` is a concrete class. To replace it, bind your own instance in DI before the binding runs, or create a new binding that extends `MainScreenBinding` and overrides `configureDI`. |
| **Assets** | Use `assetRequestList.overrideRequestUrl(id, url)` for any `MainScreenAssetIds` before `addModule()`. |
| **Layout / styling** | Subclass `MainScreenView` and override `postInitialize()`, `onResize()`, or layout-related methods. Call `super` where needed. |
| **Button behavior** | Subclass `MainScreenView` and override `onPlayClick` / `onSettingsClick` wiring, or keep defaults and react via `MainScreenEvents` in the app. |

## Exports

- `MainScreenView` — Pixi screen view.
- `MainScreenController` — Controller for the main screen.
- `MainScreenEvents` — Event emitter for play/settings clicks.
- `MainScreenBinding` — Module binding (DI + view registration + asset requests).
- `MainScreenAssetIds` — Asset ID enum for overrides.
