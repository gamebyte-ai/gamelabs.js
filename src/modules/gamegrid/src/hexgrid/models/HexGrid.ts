import { BaseGrid } from "../../grid/models/BaseGrid.js";
import type { GridEvents } from "../../grid/events/GridEvents.js";
import type { IGridAllocator } from "../../grid/utilities/IGridAllocator.js";
import type { HexGridPreset } from "./HexGridPreset.js";
import type { IHexGrid } from "./IHexGrid.js";

/**
 * Flat-top hex grid model with odd-q offset coordinates.
 *
 * Carries a {@link HexGridPreset} that bundles cell counts, `hexSize`,
 * and 6-way neighbor topology. Cell content (a stack of items, capacity
 * 1 by default) and back-reference maintenance are inherited from
 * `BaseGrid`, which also owns event emission.
 */
export class HexGrid extends BaseGrid implements IHexGrid {
  public override readonly preset: HexGridPreset;

  public constructor(gridId: number, preset: HexGridPreset, events: GridEvents | null = null, allocator: IGridAllocator | null = null) {
    super(gridId, preset, events, allocator);
    this.preset = preset;
  }
}
