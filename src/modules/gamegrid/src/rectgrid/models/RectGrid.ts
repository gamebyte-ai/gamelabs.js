import { BaseGrid } from "../../grid/models/BaseGrid.js";
import type { GridEvents } from "../../grid/events/GridEvents.js";
import type { IGridAllocator } from "../../grid/utilities/IGridAllocator.js";
import type { IRectGrid } from "./IRectGrid.js";
import type { RectGridPreset } from "./RectGridPreset.js";

/**
 * Rectangular grid model.
 *
 * Carries a {@link RectGridPreset} that bundles cell counts, layout
 * (cell sizes, axes), and 4- or 8-way neighbor topology. Cell content
 * (a stack of items, capacity 1 by default) and back-reference
 * maintenance are inherited from `BaseGrid`, which also owns event
 * emission.
 */
export class RectGrid extends BaseGrid implements IRectGrid {
  public override readonly preset: RectGridPreset;

  public constructor(gridId: number, preset: RectGridPreset, events: GridEvents | null = null, allocator: IGridAllocator | null = null) {
    super(gridId, preset, events, allocator);
    this.preset = preset;
  }
}
