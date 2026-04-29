import type { IView, ListItem, Unsubscribe } from "@gamebyte/gamelabsjs";
import type {
  ListSelectionModePreset,
  ListVariantPreset,
} from "../constants/DemoPresets.js";

/**
 * Live preview surface for the List demo. The view owns the
 * `ListComponent` and a small palette of canvas-generated textures
 * used by the `"image"` and `"text+image"` variants. Constructor-only
 * props (variant / selectionMode / itemHeight) rebuild the underlying
 * component; itemCount mutates the existing list via `setItems` so
 * selection bookkeeping flows through.
 */
export interface IListDemoView extends IView {
  setVariant(variant: ListVariantPreset): void;
  setSelectionMode(mode: ListSelectionModePreset): void;
  setItemCount(count: number): void;
  setItemHeight(height: number): void;
  /** Programmatically clear the selection (no-op in `"none"` mode). */
  clearSelection(): void;
  setOutlineVisible(visible: boolean): void;
  /** Fires only on user-driven selection changes (single / multi modes). */
  onChange(
    cb: (selectedIds: readonly string[], selectedItems: readonly ListItem[]) => void,
  ): Unsubscribe;
  /** Fires on every user tap, regardless of selection mode. */
  onItemPress(cb: (id: string, item: ListItem) => void): Unsubscribe;
}
