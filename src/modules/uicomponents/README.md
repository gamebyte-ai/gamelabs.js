# UI Components Module

Reusable PixiJS UI components built on top of `@pixi/layout` and `@pixi/ui`. Each component accepts a plain preset object so configuration can be stored as JSON (e.g. loaded through the `AssetManager` as a `Text` asset and parsed at runtime).

## Components

- [`ButtonComponent`](#buttoncomponent) — pressable button driven by the framework `StyleManager` with four-state skin (idle / hover / pressed / disabled) and centered label
- [`BackgroundComponent`](#backgroundcomponent) — full-screen cover-fit background driven by the framework `StyleManager` with overlay + fallback colour
- [`ImageComponent`](#imagecomponent) — texture fitted into a layout-managed box (contain / cover / stretch)
- [`ToggleComponent`](#togglecomponent) — on/off switch driven by the framework `StyleManager` with track + thumb skin
- [`SliderComponent`](#slidercomponent) — horizontal slider driven by the framework `StyleManager` with track / fill / thumb skin and min/max/step constraints
- [`DropdownComponent`](#dropdowncomponent) — select-style dropdown with overlay-rendered option list
- [`RadioButtonComponent`](#radiobuttoncomponent) — single radio indicator driven by the framework `StyleManager` with optional label; designed to compose into a group
- [`RadioButtonGroupComponent`](#radiobuttongroupcomponent) — mutually exclusive set of `RadioButtonComponent`s stacked in a column or row, all sharing one resolved style
- [`ScrollViewComponent`](#scrollviewcomponent) — clipped scrollable viewport with mouse-wheel + drag panning and an optional scrollbar
- [`ListComponent`](#listcomponent) — single-column list with text / text+image / image rows and optional single- or multi-select
- [`VerticalLayoutComponent`](#verticallayoutcomponent) — vertical flex container
- [`HorizontalLayoutComponent`](#horizontallayoutcomponent) — horizontal flex container
- [`GridLayoutComponent`](#gridlayoutcomponent) — flex container with row-wrap that approximates a CSS grid (no real grid algorithm)
- [`FullscreenLayoutComponent`](#fullscreenlayoutcomponent) — layout container whose size tracks the canvas via `AppEvents`

Each component exports a matching `parse<Name>Preset(json: string)` helper that parses a JSON string into the preset type.

---

## ButtonComponent

Pressable button themed via the framework's `StyleManager`. Construction takes an `AssetManager`, a fully-resolved `ButtonComponentStyle`, and geometry / label opts. The four pointer states (`idle` / `hover` / `pressed` / `disabled`) each carry an independent `SpriteStyle` (texture / tint / alpha / 9-slice border / scale); the matching texture / tint / alpha gets applied automatically on pointer transitions. The framework's `UIComponentsBinding` registers a default style entry under `UIComponentsStyleIds.Button` with the four PNGs it ships, so apps that add the binding get fully-textured buttons without supplying any art.

```ts
// In a HudViewBase / ScreenView / PopupView subclass — the base class
// exposes `styleManager` and `assetLoader` getters for free:
const buttonStyle = this.styleManager.resolve<ButtonComponentStyle>(
  UIComponentsStyleIds.Button,
  // optional per-button override; deep-merged on top of the registered defaults
  { label: { fontSize: 14, color: 0x4a5568 } },
);
const closeBtn = new ButtonComponent(this.assetLoader, buttonStyle, {
  width: 120,
  height: 38,
  label: "Close",
});
closeBtn.onPress(() => this.close());

// Custom skin — point each state at your own PNGs:
const cancelStyle = this.styleManager.resolve<ButtonComponentStyle>(UIComponentsStyleIds.Button, {
  idle: { textureId: MyAssetIds.CancelIdle, border: 2 },
  hover: { textureId: MyAssetIds.CancelHover, border: 2 },
  pressed: { textureId: MyAssetIds.CancelPressed, border: 2 },
  disabled: { textureId: MyAssetIds.CancelDisabled, border: 2 },
});
const cancelBtn = new ButtonComponent(this.assetLoader, cancelStyle, {
  width: 200,
  height: 60,
  label: "Cancel",
});
```

The bg sprite type (`PIXI.Sprite` vs `PIXI.NineSliceSprite`) is fixed at construction by the resolved idle-state `border`. Default-skin PNGs ship with a 2px border so the registered default uses 9-slice; custom skins default to plain stretching unless their style override sets `border > 0`.

### `ButtonComponentOpts`

Geometry / content. Visual fields are owned by the style — pass them through `StyleManager.resolve(...)`.

| Field    | Type     | Description                                                  |
| -------- | -------- | ------------------------------------------------------------ |
| `x`      | `number` | X position.                                                  |
| `y`      | `number` | Y position.                                                  |
| `width`  | `number` | Fixed width. Ignored when the parent layout controls sizing. |
| `height` | `number` | Fixed height. Ignored when the parent layout controls sizing.|
| `label`  | `string` | Label text. Omit for an icon-only button.                    |

### `ButtonComponentStyle`

Bundle of four `SpriteStyle` slots plus an optional `TextStyle` label. Apps re-theme every button at once with `styleManager.modify(UIComponentsStyleIds.Button, { … })`; per-button overrides flow through `styleManager.resolve(...)` at the call site.

| Slot       | Type          | Notes                                                                       |
| ---------- | ------------- | --------------------------------------------------------------------------- |
| `idle`     | `SpriteStyle` | Resting visual. Drives the bg sprite type at construction (`border > 0` → `NineSliceSprite`). |
| `hover`    | `SpriteStyle` | Pointer-over. Texture / tint / alpha swap on transition.                    |
| `pressed`  | `SpriteStyle` | Pointer-down. Pointer-out during a press cancels back to `idle`.            |
| `disabled` | `SpriteStyle` | Applied when `setEnabled(false)` is called.                                 |
| `label`    | `TextStyle`   | Font / size / weight / color / alpha / letterSpacing for the label.         |

`SpriteStyle` is `{ textureId?, color?, alpha?, scaleX?, scaleY?, border? }`. `TextStyle` is `{ fontFamily?, fontSize?, fontWeight?, color?, alpha?, letterSpacing? }`. The framework default registers `border: 2` for all four states (the PNGs ship with a 2px black border).

### Methods

- `setLabel(text)` — update the label text (no-op if the button was created without a label).
- `setEnabled(enabled)` — disabling swaps to the `disabled` state and prevents `onPress` from firing; re-enabling restores the resting state (or `hover` if the pointer is still over the button).
- `onPress(cb): Unsubscribe` — subscribe to press events. Disabled presses are filtered automatically.

### Notes

- **Default skin via `UIComponentsBinding`.** Adding the binding registers the four `DefaultButton{Idle,Hover,Pressed,Disabled}` `HudTexture` asset requests *and* the `UIComponentsStyleIds.Button` style entry. Apps re-theme every button at once with `styleManager.modify(UIComponentsStyleIds.Button, { hover: { color: 0x88aaff } })`; texture URLs can be swapped at boot with `binding.assetRequestList.overrideRequest(id, url)`.
- **Tinting for colour identity.** When several buttons share a skin but need distinct colours (e.g. tower-defence shop cards, "Next Level" CTAs), set `button.tint = 0x...` after construction. `Container.tint` propagates to the bg sprite. The label's colour comes from `style.label.color` and is unaffected by container tint — set both if you want the label to follow the button's tint.
- **State machine.** Pointer events flow through `@pixi/ui` `Button` (`onDown` / `onUp` / `onUpOut` / `onHover` / `onOut`); the component consolidates them into the four-state model and applies the matching state's `SpriteStyle` on each transition.
- **Eager construction.** The constructor calls `_buildSprite` from the base `StyledHudObject`, which expects all referenced textures to be loaded in the asset manager. Construct buttons in `postInitialize()` (or later) — after the framework's `loadAssets` phase has resolved.

---

## BackgroundComponent

Full-screen background themed via the framework's `StyleManager`. Construction takes an `AssetManager`, a fully-resolved `BackgroundComponentStyle`, and overlay / fallback opts. Fills its parent (absolute layout), scales the resolved bg texture to "cover" the viewport without distortion (preserves aspect ratio, centres + crops along the over-sized axis), and draws a semi-transparent overlay on top for UI readability. The framework's `UIComponentsBinding` registers a default style entry (white texture) so apps that add the binding get a usable fallback without supplying any art; real screens override the bg slot.

```ts
// In a HudViewBase / ScreenView / PopupView subclass:
const backgroundStyle = this.styleManager.resolve<BackgroundComponentStyle>(
  UIComponentsStyleIds.Background,
  // Override the bg slot with the screen's own backdrop:
  { bg: { textureId: MyAppAssetIds.MainScreenBg } },
);
const background = new BackgroundComponent(this.assetLoader, backgroundStyle, {
  overlayAlpha: 0.18,
});
this.addChild(background);
```

### `BackgroundComponentOpts`

Overlay + fallback colours are per-screen UI tuning rather than themable skin data, so they live on the opts and not the style.

| Field           | Type     | Default    | Description                                                  |
| --------------- | -------- | ---------- | ------------------------------------------------------------ |
| `overlayColor`  | `number` | `0x000000` | Overlay colour drawn on top of the texture.                  |
| `overlayAlpha`  | `number` | `0.12`     | Overlay alpha when the texture is present.                   |
| `fallbackColor` | `number` | `0x020617` | Solid colour used when no texture is loaded (defensive only — eager construction throws on missing assets). |
| `fallbackAlpha` | `number` | `0.55`     | Fallback alpha.                                              |

### `BackgroundComponentStyle`

A single `SpriteStyle` slot. Apps re-theme every background at once with `styleManager.modify(UIComponentsStyleIds.Background, { bg: { textureId: "..." } })`; per-screen overrides flow through `styleManager.resolve(...)` at the call site.

| Slot | Type          | Notes                                                                                                                 |
| ---- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `bg` | `SpriteStyle` | The cover-scaled background texture. The component bypasses `_buildSprite` for cover-fit math, so `border` / `scaleX` / `scaleY` on this slot are informational only. |

### Notes

- **Default skin via `UIComponentsBinding`.** Adding the binding registers the `DefaultBackground` `HudTexture` asset request *and* the `UIComponentsStyleIds.Background` style entry. The default texture is plain white — meant as a placeholder; real screens override the `bg` slot with their own backdrop.
- **Cover-fit math.** The component scales the bg sprite by `Math.max(width / textureWidth, height / textureHeight)` so the smaller axis overflows + crops, matching CSS `background-size: cover`. This is custom logic — the base `_buildSprite` helper would stretch instead and distort the texture along the over-sized axis.
- **Tinting.** `Container.tint` propagates to the bg sprite; the overlay/fallback Graphics layers also respect Container.tint, so a single `bg.tint = 0xff0000` reddens the whole composite.
- **Eager construction.** The constructor calls `_getTexture` from the base `StyledHudObject`, which throws if the resolved bg texture isn't loaded in the asset manager. Construct backgrounds in `postInitialize()` (or later) — after the framework's `loadAssets` phase has resolved.

---

## ImageComponent

Texture fitted into a layout-managed box with configurable scaling behavior.

```ts
const logo = new ImageComponent({
  width: 520,
  height: 140,
  textureId: "MainScreen.Logo",
  fit: "contain",
  padding: 0.96,
});
logo.resolveAssets(assetManager);
```

### `ImageComponentPreset`

| Field       | Type                                | Default     | Description                                                                                                                                                   |
| ----------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`         | `number`                            | —           | X position.                                                                                                                                                   |
| `y`         | `number`                            | —           | Y position.                                                                                                                                                   |
| `width`     | `number \| string`                  | —           | Fixed width. Accepts a number or a percentage string like `"100%"`.                                                                                           |
| `height`    | `number \| string`                  | —           | Fixed height. Accepts a number or a percentage string like `"100%"`.                                                                                          |
| `textureId` | `string`                            | —           | Asset ID for the texture. Resolved via `resolveAssets()`.                                                                                                     |
| `fit`       | `"contain" \| "cover" \| "stretch"` | `"contain"` | Fit strategy. `contain` preserves aspect ratio and fits entirely inside; `cover` preserves aspect ratio and fills (may crop); `stretch` ignores aspect ratio. |
| `padding`   | `number`                            | `1`         | Scale factor applied to the fit calculation (0–1). E.g. `0.96` leaves a 4% margin. Ignored when `fit` is `"stretch"`.                                         |

### Methods

- `setTexture(texture)` — set the texture directly.
- `resolveAssets(assetManager)` — look up `textureId` in the asset manager and apply it.

---

## ToggleComponent

On/off switch themed via the framework's `StyleManager`. Construction takes an `AssetManager`, a fully-resolved `ToggleComponentStyle`, and geometry / value opts. The track is a single sprite whose texture swaps between the resolved `trackOn` / `trackOff` slots when the value changes; the thumb is a separate sprite that slides between the off and on positions on each transition. The framework's `UIComponentsBinding` registers a default style entry (rounded pill track + circular thumb) so apps that add the binding get a fully-textured toggle without supplying any art.

```ts
// In a HudViewBase / ScreenView / PopupView subclass:
const toggleStyle = this.styleManager.resolve<ToggleComponentStyle>(
  UIComponentsStyleIds.Toggle,
);
const enabled = new ToggleComponent(this.assetLoader, toggleStyle, {
  value: true,
});
enabled.onChange((v) => console.log("enabled:", v));

// Custom skin — point each track + thumb slot at your own PNGs (e.g.
// a rectangle track with a square knob, in a different palette):
const altStyle = this.styleManager.resolve<ToggleComponentStyle>(UIComponentsStyleIds.Toggle, {
  trackOn: { textureId: MyAssetIds.ToggleTrackOn },
  trackOff: { textureId: MyAssetIds.ToggleTrackOff },
  thumb: { textureId: MyAssetIds.ToggleThumb },
});
const altToggle = new ToggleComponent(this.assetLoader, altStyle, { value: false });
```

### `ToggleComponentOpts`

Geometry / value. Visual fields are owned by the style.

| Field        | Type      | Default | Description                                                         |
| ------------ | --------- | ------- | ------------------------------------------------------------------- |
| `width`      | `number`  | `44`    | Toggle width.                                                       |
| `height`     | `number`  | `24`    | Toggle height.                                                      |
| `thumbInset` | `number`  | `3`     | Inset from track edge to thumb. Thumb renders at `(height - 2*inset)` square. |
| `value`      | `boolean` | `false` | Initial value.                                                      |

### `ToggleComponentStyle`

Bundle of three `SpriteStyle` slots. Defaults registered under `UIComponentsStyleIds.Toggle`.

| Slot       | Type          | Notes                                                                                                                  |
| ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `trackOn`  | `SpriteStyle` | Track texture used while value is `true`. Drives the track sprite type at construction (`border > 0` → `NineSliceSprite`). |
| `trackOff` | `SpriteStyle` | Track texture used while value is `false`. Texture swaps onto the same sprite — no rebuild.                            |
| `thumb`    | `SpriteStyle` | Sliding handle. Sized to `(height - 2*thumbInset)` square; anchored at its centre.                                     |

The framework default uses `border: 0` for all three slots — the rounded pill ends don't 9-slice cleanly, so the runtime stretches the track texture between the resolved track-on / track-off PNGs. Custom skins with straight-edged tracks can opt into 9-slice via the style override.

### Methods

- `value` — current boolean value (getter).
- `setValue(value)` — set the value programmatically (does **not** fire `onChange`).
- `toggle()` — flip the value and fire `onChange`.
- `onChange(cb): Unsubscribe` — subscribe to value changes.

### Notes

- **Default skin via `UIComponentsBinding`.** Adding the binding registers the three `DefaultToggle{TrackOn,TrackOff,Thumb}` `HudTexture` asset requests *and* the `UIComponentsStyleIds.Toggle` style entry. Apps re-theme every toggle at once with `styleManager.modify(UIComponentsStyleIds.Toggle, …)`; texture URLs can be swapped at boot with `binding.assetRequestList.overrideRequest(id, url)`.
- **Tinting for colour identity.** Set `toggle.tint = 0x...` after construction; `Container.tint` propagates to track + thumb sprites simultaneously.
- **Eager construction.** The constructor calls `_buildSprite` from the base `StyledHudObject`, which expects all three textures (both track variants and the thumb) to be loaded in the asset manager. Construct toggles in `postInitialize()` (or later) — after the framework's `loadAssets` phase has resolved.

---

## SliderComponent

Horizontal slider themed via the framework's `StyleManager`. Three textured sprites — full-length track, value-driven fill, draggable thumb — driven by a `SliderComponentStyle` resolved from `UIComponentsStyleIds.Slider`. The framework's `UIComponentsBinding` registers a default style entry (track + fill 9-slice with 2px border, plain stretched thumb) so apps that add the binding get a fully-textured slider out of the box. Tap the track or drag the thumb to change value; subscribers via `onChange` receive the clamped (and step-snapped) numeric value.

```ts
// Default skin — UIComponentsBinding registers everything.
const sliderStyle = this.styleManager.resolve<SliderComponentStyle>(
  UIComponentsStyleIds.Slider,
);
const volume = new SliderComponent(this.assetLoader, sliderStyle, {
  trackWidth: 200,
  min: 0,
  max: 100,
  step: 1,
  value: 50,
});
volume.onChange((v) => console.log("volume:", v));
```

For per-channel colour identity (e.g. R / G / B sliders), share one neutral-white skin and use `Container.tint`:

```ts
const customStyle = this.styleManager.resolve<SliderComponentStyle>(UIComponentsStyleIds.Slider, {
  track: { textureId: MyAssetIds.NeutralTrack, border: 2 },
  fill: { textureId: MyAssetIds.NeutralFill, border: 2 },
  thumb: { textureId: MyAssetIds.NeutralThumb, border: 0 },
});
const slider = new SliderComponent(this.assetLoader, customStyle, {
  trackWidth: 160, min: 0, max: 255, step: 1,
});
slider.tint = 0xff0000; // multiplies all three sub-sprites — channel red
```

### `SliderComponentOpts`

Geometry / value. Visual fields are owned by the style.

| Field         | Type     | Default | Description                                                          |
| ------------- | -------- | ------- | -------------------------------------------------------------------- |
| `trackWidth`  | `number` | `140`   | Track width in pixels.                                               |
| `trackHeight` | `number` | `6`     | Track height in pixels.                                              |
| `thumbRadius` | `number` | `10`    | Thumb radius in pixels (the thumb sprite renders at `2 × radius` square). |
| `min`         | `number` | `0`     | Minimum value.                                                       |
| `max`         | `number` | `1`     | Maximum value.                                                       |
| `step`        | `number` | `0`     | Step size. `0` means continuous.                                     |
| `value`       | `number` | `min`   | Initial value (clamped to `[min, max]`).                             |

### `SliderComponentStyle`

Bundle of three `SpriteStyle` slots. Defaults registered under `UIComponentsStyleIds.Slider`.

| Slot    | Type          | Notes                                                                                                                                                          |
| ------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `track` | `SpriteStyle` | Full-length background. 9-slice when `border > 0`; the framework default registers `border: 2`.                                                                |
| `fill`  | `SpriteStyle` | Value-driven foreground; width grows with the value ratio. Same default as `track`.                                                                            |
| `thumb` | `SpriteStyle` | Draggable handle at `2 × thumbRadius` square. The framework default registers `border: 0` (plain stretched sprite); the thumb's geometry is fixed by opts.    |

### Methods

- `value` — current numeric value (getter).
- `min`, `max`, `step` — constraint values (getters).
- `setValue(value)` — set the value programmatically (does **not** fire `onChange`).
- `onChange(cb): Unsubscribe` — subscribe to value changes from drag, track tap, or any other user-driven update. `setValue` is silent on purpose — programmatic updates don't echo back.

### Notes

- **Default skin via `UIComponentsBinding`.** Apps re-theme every slider at once with `styleManager.modify(UIComponentsStyleIds.Slider, { ... })`. Per-slider overrides flow through `styleManager.resolve(...)` at the call site. Texture URLs can be swapped at boot with `binding.assetRequestList.overrideRequest(id, url)`.
- **Tinting for colour identity.** `Container.tint` propagates to all three sub-sprites — the canonical pattern for sliders sharing a single neutral skin (e.g. R / G / B channel sliders driving an RGB swatch).
- **Geometry.** Track sits centred on `y = 0` (top edge at `-trackHeight/2`); thumb rides `y = 0` at `(filledWidth, 0)` with anchor `(0.5, 0.5)`. The visible bounds are `[-thumbRadius, thumbRadius] × [-thumbRadius, thumbRadius]` extended horizontally by `trackWidth`. Wrap the slider in a layout box of `(trackWidth + 2·thumbRadius) × (2·thumbRadius)` and offset by `(thumbRadius, thumbRadius)` if you embed it in a Yoga flex flow.
- **Eager construction.** Like `ButtonComponent`, sprites build at construction via the base `StyledHudObject` — referenced textures must be loaded in the asset manager before construction (typically that means constructing the slider in `postInitialize()`).

---

## DropdownComponent

Select-style dropdown. The header shows the current selection (or a placeholder) plus a chevron; tapping it toggles a list of options that's anchored beneath the header. Tapping an option selects it and closes the list. A scrim catches taps outside the list and closes the dropdown.

```ts
const dropdown = new DropdownComponent({
  width: 200,
  items: [
    { id: "easy", label: "Easy" },
    { id: "normal", label: "Normal" },
    { id: "hard", label: "Hard" },
  ],
  selectedId: "normal",
});
dropdown.onChange((id, item) => {
  console.log("selected:", id, item.label);
});
```

### `DropdownComponentPreset`

| Field               | Type                             | Default     | Description                                                |
| ------------------- | -------------------------------- | ----------- | ---------------------------------------------------------- |
| `x`                 | `number`                         | —           | X position.                                                |
| `y`                 | `number`                         | —           | Y position.                                                |
| `width`             | `number`                         | `160`       | Header width (also list width).                            |
| `height`            | `number`                         | `36`        | Header height.                                             |
| `radius`            | `number`                         | `6`         | Header / list corner radius.                               |
| `fillColor`         | `number`                         | `0x1f2937`  | Header fill color.                                         |
| `fillAlpha`         | `number`                         | `1`         | Header fill alpha.                                         |
| `strokeColor`       | `number`                         | `0x475569`  | Header stroke color, also used for the list outline.       |
| `strokeWidth`       | `number`                         | `1`         | Header stroke width.                                       |
| `labelStyle`        | `Partial<PIXI.TextStyleOptions>` | —           | Style overrides for header label and item labels.          |
| `placeholder`       | `string`                         | `"Select…"` | Header text shown when no selection.                       |
| `items`             | `readonly DropdownItem[]`        | `[]`        | Option list. May be replaced later with `setItems()`.      |
| `selectedId`        | `string`                         | —           | Initial selection. Ignored if it doesn't match an item id. |
| `chevronColor`      | `number`                         | `0xe8eef6`  | Chevron tint.                                              |
| `itemHeight`        | `number`                         | `32`        | Per-row height in the option list.                         |
| `itemFillColor`     | `number`                         | `0x111827`  | Resting row background.                                    |
| `itemHoverColor`    | `number`                         | `0x374151`  | Hover row background.                                      |
| `itemSelectedColor` | `number`                         | `0x4338ca`  | Background of the currently selected row.                  |
| `itemTextColor`     | `number`                         | `0xe8eef6`  | Item label color.                                          |
| `listOffset`        | `number`                         | `4`         | Vertical gap between header bottom and list top.           |

`DropdownItem` is `{ id: string; label: string }`. The `id` is the value emitted by `onChange` and accepted by `setSelectedId`; the `label` is what's drawn.

### Methods

- `selectedId` / `selectedItem` / `isOpen` / `items` — getters.
- `setItems(items)` — replace the items list. If the previous selection isn't present, it's cleared silently.
- `setSelectedId(id | null)` — set selection programmatically. Does **not** fire `onChange`.
- `open()` / `close()` / `toggle()` — open-state control. `open()` is a no-op when items is empty.
- `onChange(cb): Unsubscribe` — fires only on user-driven selection changes.

### Notes

- **Overlay rendering.** When opened, the option list is re-parented to the scene root, given a very large `zIndex`, and the root is set to `sortableChildren = true` so the list paints above any HUD layers or other zIndex-based stacking. A near-transparent scrim sits behind the list and closes the dropdown when tapped. On `close()` (and on `destroy()`) the list returns to the dropdown.
- **Hit handling inside the list.** Each row has an explicit hit rect covering its full bounds, so hover and tap fire on the entire row — not just the text. The list background also absorbs pointer events so taps at the rounded corners (where no row sits) don't fall through to the scrim and close the dropdown unexpectedly.
- **Static placement.** The list's position is computed once on `open()` from the dropdown's current global transform. Moving the dropdown while open won't reposition the list — close and re-open instead. Parent scale / rotation is not propagated to the re-parented list.
- **Detached scenarios.** When the dropdown has no parent at `open()` time, the list stays inline as a child of the dropdown — placement and z-order then follow standard Pixi rules.

---

## RadioButtonComponent

Single radio indicator with an optional label, themed via the framework's `StyleManager`. Construction takes an `AssetManager`, a fully-resolved `RadioButtonComponentStyle`, and geometry / content opts. The two indicator states (`unselected` / `selected`) each carry an independent `SpriteStyle` (texture / tint / alpha / scale); `setSelected(value)` swaps the texture between them. The framework's `UIComponentsBinding` registers a default style entry under `UIComponentsStyleIds.RadioButton` with the two PNGs it ships, so apps that add the binding get a fully-textured radio without supplying any art.

Designed to be composed into a `RadioButtonGroupComponent` — the button reports user taps via `onPress`, and the group calls `setSelected(true/false)` on each button to enforce mutual exclusion.

```ts
// In a HudViewBase / ScreenView / PopupView subclass:
const radioStyle = this.styleManager.resolve<RadioButtonComponentStyle>(
  UIComponentsStyleIds.RadioButton,
);
const option = new RadioButtonComponent(this.assetLoader, radioStyle, {
  label: "Easy",
  selected: true,
});
option.onPress(() => {
  // Group decides what to do; standalone consumers can do:
  // option.setSelected(true);
});

// Custom skin — point the indicator slots at your own PNGs:
const customStyle = this.styleManager.resolve<RadioButtonComponentStyle>(UIComponentsStyleIds.RadioButton, {
  unselected: { textureId: MyAssetIds.RadioOff },
  selected: { textureId: MyAssetIds.RadioOn },
});
const altOption = new RadioButtonComponent(this.assetLoader, customStyle, { label: "Hard" });
```

### `RadioButtonComponentOpts`

Geometry / content. Visual fields are owned by the style.

| Field      | Type      | Default       | Description                                                                                |
| ---------- | --------- | ------------- | ------------------------------------------------------------------------------------------ |
| `x`        | `number`  | —             | X position.                                                                                |
| `y`        | `number`  | —             | Y position.                                                                                |
| `width`    | `number`  | auto          | Fixed width. When omitted, sized to fit indicator + gap + label.                           |
| `height`   | `number`  | auto          | Fixed height. When omitted, matches the indicator diameter.                                |
| `label`    | `string`  | —             | Optional label drawn to the right of the indicator. Omit for an icon-only indicator.       |
| `radius`   | `number`  | `9`           | Outer ring radius. The indicator sprite renders at `2 * radius` square.                    |
| `gap`      | `number`  | `8`           | Gap between indicator and label, in pixels.                                                |
| `selected` | `boolean` | `false`       | Initial selected state.                                                                    |

### `RadioButtonComponentStyle`

Bundle of two `SpriteStyle` indicator slots plus an optional `TextStyle` label. Apps re-theme every radio at once with `styleManager.modify(UIComponentsStyleIds.RadioButton, { … })`; per-radio overrides flow through `styleManager.resolve(...)` at the call site.

| Slot         | Type          | Notes                                                                                                          |
| ------------ | ------------- | -------------------------------------------------------------------------------------------------------------- |
| `unselected` | `SpriteStyle` | Resting outer-ring visual. Plain `PIXI.Sprite` (the framework default registers `border: 0`).                  |
| `selected`   | `SpriteStyle` | Outer ring + inner dot — the dot is baked into the texture rather than drawn at runtime.                       |
| `label`      | `TextStyle`   | Font / size / weight / color / alpha / letterSpacing for the label.                                            |

### Methods

- `selected` — current selected state (getter).
- `setSelected(value)` — silent visual update; does **not** fire `onPress`. Used by a group to enforce mutual exclusion.
- `onPress(cb): Unsubscribe` — fires on user taps anywhere within the indicator + label hit box. Selection state is decoupled — the listener decides what to do.

### Notes

- **State is decoupled from input.** The button does not auto-toggle on tap. This lets a group own the mutual-exclusion model and keeps the standalone-button case explicit. For a single button used outside a group, wire `btn.onPress(() => btn.setSelected(true))`.
- **Default skin via `UIComponentsBinding`.** Adding the binding registers the two `DefaultRadio{Unselected,Selected}` `HudTexture` asset requests *and* the `UIComponentsStyleIds.RadioButton` style entry. Re-theme every radio at once with `styleManager.modify(...)`; texture URLs can be swapped at boot with `binding.assetRequestList.overrideRequest(id, url)`.
- **Tinting for colour identity.** Set `radio.tint = 0x...` after construction; `Container.tint` propagates to the indicator sprite. The label's colour comes from `style.label.color` and is unaffected by container tint.
- **Layout-aware.** The component sets its own `.layout = { width, height }` so it participates in `@pixi/layout` flex flows. The whole bounding box (indicator + gap + label) is the click target via an explicit `hitArea`.
- **Eager construction.** The constructor calls `_buildSprite` from the base `StyledHudObject`, which expects the referenced indicator textures to be loaded in the asset manager. Construct radios in `postInitialize()` (or later) — after the framework's `loadAssets` phase has resolved.

---

## RadioButtonGroupComponent

Mutually exclusive set of `RadioButtonComponent`s arranged in a column or row, all sharing one resolved `RadioButtonComponentStyle`. The group owns the selection model: tapping a button updates `selectedId`, calls `setSelected()` on every other button to deselect them, and fires `onChange` with the new id + item.

Construction takes an `AssetManager`, the `RadioButtonComponentStyle` to hand to every child, and group geometry / content opts:

```ts
const radioStyle = this.styleManager.resolve<RadioButtonComponentStyle>(
  UIComponentsStyleIds.RadioButton,
);
const group = new RadioButtonGroupComponent(this.assetLoader, radioStyle, {
  items: [
    { id: "easy", label: "Easy" },
    { id: "normal", label: "Normal" },
    { id: "hard", label: "Hard" },
  ],
  selectedId: "normal",
  direction: "column",
  spacing: 10,
});
group.onChange((id, item) => {
  console.log("picked:", id, item.label);
});
```

### `RadioButtonGroupComponentOpts`

Geometry / content. Visual styling for the child radios lives on the `RadioButtonComponentStyle` passed alongside the asset manager.

| Field         | Type                              | Default    | Description                                                                  |
| ------------- | --------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `x`           | `number`                          | —          | X position.                                                                  |
| `y`           | `number`                          | —          | Y position.                                                                  |
| `items`       | `readonly RadioButtonGroupItem[]` | `[]`       | Options the group exposes. May be replaced later with `setItems()`.          |
| `selectedId`  | `string`                          | —          | Initial selection. Ignored if it doesn't match an item id.                   |
| `direction`   | `"column" \| "row"`               | `"column"` | Stack direction for the buttons.                                             |
| `spacing`     | `number`                          | `8`        | Gap between adjacent buttons.                                                |
| `padding`     | `number`                          | `0`        | Padding around the group.                                                    |
| `radius`      | `number`                          | `9`        | Outer ring radius forwarded to every child (children render `2 * radius` square). |
| `gap`         | `number`                          | `8`        | Gap between indicator and label inside each child.                           |

`RadioButtonGroupItem` is `{ id: string; label: string }`.

The group hands the same `RadioButtonComponentStyle` to every child. If you want different colours per option, render multiple groups (or override at the `RadioButtonComponent` level outside the group). Apps re-theme every radio at once with `styleManager.modify(UIComponentsStyleIds.RadioButton, …)`.

### Methods

- `selectedId` / `selectedItem` / `items` — getters.
- `setItems(items)` — replace the items. If the previous selection isn't present, it's cleared silently.
- `setSelectedId(id | null)` — set selection programmatically. Does **not** fire `onChange`.
- `onChange(cb): Unsubscribe` — fires only on user-driven selection changes (re-tapping the already-selected button is a no-op).

### Notes

- **The group is the single source of truth.** Each child `RadioButtonComponent` exposes `onPress` (decoupled by design) and only updates its visual when the group calls `setSelected`. This keeps the mutual-exclusion logic in one place and makes programmatic vs. user-driven changes distinguishable (`setSelectedId` is silent; user taps fire `onChange`).
- **Layout-aware.** The group sets its own `.layout` (a flex container with the configured `direction`, `spacing`, and `padding`, plus `alignItems: "flex-start"` and `justifyContent: "flex-start"`) so it nests inside other `@pixi/layout` flex flows.

---

## ScrollViewComponent

Clipped scrollable viewport. Exposes a public `content` container — add scrollable children to it directly. Mouse-wheel anywhere over the viewport scrolls; pointer-down on the viewport background pans (interactive children inside content keep their normal taps). The scrollbar is interactive: drag the thumb to scroll directly, or click the track to jump-scroll.

```ts
const scroll = new ScrollViewComponent({
  width: 240,
  height: 320,
  direction: "vertical",
});
for (const item of items) scroll.content.addChild(item);
// Tell the view how big the content is so scroll bounds match.
scroll.refresh();
scroll.onScroll((x, y) => console.log("scrolled to", x, y));
```

### `ScrollViewComponentPreset`

| Field                | Type                                   | Default      | Description                                                          |
| -------------------- | -------------------------------------- | ------------ | -------------------------------------------------------------------- |
| `x`                  | `number`                               | —            | X position.                                                          |
| `y`                  | `number`                               | —            | Y position.                                                          |
| `width`              | `number`                               | **required** | Viewport width.                                                      |
| `height`             | `number`                               | **required** | Viewport height.                                                     |
| `direction`          | `"vertical" \| "horizontal" \| "both"` | `"vertical"` | Allowed scroll axis. The disabled axis is forced to `0`.             |
| `fillColor`          | `number`                               | `0x000000`   | Background fill color (only drawn when `fillAlpha > 0`).             |
| `fillAlpha`          | `number`                               | `0`          | Background fill alpha. `0` skips the background entirely.            |
| `showScrollbar`      | `boolean`                              | `true`       | Whether to draw the interactive scrollbar (thumb-drag + track-jump). |
| `scrollbarColor`     | `number`                               | `0x94a3b8`   | Scrollbar thumb color.                                               |
| `scrollbarAlpha`     | `number`                               | `0.6`        | Scrollbar thumb alpha.                                               |
| `scrollbarThickness` | `number`                               | `4`          | Scrollbar thumb thickness in pixels.                                 |
| `scrollbarMargin`    | `number`                               | `2`          | Distance from the viewport edge to the scrollbar.                    |
| `wheelSpeed`         | `number`                               | `50`         | Pixels scrolled per wheel notch (browser delta is divided by 100).   |
| `dragEnabled`        | `boolean`                              | `true`       | Whether dragging on the viewport background pans the content.        |

### Methods

- `content` — public `PIXI.Container` that hosts the scrollable children.
- `scrollX` / `scrollY` / `viewportWidth` / `viewportHeight` / `contentWidth` / `contentHeight` / `scrollableWidth` / `scrollableHeight` — getters.
- `scrollTo(x, y)` — set the scroll offset (clamped; fires `onScroll` when the effective offset changes).
- `scrollBy(dx, dy)` — relative scroll.
- `refresh()` — recompute content size from `content.getLocalBounds()`. Call after adding, removing, or resizing children.
- `setContentSize(width, height)` — explicit override that skips the bounds measurement.
- `onScroll(cb): Unsubscribe` — fires whenever the scroll offset changes (user-driven OR programmatic).

### Notes

- **Content size is opt-in.** The component does not watch `content` for changes; call `refresh()` after mutating children, or call `setContentSize` directly if you already know the dimensions. Scroll offsets are clamped against the current content size — shrinking content automatically brings scroll back into bounds.
- **Drag from background only.** Pointer-down only starts a pan when the hit target is the viewport itself, so taps on interactive children (buttons, list rows, etc.) aren't intercepted. To support drag-from-anywhere (mobile-list style), gate it externally on a movement threshold and call `scrollBy` yourself.
- **Wheel propagation.** The component only swallows wheel events that actually scrolled — once the view is pinned at an edge, further wheel ticks fall through to the page (or to a parent scroll view), matching browser behavior.
- **Interactive scrollbar.** Drag the thumb to scroll directly, or click on the track outside the thumb to jump-scroll (the thumb centers on the click, then continues as a drag from the new position so you can keep adjusting). Each axis is one `Graphics` that draws a near-transparent track rect (for hit-testing) plus the visible thumb on top.
- **Yoga inside content.** `content` has no `.layout` by default — children are positioned manually. To use `@pixi/layout` flex inside, set `scroll.content.layout = { flexDirection: "column", flexShrink: 0, ... }` yourself; otherwise yoga won't propagate through the unsized intermediary.

---

## ListComponent

Single-column list. Each row uses one of three layout variants — `"text"`, `"text+image"`, or `"image"` — picked up front so the row geometry stays stable. Selection is opt-in via `selectionMode`: a list can be a non-selectable button group (`"none"`), a single-select picker (`"single"`), or a multi-select set (`"multi"`).

```ts
const list = new ListComponent({
  width: 240,
  variant: "text+image",
  selectionMode: "single",
  items: [
    { id: "sword", label: "Iron Sword", textureId: "Inventory.IronSword" },
    { id: "shield", label: "Wood Shield", textureId: "Inventory.WoodShield" },
    { id: "potion", label: "Health Potion", textureId: "Inventory.HealthPotion" },
  ],
  selectedIds: ["sword"],
});
list.resolveAssets(assetManager);
list.onChange((ids, items) => console.log("selected:", ids, items));
list.onItemPress((id, item) => console.log("pressed:", id, item.label));
```

The component does NOT scroll on its own. Wrap it in a `ScrollViewComponent` when the row count exceeds the visible area.

### `ListComponentPreset`

| Field           | Type                                | Default    | Description                                                                                                       |
| --------------- | ----------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `x`             | `number`                            | —          | X position.                                                                                                       |
| `y`             | `number`                            | —          | Y position.                                                                                                       |
| `width`         | `number`                            | `240`      | Total list width.                                                                                                 |
| `itemHeight`    | `number`                            | `36`       | Per-row height.                                                                                                   |
| `itemGap`       | `number`                            | `0`        | Vertical gap between rows.                                                                                        |
| `padding`       | `number`                            | `0`        | Padding around the rows on all sides.                                                                             |
| `variant`       | `"text" \| "text+image" \| "image"` | `"text"`   | Item layout variant.                                                                                              |
| `selectionMode` | `"none" \| "single" \| "multi"`     | `"none"`   | Selection model. `"none"` = clickable rows, no selection. `"single"` = mutual exclusion. `"multi"` = toggle each. |
| `items`         | `readonly ListItem[]`               | `[]`       | Rows to render. May be replaced later with `setItems()`.                                                          |
| `selectedIds`   | `readonly string[]`                 | `[]`       | Initial selection. Filtered to known ids and the active mode.                                                     |
| `radius`        | `number`                            | `0`        | Row corner radius.                                                                                                |
| `fillColor`     | `number`                            | `0x111827` | Resting row background.                                                                                           |
| `fillAlpha`     | `number`                            | `1`        | Row background alpha (applied to resting / hover / selected).                                                     |
| `hoverColor`    | `number`                            | `0x374151` | Hover row background.                                                                                             |
| `selectedColor` | `number`                            | `0x4338ca` | Selected row background.                                                                                          |
| `borderColor`   | `number`                            | `0x475569` | Row border color (only drawn when `borderWidth > 0`).                                                             |
| `borderWidth`   | `number`                            | `0`        | Row border width.                                                                                                 |
| `imageSize`     | `number`                            | `24`       | Square image size (used by `"image"` and `"text+image"` variants).                                                |
| `imagePadding`  | `number`                            | `8`        | Padding around the image inside its row slot.                                                                     |
| `labelStyle`    | `Partial<PIXI.TextStyleOptions>`    | —          | Label style overrides merged on top of the defaults.                                                              |
| `textPadding`   | `number`                            | `12`       | Left padding for the label in the `"text"` variant.                                                               |

`ListItem` is `{ id: string; label?: string; textureId?: string; texture?: PIXI.Texture }`. `id` is the value emitted by `onChange` / `onItemPress` and accepted by `setSelectedIds`. `label` is required for the `"text"` and `"text+image"` variants. Image variants take either a pre-resolved `texture` or a `textureId` resolved via `resolveAssets()` — when both are present, `texture` wins.

### Methods

- `items` / `selectedIds` / `selectedItems` / `selectionMode` / `variant` — getters.
- `setItems(items)` — replace the rows. Selection is filtered to ids that still exist; matching ids keep their selected state. No `onChange` is fired.
- `setSelectedIds(ids)` — set the selection programmatically. Normalized for the active mode (clamped to one id in `"single"`, forced empty in `"none"`) and filtered to known ids. Does **not** fire `onChange`.
- `resolveAssets(assetManager)` — look up each item's `textureId` and apply the loaded texture. Items with a pre-resolved `texture` are left alone. Safe to call repeatedly.
- `onChange(cb): Unsubscribe` — fires only on user-driven selection changes (single / multi modes only). In `"none"` mode this never fires.
- `onItemPress(cb): Unsubscribe` — fires on every user tap, regardless of mode.

### Notes

- **Selection is opt-in.** The same component covers a "list of buttons" (`"none"`), a single-select picker (`"single"`), and a multi-select check-list (`"multi"`). Pick the mode at construction; it's not a runtime mutation.
- **Tap semantics.** In `"single"` mode, re-tapping the already-selected row is a no-op (matches `RadioButtonGroupComponent` and `DropdownComponent`). In `"multi"` mode, re-tapping a selected row removes it from the set. `onItemPress` fires for every tap regardless.
- **Layout-aware.** The list sets its own `.layout` (a flex column with the configured `width`, `padding`, `itemGap`, `alignItems: "stretch"`, `justifyContent: "flex-start"`) so it nests inside other `@pixi/layout` flex flows. Each row also carries `.layout = { width, height }` so it participates in the column's flex sizing.
- **No internal scrolling.** Compose with `ScrollViewComponent` for long lists — the list keeps its full height, the scroll view clips and scrolls.
- **Texture resolution timing.** `setItems()` rebuilds rows with whatever `texture` each item carries; if items use `textureId`, follow up with `resolveAssets(am)`. Re-resolving is idempotent for already-resolved sprites.

---

## VerticalLayoutComponent

Thin wrapper over a `PIXI.Container` with `flexDirection: "column"` preconfigured.

```ts
const col = new VerticalLayoutComponent({
  width: 400,
  gap: 18,
  alignItems: "center",
});
col.addChild(childA);
col.addChild(childB);
```

### `VerticalLayoutComponentPreset`

| Field            | Type                                                                                            | Default        | Description                                 |
| ---------------- | ----------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------- |
| `x`              | `number`                                                                                        | —              | X position.                                 |
| `y`              | `number`                                                                                        | —              | Y position.                                 |
| `width`          | `number \| string`                                                                              | —              | Fixed width. Accepts a number or `"100%"`.  |
| `height`         | `number \| string`                                                                              | —              | Fixed height. Accepts a number or `"100%"`. |
| `gap`            | `number`                                                                                        | `0`            | Gap between children.                       |
| `padding`        | `number`                                                                                        | `0`            | Padding on all sides.                       |
| `alignItems`     | `"flex-start" \| "center" \| "flex-end" \| "stretch"`                                           | `"center"`     | Cross-axis (horizontal) alignment.          |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | `"flex-start"` | Main-axis (vertical) distribution.          |

---

## HorizontalLayoutComponent

Thin wrapper over a `PIXI.Container` with `flexDirection: "row"` preconfigured. Also supports absolute positioning for bars and overlays.

```ts
const row = new HorizontalLayoutComponent({
  width: "100%",
  gap: 10,
  justifyContent: "space-between",
});
```

### `HorizontalLayoutComponentPreset`

| Field            | Type                                                                                            | Default        | Description                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------ |
| `x`              | `number`                                                                                        | —              | X position.                                                  |
| `y`              | `number`                                                                                        | —              | Y position.                                                  |
| `width`          | `number \| string`                                                                              | —              | Fixed width. Accepts a number or `"100%"`.                   |
| `height`         | `number \| string`                                                                              | —              | Fixed height. Accepts a number or `"100%"`.                  |
| `gap`            | `number`                                                                                        | `0`            | Gap between children.                                        |
| `padding`        | `number`                                                                                        | `0`            | Padding on all sides.                                        |
| `alignItems`     | `"flex-start" \| "center" \| "flex-end" \| "stretch"`                                           | `"center"`     | Cross-axis (vertical) alignment.                             |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | `"flex-start"` | Main-axis (horizontal) distribution.                         |
| `position`       | `"absolute" \| "relative"`                                                                      | —              | Positioning mode.                                            |
| `left`           | `number`                                                                                        | —              | Absolute offset from left (requires `position: "absolute"`). |
| `top`            | `number`                                                                                        | —              | Absolute offset from top.                                    |
| `right`          | `number`                                                                                        | —              | Absolute offset from right.                                  |
| `bottom`         | `number`                                                                                        | —              | Absolute offset from bottom.                                 |

---

## GridLayoutComponent

**Flex-based grid approximation.** Yoga (the layout engine behind `@pixi/layout`) doesn't implement CSS Grid, so this component is a thin preset over a `flexDirection: "row"` + `flexWrap: "wrap"` flex container. Children with explicit dimensions wrap to a new row when the cumulative width exceeds the container — producing N×M-looking grids without an actual grid algorithm. There is no track sizing, row/column spans, named lines, or dense packing. Use it when you want grid-like wrapping; reach for `VerticalLayoutComponent` / `HorizontalLayoutComponent` for plain stacks.

```ts
const grid = new GridLayoutComponent({
  width: 320,
  gap: 8,
  padding: 12,
  alignItems: "center",
  justifyContent: "flex-start",
});
for (const child of items) grid.addChild(child);
```

### `GridLayoutComponentPreset`

| Field            | Type                                                                                            | Default        | Description                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`              | `number`                                                                                        | —              | X position.                                                                                                                                     |
| `y`              | `number`                                                                                        | —              | Y position.                                                                                                                                     |
| `width`          | `number \| string`                                                                              | —              | Fixed width. Accepts a number or a percentage string like `"100%"`.                                                                             |
| `height`         | `number \| string`                                                                              | —              | Fixed height. Accepts a number or `"100%"`. Usually omitted so the grid grows to fit its rows.                                                  |
| `gap`            | `number`                                                                                        | `0`            | Gap between children on both axes. Overridden per-axis by `rowGap` / `columnGap`.                                                               |
| `rowGap`         | `number`                                                                                        | —              | Vertical gap between rows. Falls back to `gap` when omitted.                                                                                    |
| `columnGap`      | `number`                                                                                        | —              | Horizontal gap between columns. Falls back to `gap` when omitted.                                                                               |
| `padding`        | `number`                                                                                        | `0`            | Padding on all sides.                                                                                                                           |
| `alignItems`     | `"flex-start" \| "center" \| "flex-end" \| "stretch"`                                           | `"center"`     | Cross-axis (vertical) alignment of items within a row. Only visible when items in the row vary in height — uniform rows have no spare room.     |
| `alignContent`   | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "space-between" \| "space-around"`      | `"flex-start"` | Distribution of whole rows along the cross axis when there's spare vertical space (i.e. when the grid has a fixed height taller than its rows). |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | `"flex-start"` | Main-axis (horizontal) distribution within each row.                                                                                            |
| `flexWrap`       | `"wrap" \| "nowrap" \| "wrap-reverse"`                                                          | `"wrap"`       | Wrapping behaviour. Wrapping is what makes this act as a grid; `"nowrap"` forces a single row and `"wrap-reverse"` stacks rows bottom-up.       |

Use symmetric `gap` for tidy grids; fall back to `rowGap` + `columnGap` when rows and columns need different spacing.

### Notes

- Children participate in the layout via their own `.layout` (`width` / `height`). Pixi children added without a `.layout` aren't laid out by Yoga and won't take up a grid cell — useful for absolutely-positioned overlays or debug outlines.
- The grid's height is determined by Yoga _after_ a layout pass. If you need to react to it (e.g. to draw an outline that matches the rendered size), subscribe to the `"layout"` event on the grid container and read `grid.layout.computedLayout.width` / `.height`.

---

## FullscreenLayoutComponent

Layout container whose `@pixi/layout` box tracks the app's canvas
dimensions via `AppEvents.onResize`. Useful as a layout root for HUD
widgets created outside the `ViewFactory` lifecycle (debug overlays,
app-level panels, etc.). Unlike the flex containers above, this takes
no preset — it resolves its size from the app itself.

```ts
import { FullscreenLayoutComponent, IApp, AppEvents } from "@gamebyte/gamelabsjs";

// In app or a container that has diContainer access:
const app = diContainer.getInstance(IApp);
const events = diContainer.getInstance(AppEvents);
const overlay = new FullscreenLayoutComponent(app, events);
parent.addChild(overlay);
// Merge in any extra layout rules as needed:
overlay.layout = { ...overlay.layout, flexDirection: "column", gap: 12 };
```

The container unsubscribes from `AppEvents.onResize` automatically in
its `destroy()`.

---

## JSON preset pattern

Most components expose a matching `parse<Name>Preset(json: string)` helper that parses a JSON string into the preset type. This lets you store component configuration as a `Text` asset in a module's `AssetRequestList` and apply per-app overrides before `initialize()`:

```ts
// In a ModuleBinding:
this._assetRequestList.addRequest(
  new AssetRequest(AssetTypes.Text, MyAssetIds.MyBgPreset, "", '{"bgTextureId":"MyApp.Background","overlayAlpha":0.18}'),
);

// In a View:
const json = this.assetLoader.getAsset<string>(MyAssetIds.MyBgPreset) ?? "{}";
const bg = new BackgroundComponent(parseBackgroundComponentPreset(json));
bg.resolveAssets(this.assetLoader);
```

Use `UIUtils.updateFields(base, overrides)` to tweak individual fields without rewriting the full JSON:

```ts
const updated = UIUtils.updateFields(originalJson, '{"overlayAlpha":0.3}');
```

### Themed components do **not** use JSON presets

`ButtonComponent`, `SliderComponent`, `RadioButtonComponent`, `RadioButtonGroupComponent`, `ToggleComponent`, and `BackgroundComponent` are themed via the framework's `StyleManager` instead of JSON presets — there is no `parse*Preset` helper for any of them. To re-theme:

- **App-wide retheming** — apps call `styleManager.modify(UIComponentsStyleIds.Button, { idle: { color: 0x88aaff } })` once at boot. Every component that resolves from this id picks up the change. The same applies to `UIComponentsStyleIds.Slider`, `.RadioButton`, `.Toggle`, and `.Background`.
- **Per-component override** — the call site passes a deep-merge override to `styleManager.resolve(UIComponentsStyleIds.<Id>, { … })` and forwards the resolved style to the constructor. See the component sections above for the canonical pattern.

The framework default styles and asset requests are both contributed by `UIComponentsBinding`, so adding the binding once gets you fully-textured `Button` / `Slider` / `RadioButton` / `Toggle` / `Background` components without supplying any art.
