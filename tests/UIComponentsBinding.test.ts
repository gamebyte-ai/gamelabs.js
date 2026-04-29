import { describe, expect, it } from "vitest";
import { UIComponentsAssetIds } from "../src/modules/uicomponents/src/UIComponentsAssetIds.js";
import { UIComponentsBinding } from "../src/modules/uicomponents/src/UIComponentsBinding.js";

describe("UIComponentsBinding", () => {
  it("registers the default button + slider skin asset requests in its constructor", () => {
    const binding = new UIComponentsBinding();
    const requests = [...binding.assetRequestList.getRequests()];
    const ids = requests.map((r) => r.id).sort();
    expect(ids).toEqual([
      UIComponentsAssetIds.DefaultButtonDisabled,
      UIComponentsAssetIds.DefaultButtonHover,
      UIComponentsAssetIds.DefaultButtonIdle,
      UIComponentsAssetIds.DefaultButtonPressed,
      UIComponentsAssetIds.DefaultSliderFill,
      UIComponentsAssetIds.DefaultSliderThumb,
      UIComponentsAssetIds.DefaultSliderTrack,
    ]);
    for (const r of requests) {
      expect(r.url).toMatch(/\.png$/);
    }
  });
});
