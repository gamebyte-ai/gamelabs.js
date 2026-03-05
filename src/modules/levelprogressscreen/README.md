# LevelProgressScreen Module

Level selection / progress screen that shows a vertical list of level numbers with the current level highlighted and clickable. Includes a back button to return to the previous screen.

## Purpose

- Provides a ready-to-use level progress HUD screen built with PixiJS.
- Registers `LevelProgressScreenView` and `LevelProgressScreenController` with the `ViewFactory`.
- Exposes `LevelProgressScreenEvents` for app-level wiring (e.g. level click → start game, back click → go to main menu).
- Supports a custom `ILevelProgressScreenModel` for visible count and current level.

## Usage

### Basic wiring

```ts
import { GamelabsApp } from "gamelabsjs";
import {
  LevelProgressScreenBinding,
  LevelProgressScreenView,
  LevelProgressScreenEvents,
  ILevelProgressScreenModel
} from "gamelabsjs";

// Implement the model contract (visible count + current level).
class MyLevelModel implements ILevelProgressScreenModel {
  readonly visibleItemCount = 5;
  readonly currentLevel = 1;
}

export class MyApp extends GamelabsApp {
  private readonly levelBinding = new LevelProgressScreenBinding(new MyLevelModel());

  protected override registerModules(): void {
    this.addModule(this.levelBinding);
  }

  protected override postInitialize(): void {
    const events = this.diContainer.getInstance(LevelProgressScreenEvents);
    events.onCurrentLevelClick(() => this.startLevel());
    events.onBackClick(() => this.showMainMenu());

    this.viewFactory.createScreen(LevelProgressScreenView, null, { type: "slide_in_left", durationMs: 300 });
  }
}
```

### With custom model

```ts
const model = { visibleItemCount: 7, currentLevel: 3 };
const binding = new LevelProgressScreenBinding(model);
this.addModule(binding);
```

The controller reads `visibleItemCount` and `currentLevel` from the model and passes them to the view via `setVisibleCount` and `setCurrentLevel`. A model is required; provide one that implements `ILevelProgressScreenModel`.

### Asset overrides

```ts
this.levelBinding.assetRequestList.overrideRequestUrl(LevelProgressScreenAssetIds.Background, myBgUrl);
this.levelBinding.assetRequestList.overrideRequestUrl(LevelProgressScreenAssetIds.BackButtonBg, myBackBtnUrl);
this.addModule(this.levelBinding);
```

### Events

- `LevelProgressScreenEvents.onCurrentLevelClick(cb)` / `emitCurrentLevelClick()` — current level item tapped.
- `LevelProgressScreenEvents.onBackClick(cb)` / `emitBackClick()` — back button tapped.

## What can be overridden

| Area | How |
|------|-----|
| **View** | Extend `LevelProgressScreenView`, implement `ILevelProgressScreenView`. Register your custom view in a module binding that overrides `configureViews`. |
| **Model** | Implement `ILevelProgressScreenModel` and pass to `LevelProgressScreenBinding(model)`. The model drives `visibleItemCount` and `currentLevel`. |
| **Controller** | Use a different controller by registering a custom View/Controller pair in `configureViews`. |
| **Events** | Replace `LevelProgressScreenEvents` by binding your own instance in DI, or extend the binding and override `configureDI`. |
| **Assets** | Use `assetRequestList.overrideRequestUrl(id, url)` for any `LevelProgressScreenAssetIds` before `addModule()`. |
| **Layout / item count** | Subclass `LevelProgressScreenView`; you can also pass `{ visibleCount?, currentLevel? }` to the constructor for initial values (overridden by model when present). |
| **Visual styling** | Subclass and override layout constants, colors, or layout logic in `postInitialize` / `onResize`. |

## Exports

- `LevelProgressScreenView` — Pixi screen view.
- `LevelProgressScreenController` — Controller for the level progress screen.
- `LevelProgressScreenEvents` — Event emitter for level/back clicks.
- `LevelProgressScreenBinding` — Module binding (DI + view registration + asset requests).
- `ILevelProgressScreenModel` — Model contract + DI token.
- `LevelProgressScreenAssetIds` — Asset ID enum for overrides.
