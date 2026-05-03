import { describe, expect, it } from "vitest";
import { DIContainer } from "../src/core/di/DIContainer.js";
import type { ILogger } from "../src/core/dev/ILogger.js";
import { StyleManager } from "../src/core/styles/StyleManager.js";
import { UIComponentsAssetIds } from "../src/modules/uicomponents/src/UIComponentsAssetIds.js";
import { UIComponentsBinding } from "../src/modules/uicomponents/src/UIComponentsBinding.js";
import {
  UIComponentsStyleIds,
  type BackgroundComponentStyle,
  type ButtonComponentStyle,
  type DropdownComponentStyle,
  type ImageComponentStyle,
  type LabelComponentStyle,
  type ListComponentStyle,
  type RadioButtonComponentStyle,
  type ScrollViewComponentStyle,
  type SliderComponentStyle,
  type ToggleComponentStyle,
} from "../src/modules/uicomponents/src/UIComponentsStyleTypes.js";

const noopLogger: ILogger = {
  log: () => {},
  show: () => {},
};

describe("UIComponentsBinding", () => {
  it("registers the default button + slider + radio + toggle + background + dropdown + list + scrollview skin asset requests in its constructor", () => {
    const binding = new UIComponentsBinding();
    const requests = [...binding.assetRequestList.getRequests()];
    const ids = requests.map((r) => r.id).sort();
    expect(ids).toEqual([
      UIComponentsAssetIds.DefaultBackground,
      UIComponentsAssetIds.DefaultButtonDisabled,
      UIComponentsAssetIds.DefaultButtonHover,
      UIComponentsAssetIds.DefaultButtonIdle,
      UIComponentsAssetIds.DefaultButtonPressed,
      UIComponentsAssetIds.DefaultDropdownChevron,
      UIComponentsAssetIds.DefaultDropdownHeader,
      UIComponentsAssetIds.DefaultDropdownItemHover,
      UIComponentsAssetIds.DefaultDropdownItemIdle,
      UIComponentsAssetIds.DefaultDropdownItemSelected,
      UIComponentsAssetIds.DefaultDropdownList,
      UIComponentsAssetIds.DefaultListItemHover,
      UIComponentsAssetIds.DefaultListItemIdle,
      UIComponentsAssetIds.DefaultListItemSelected,
      UIComponentsAssetIds.DefaultRadioSelected,
      UIComponentsAssetIds.DefaultRadioUnselected,
      UIComponentsAssetIds.DefaultScrollViewThumb,
      UIComponentsAssetIds.DefaultScrollViewTrack,
      UIComponentsAssetIds.DefaultSliderFill,
      UIComponentsAssetIds.DefaultSliderThumb,
      UIComponentsAssetIds.DefaultSliderTrack,
      UIComponentsAssetIds.DefaultToggleThumb,
      UIComponentsAssetIds.DefaultToggleTrackOff,
      UIComponentsAssetIds.DefaultToggleTrackOn,
    ]);
    for (const r of requests) {
      expect(r.url).toMatch(/\.png$/);
    }
  });

  it("configureDI registers ButtonComponent + SliderComponent + RadioButtonComponent + ToggleComponent + BackgroundComponent + DropdownComponent + ListComponent styles on the view DI's StyleManager", () => {
    const binding = new UIComponentsBinding();
    const diContainer = new DIContainer(noopLogger);
    const viewDiContainer = new DIContainer(noopLogger);
    const styleManager = new StyleManager();
    viewDiContainer.bindInstance(StyleManager, styleManager);

    binding.configureDI(diContainer, viewDiContainer);

    // Button style — four pointer-state slots + label.
    const buttonStyle = styleManager.resolve<ButtonComponentStyle>(UIComponentsStyleIds.Button);
    expect(buttonStyle.idle?.textureId).toBe(UIComponentsAssetIds.DefaultButtonIdle);
    expect(buttonStyle.idle?.border).toBe(2);
    expect(buttonStyle.hover?.textureId).toBe(UIComponentsAssetIds.DefaultButtonHover);
    expect(buttonStyle.pressed?.textureId).toBe(UIComponentsAssetIds.DefaultButtonPressed);
    expect(buttonStyle.disabled?.textureId).toBe(UIComponentsAssetIds.DefaultButtonDisabled);
    expect(buttonStyle.label?.fontWeight).toBe("600");

    // Slider style — three slots; track + fill 9-slice, thumb plain.
    const sliderStyle = styleManager.resolve<SliderComponentStyle>(UIComponentsStyleIds.Slider);
    expect(sliderStyle.track?.textureId).toBe(UIComponentsAssetIds.DefaultSliderTrack);
    expect(sliderStyle.track?.border).toBe(2);
    expect(sliderStyle.fill?.textureId).toBe(UIComponentsAssetIds.DefaultSliderFill);
    expect(sliderStyle.fill?.border).toBe(2);
    expect(sliderStyle.thumb?.textureId).toBe(UIComponentsAssetIds.DefaultSliderThumb);
    expect(sliderStyle.thumb?.border).toBe(0);

    // Radio style — two indicator slots + label; both slots plain Sprite (border 0).
    const radioStyle = styleManager.resolve<RadioButtonComponentStyle>(UIComponentsStyleIds.RadioButton);
    expect(radioStyle.unselected?.textureId).toBe(UIComponentsAssetIds.DefaultRadioUnselected);
    expect(radioStyle.unselected?.border).toBe(0);
    expect(radioStyle.selected?.textureId).toBe(UIComponentsAssetIds.DefaultRadioSelected);
    expect(radioStyle.selected?.border).toBe(0);
    expect(radioStyle.label?.fontSize).toBe(14);

    // Toggle style — two track slots (texture swap on value) + thumb.
    // All three plain Sprite — the default-skin track has rounded ends
    // that don't 9-slice cleanly, so the runtime stretches the texture.
    const toggleStyle = styleManager.resolve<ToggleComponentStyle>(UIComponentsStyleIds.Toggle);
    expect(toggleStyle.trackOn?.textureId).toBe(UIComponentsAssetIds.DefaultToggleTrackOn);
    expect(toggleStyle.trackOn?.border).toBe(0);
    expect(toggleStyle.trackOff?.textureId).toBe(UIComponentsAssetIds.DefaultToggleTrackOff);
    expect(toggleStyle.trackOff?.border).toBe(0);
    expect(toggleStyle.thumb?.textureId).toBe(UIComponentsAssetIds.DefaultToggleThumb);
    expect(toggleStyle.thumb?.border).toBe(0);

    // Background style — single bg slot. Component does its own cover-
    // fit math, so border/scale fields are informational only.
    const backgroundStyle = styleManager.resolve<BackgroundComponentStyle>(UIComponentsStyleIds.Background);
    expect(backgroundStyle.bg?.textureId).toBe(UIComponentsAssetIds.DefaultBackground);
    expect(backgroundStyle.bg?.border).toBe(0);

    // Dropdown style — six sprite slots + label. header / list use
    // 9-slice (rounded corners); item rows + chevron are plain Sprites.
    const dropdownStyle = styleManager.resolve<DropdownComponentStyle>(UIComponentsStyleIds.Dropdown);
    expect(dropdownStyle.header?.textureId).toBe(UIComponentsAssetIds.DefaultDropdownHeader);
    expect(dropdownStyle.header?.border).toBe(6);
    expect(dropdownStyle.list?.textureId).toBe(UIComponentsAssetIds.DefaultDropdownList);
    expect(dropdownStyle.list?.border).toBe(6);
    expect(dropdownStyle.itemIdle?.textureId).toBe(UIComponentsAssetIds.DefaultDropdownItemIdle);
    expect(dropdownStyle.itemIdle?.border).toBe(0);
    expect(dropdownStyle.itemHover?.textureId).toBe(UIComponentsAssetIds.DefaultDropdownItemHover);
    expect(dropdownStyle.itemSelected?.textureId).toBe(UIComponentsAssetIds.DefaultDropdownItemSelected);
    expect(dropdownStyle.chevron?.textureId).toBe(UIComponentsAssetIds.DefaultDropdownChevron);
    expect(dropdownStyle.chevron?.border).toBe(0);
    expect(dropdownStyle.label?.fontSize).toBe(14);

    // List style — three row-state slots + label; all plain Sprites.
    const listStyle = styleManager.resolve<ListComponentStyle>(UIComponentsStyleIds.List);
    expect(listStyle.itemIdle?.textureId).toBe(UIComponentsAssetIds.DefaultListItemIdle);
    expect(listStyle.itemIdle?.border).toBe(0);
    expect(listStyle.itemHover?.textureId).toBe(UIComponentsAssetIds.DefaultListItemHover);
    expect(listStyle.itemSelected?.textureId).toBe(UIComponentsAssetIds.DefaultListItemSelected);
    expect(listStyle.label?.fontSize).toBe(14);

    // ScrollView style — track + thumb. Default skin keeps the track
    // invisible (alpha 0) so the legacy "thumb-only" look is preserved;
    // both slots opt into 9-slice border 4 for crisp rounded ends.
    const scrollViewStyle = styleManager.resolve<ScrollViewComponentStyle>(UIComponentsStyleIds.ScrollView);
    expect(scrollViewStyle.track?.textureId).toBe(UIComponentsAssetIds.DefaultScrollViewTrack);
    expect(scrollViewStyle.track?.alpha).toBe(0);
    expect(scrollViewStyle.track?.border).toBe(4);
    expect(scrollViewStyle.thumb?.textureId).toBe(UIComponentsAssetIds.DefaultScrollViewThumb);
    expect(scrollViewStyle.thumb?.alpha).toBe(0.6);
    expect(scrollViewStyle.thumb?.border).toBe(4);

    // Image style — single sprite slot, no framework default texture.
    // The slot only carries cosmetic defaults (tint / alpha) since the
    // texture is per-instance app-supplied content.
    const imageStyle = styleManager.resolve<ImageComponentStyle>(UIComponentsStyleIds.Image);
    expect(imageStyle.image?.textureId).toBeUndefined();
    expect(imageStyle.image?.color).toBe(0xffffff);
    expect(imageStyle.image?.alpha).toBe(1);
    expect(imageStyle.image?.border).toBe(0);

    // Label style — text slot is fully populated with the framework's
    // default font; bg slot is intentionally absent so labels render
    // as bare text by default (apps opt into a badge per-instance).
    const labelStyle = styleManager.resolve<LabelComponentStyle>(UIComponentsStyleIds.Label);
    expect(labelStyle.text?.fontFamily).toBe("system-ui, -apple-system, Segoe UI, Roboto, Arial");
    expect(labelStyle.text?.fontSize).toBe(14);
    expect(labelStyle.text?.fontWeight).toBe("600");
    expect(labelStyle.text?.color).toBe(0xe8eef6);
    expect(labelStyle.text?.alpha).toBe(1);
    expect(labelStyle.bg).toBeUndefined();
  });
});
