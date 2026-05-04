# Settings Module

Typed game settings with boolean toggles and number sliders. Values are persisted in `localStorage` via `StorageService`, validated on write (clamp, step rounding), and broadcast via `SettingsEvents`. Includes a ready-to-use popup UI built from the framework's themed `uicomponents` (`ImageComponent`, `LabelComponent`, `ButtonComponent`, `ToggleComponent`, `SliderComponent`, `HorizontalLayoutComponent`).

## Usage

### Setup with custom fields

The binding registers `SettingsModel`, `SettingsEvents`, and `SettingsManager` in the DI container. Field definitions are added at runtime through the manager. Apps that want their own field set leave the constructor opt empty (default) and call `addField(...)` after `addModule`.

```ts
import { SettingsBinding, SettingsManager, SettingsBooleanField, SettingsNumberField } from "@gamebyte/gamelabsjs";

class MyApp extends GamelabsApp {
  private readonly _settings = new SettingsBinding();

  protected override registerModules(): void {
    this.addModule(this._settings);
  }

  protected override postInitialize(): void {
    const manager = this.diContainer.getInstance(SettingsManager);
    manager.addField(new SettingsBooleanField("haptics", "Haptics", true));
    manager.addField(new SettingsNumberField("difficulty", "Difficulty", 1, 1, 10, 1));
  }
}
```

### Setup with the framework's audio fields

For apps that just want a working audio settings popup, pass `{ audioFields: true }` to opt into the framework's standard set: `sfx` (boolean), `music` (boolean), `sfxVolume` (0–100), `musicVolume` (0–100). The binding also installs an **AudioService bridge** that wires those four field names to `AudioService` so toggling them in the popup actually mutes / attenuates audio out of the box — no per-app glue needed.

```ts
class MyApp extends GamelabsApp {
  private readonly _settings = new SettingsBinding({ audioFields: true });

  protected override registerModules(): void {
    this.addModule(this._settings);
  }
}
```

Apps with `audioFields: true` can still call `addField(...)` afterwards to add their own fields alongside the audio ones.

### Open settings popup

```ts
uiEvents.createPopup(SettingsUIIds.SettingsPopup);
```

### Read values

```ts
const manager = resolver.getInstance(SettingsManager);
const musicOn = manager.getBooleanValue("music");
const volume = manager.getNumberValue("sfxVolume");
```

### React to changes

```ts
const events = resolver.getInstance(SettingsEvents);
events.onValueChanged((name) => {
  if (name === "haptics") {
    // adjust haptics
  }
});
```

If you used `audioFields: true`, the framework already subscribes to `sfx` / `music` / `sfxVolume` / `musicVolume` and forwards them to `AudioService`. You only need to subscribe yourself for app-specific fields.

### Reset to defaults

```ts
manager.resetToDefaults();
```

## AudioService bridge

When the binding is constructed with `audioFields: true`, `configureDI` installs a small bridge between `SettingsEvents` and `AudioService`:

| Field         | Type            | Maps to                                     |
| ------------- | --------------- | ------------------------------------------- |
| `sfx`         | `boolean`       | `audio.setSfxMute(!value)` (true = unmuted) |
| `music`       | `boolean`       | `audio.setMusicMute(!value)`                |
| `sfxVolume`   | `number 0..100` | `audio.setSfxVolume(value / 100)`           |
| `musicVolume` | `number 0..100` | `audio.setMusicVolume(value / 100)`         |

The bridge:

- **Applies the persisted values once on install** so audio state survives a page reload.
- **Subscribes to subsequent changes** and applies them to `AudioService` immediately.
- **Calls `audio.resume()` on every change** to wake the suspended `AudioContext` from inside the user-gesture handler that drove the change. Without this, browser autoplay policy keeps the context suspended and the gain change has no audible effect.

### Auto-resume on first user gesture

`AudioService.initialize` (called by the framework at app boot) installs a one-shot `pointerdown` / `keydown` listener on `document` that calls `_ctx.resume()` on the first user interaction and then removes itself. This means apps using `audioFields: true` get correct startup behavior automatically — music started via `audio.playMusic(...)` at boot becomes audible the moment the user clicks anywhere or presses any key.

Apps using their own field names need to either install a similar listener themselves or call `audioService.resume()` from inside a known user-gesture handler (typically a SFX click path).

## Field types

### SettingsBooleanField

```ts
new SettingsBooleanField(name, label, defaultValue);
```

- `name` — unique key (used for storage and events)
- `label` — display name in the popup
- `defaultValue` — initial value if nothing is persisted

### SettingsNumberField

```ts
new SettingsNumberField(name, label, defaultValue, min, max, step);
```

