# Settings Module

Typed game settings with boolean toggles and number sliders. Values are persisted in `localStorage` via `StorageService`, validated on write (clamp, step rounding), and broadcast via `SettingsEvents`. Includes a ready-to-use popup UI with toggle switches and drag sliders.

## Usage

### Setup

The binding registers `SettingsModel`, `SettingsEvents`, and `SettingsManager`
in the DI container. Field definitions are added at runtime through the
manager, resolved from DI in `postInitialize`.

```ts
import { SettingsBinding, SettingsManager, SettingsBooleanField, SettingsNumberField } from "@gamebyte/gamelabsjs";

class MyApp extends GamelabsApp {
  private readonly _settings = new SettingsBinding();

  protected override registerModules(): void {
    this.addModule(this._settings);
  }

  protected override postInitialize(): void {
    const manager = this.diContainer.getInstance(SettingsManager);
    manager.addField(new SettingsBooleanField("music", "Music", true));
    manager.addField(new SettingsBooleanField("sfx", "Sound Effects", true));
    manager.addField(new SettingsNumberField("volume", "Volume", 80, 0, 100, 5));
    manager.addField(new SettingsNumberField("difficulty", "Difficulty", 1, 1, 10, 1));
  }
}
```

### Open settings popup

```ts
uiEvents.createPopup(SettingsUIIds.SettingsPopup);
```

### Read values

```ts
const manager = resolver.getInstance(SettingsManager);
const musicOn = manager.getBooleanValue("music");
const volume = manager.getNumberValue("volume");
```

### React to changes

```ts
const events = resolver.getInstance(SettingsEvents);
events.onValueChanged((name) => {
  if (name === "volume") {
    const vol = manager.getNumberValue("volume");
    // adjust audio volume
  }
});
```

### Reset to defaults

```ts
manager.resetToDefaults();
```

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

Values are stored in `localStorage` via the shared `StorageService`,
namespaced by the app's class name (the constructor name of your
`GamelabsApp` subclass). For example, with `class MyApp extends GamelabsApp`:

- `music` → stored as `"MyApp.music"`
- `volume` → stored as `"MyApp.volume"`

On load, if a persisted value exists and is valid for the field type, it's used. Otherwise the field's `defaultValue` is used. This handles schema changes gracefully — adding a new field uses its default, removing a field leaves the orphaned key harmless.

## Popup

`SettingsPopupView` renders:

- **Boolean fields** as toggle switches (green on / grey off)
- **Number fields** as horizontal sliders with a value label
- A **Close** button

Changes are applied and saved instantly as the user interacts. No "Apply" or "Save" button needed.

## Exports

- `SettingsBinding` — module binding
- `SettingsManager` — core settings manager
- `SettingsEvents` — change events
- `SettingsUIIds` — popup UI ID enum
- `SettingsFieldType` — field type enum
- `SettingsBooleanField`, `SettingsNumberField` — field definition classes
- `SettingsPopupView`, `SettingsPopupViewController` — popup view/controller
- `ISettingsPopupView` — view interface
