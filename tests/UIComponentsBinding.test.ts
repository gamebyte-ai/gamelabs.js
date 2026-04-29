import { describe, expect, it } from "vitest";
import { DIContainer } from "../src/core/di/DIContainer.js";
import type { ILogger } from "../src/core/dev/ILogger.js";
import { StyleManager } from "../src/core/styles/StyleManager.js";
import { UIComponentsAssetIds } from "../src/modules/uicomponents/src/UIComponentsAssetIds.js";
import { UIComponentsBinding } from "../src/modules/uicomponents/src/UIComponentsBinding.js";
import {
  UIComponentsStyleIds,
  type ButtonComponentStyle,
  type RadioButtonComponentStyle,
  type SliderComponentStyle,
  type ToggleComponentStyle,
} from "../src/modules/uicomponents/src/UIComponentsStyleTypes.js";

const noopLogger: ILogger = {
  log: () => {},
  show: () => {},
};

describe("UIComponentsBinding", () => {
  it("registers the default button + slider + radio + toggle skin asset requests in its constructor", () => {
    const binding = new UIComponentsBinding();
    const requests = [...binding.assetRequestList.getRequests()];
    const ids = requests.map((r) => r.id).sort();
    expect(ids).toEqual([
      UIComponentsAssetIds.DefaultButtonDisabled,
      UIComponentsAssetIds.DefaultButtonHover,
      UIComponentsAssetIds.DefaultButtonIdle,
      UIComponentsAssetIds.DefaultButtonPressed,
      UIComponentsAssetIds.DefaultRadioSelected,
      UIComponentsAssetIds.DefaultRadioUnselected,
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

  it("configureDI registers ButtonComponent + SliderComponent + RadioButtonComponent + ToggleComponent styles on the view DI's StyleManager", () => {
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
  });
});