- `name`, `label`, `defaultValue` — same as boolean
- `min`, `max` — allowed range (values are clamped)
- `step` — granularity (`1` for integers, `0.1` for decimals, `5` for coarse steps)

## SettingsManager API

| Method                         | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| `addField(field)`              | Register a field (loads persisted value or uses default) |
| `getFields()`                  | Iterate all registered fields                            |
| `getField(name)`               | Get a field definition by name                           |
| `getBooleanValue(name)`        | Get current boolean value                                |
| `getNumberValue(name)`         | Get current number value                                 |
| `setBooleanValue(name, value)` | Set, validate, persist, emit event                       |
| `setNumberValue(name, value)`  | Clamp, step-round, persist, emit event                   |
| `resetToDefaults()`            | Reset all fields to default values                       |

## Persistence

Values are stored in `localStorage` via the shared `StorageService`, namespaced by the app's class name (the constructor name of your `GamelabsApp` subclass). For example, with `class MyApp extends GamelabsApp`:

- `music` → stored as `"MyApp.music"`
- `sfxVolume` → stored as `"MyApp.sfxVolume"`

On load, if a persisted value exists and is valid for the field type, it's used. Otherwise the field's `defaultValue` is used. This handles schema changes gracefully — adding a new field uses its default, removing a field leaves the orphaned key harmless.

## Popup

`SettingsPopupView` renders:

- A 9-slice rounded **panel background** (`ImageComponent` over the framework's `Image` style) using the binding-shipped `panel-bg.png` (white-with-alpha, 16px corner radius).
- A heading **title label** ("Settings") via `LabelComponent`.
- A flex column of field rows, one per registered field:
  - **Boolean fields** — a left-side `LabelComponent` field name and a right-side `ToggleComponent` (framework default skin).
  - **Number fields** — a left-side `LabelComponent` field name and a right-side `SliderComponent` (framework default skin). The numeric value is intentionally not displayed in a separate label; the slider thumb position communicates the value.
- A **Close** button (`ButtonComponent`) at the bottom.

Each row is a `HorizontalLayoutComponent` with `justifyContent: "space-between"` and `alignItems: "center"`, so labels sit at the row's left edge and toggles / sliders sit at the row's right edge — both right-side controls share the same right margin without manual positioning.

Changes are applied and saved instantly as the user interacts. No "Apply" or "Save" button needed.

## Theming

Every visual surface in the popup is driven by data shipped as **Text assets** in the binding. Each Text asset carries a JSON-encoded UIComponent style override that deep-merges on top of the framework's registered `UIComponentsStyleIds.<X>` defaults via `StyleManager.resolve`. Apps re-theme by overriding either the asset URL or the inline JSON content before app boot.

| `SettingsAssetIds.<id>` | Type          | Override target                              |
| ----------------------- | ------------- | -------------------------------------------- |
| `PanelBg`               | `HudTexture`  | The panel-bg PNG (texture).                  |
| `PanelBgStyle`          | `Text` (JSON) | `ImageComponentStyle` for the panel-bg.      |
| `TitleStyle`            | `Text` (JSON) | `LabelComponentStyle` for the title.         |
| `FieldLabelStyle`       | `Text` (JSON) | `LabelComponentStyle` for field labels.      |
| `CloseButtonStyle`      | `Text` (JSON) | `ButtonComponentStyle` for the Close button. |

Two re-theming paths:

```ts
// Replace the asset URL (e.g., load JSON from a server / CDN):
binding.assetRequestList.overrideRequest(SettingsAssetIds.TitleStyle, "/themes/my-app/settings-title.json");

// Or modify the framework's UIComponentsStyleIds.<X> entries app-wide
// before app boot — every popup surface that resolves from those ids
// picks up the change automatically.
styleManager.modify(UIComponentsStyleIds.Label, { text: { color: 0x000000 } });
```

The popup's close button intentionally **omits** a `color` override on its label — the framework's `Button` default label colour (white) flows through and reads against the dark slate idle/hover/pressed PNGs. The other surfaces (title, field labels) explicitly pin their colours because they sit against the white panel where dark slate is the right contrast.

## Exports

- `SettingsBinding` — module binding (constructor opt: `audioFields?: boolean`).
- `SettingsManager` — core settings manager.
- `SettingsEvents` — change events.
- `SettingsUIIds` — popup UI ID enum.
- `SettingsAssetIds` — texture / style asset id enum.
- `SettingsFieldType` — field type enum.
- `SettingsBooleanField`, `SettingsNumberField` — field definition classes.
- `SettingsModel`, `ISettingsModel` — readonly settings model.
- `SettingsPopupView`, `SettingsPopupViewController` — popup view / controller.
- `ISettingsPopupView` — view interface.
