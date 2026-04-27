import type { DropdownItem, IView, Unsubscribe } from "@gamebyte/gamelabsjs";

/**
 * Live preview surface for the Dropdown demo. The view owns the
 * `DropdownComponent` instance and rebuilds it whenever a constructor-only
 * prop (width / itemHeight / placeholder) changes; mutable props
 * (items / selection) flow through to the live instance.
 */
export interface IDropdownDemoView extends IView {
  setWidth(width: number): void;
  setItemHeight(height: number): void;
  setPlaceholder(placeholder: string): void;
  setItems(items: readonly DropdownItem[]): void;
  setSelectedId(id: string | null): void;
  /** Programmatically flip the option list open ↔ closed. */
  toggleList(): void;
  /** Toggles the debug outline drawn around the live component's header bounds. */
  setOutlineVisible(visible: boolean): void;
  /** Fires whenever the user picks an option. */
  onChange(cb: (id: string, item: DropdownItem) => void): Unsubscribe;
}
