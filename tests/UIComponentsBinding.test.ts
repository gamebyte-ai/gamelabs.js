import { describe, expect, it } from "vitest";
import { UIComponentsAssetIds } from "../src/modules/uicomponents/src/UIComponentsAssetIds.js";
import { UIComponentsBinding } from "../src/modules/uicomponents/src/UIComponentsBinding.js";

describe("UIComponentsBinding", () => {
  it("registers the four default-button asset requests in its constructor", () => {
    const binding = new UIComponentsBinding();
    const requests = [...binding.assetRequestList.getRequests()];
    const ids = requests.map((r) => r.id).sort();
    expect(ids).toEqual([
      UIComponentsAssetIds.DefaultButtonDisabled,
      UIComponentsAssetIds.DefaultButtonHover,
      UIComponentsAssetIds.DefaultButtonIdle,
      UIComponentsAssetIds.DefaultButtonPressed,
    ]);
    for (const r of requests) {
      expect(r.url).toMatch(/\.png$/);
    }
  });
});
