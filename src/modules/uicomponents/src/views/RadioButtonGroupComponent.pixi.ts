import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import { RadioButtonComponent, type RadioButtonComponentPreset } from "./RadioButtonComponent.pixi.js";

export type RadioButtonGroupItem = {
  /** Unique identifier for this option. Used by `selectedId` / `setSelectedId`. */
  readonly id: string;
  /** Display label rendered next to the radio indicator. */
  readonly label: string;
};

/**
 * Subset of `RadioButtonComponentPreset` that can be forwarded to every
 * child button. The group manages `width` / `height` / `label` /
 * `selected` itself, so those are excluded.
 */
export type RadioButtonGroupButtonStyle = Pick<
  RadioButtonComponentPreset,
  "labelStyle" | "radius" | "innerRadius" | "borderWidth" | "borderColor" | "fillColor" | "selectedColor" | "gap"
>;

export type RadioButtonGroupComponentPreset = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Items the group exposes as radio options. */
  items?: readonly RadioButtonGroupItem[];
  /** Initial selection. Ignored if it doesn't match any item id. */
  selectedId?: string;
  /** Stack direction for the buttons. @default "column" */
  direction?: "column" | "row";
  /** Spacing between adjacent buttons. @default 8 */
  spacing?: number;
  /** Padding around the group. @default 0 */
  padding?: number;
  /**
   * Style overrides applied to every child `RadioButtonComponent`.
   * `label` / `selected` / `width` / `height` are managed by the
   * group and cannot be overridden here.
   */
  buttonStyle?: RadioButtonGroupButtonStyle;
};

/**
 * Parse a JSON string into RadioButtonGroupComponentPreset.
 */
export function parseRadioButtonGroupComponentPreset(json: string): RadioButtonGroupComponentPreset {
  return JSON.parse(json) as RadioButtonGroupComponentPreset;
}

/**
 * Reusable radio-button group.
 *
 * - Renders one `RadioButtonComponent` per item, arranged in a column
 *   or row via `@pixi/layout`'s flex.
 * - Owns the mutual-exclusion model: when a user taps a button the
 *   group records the new selection, calls `setSelected(false)` on
 *   every other button + `setSelected(true)` on the tapped one, and
 *   emits `onChange`.
 * - `setSelectedId(id | null)` is silent — selection updates flow to
 *   the buttons but `onChange` is NOT fired (matches the rest of the
 *   module: programmatic state changes don't notify).
 * - Re-tapping the already-selected button is a no-op (no `onChange`).
 */
export class RadioButtonGroupComponent extends PIXI.Container {
  private readonly _changeListeners = new Set<(id: string, item: RadioButtonGroupItem) => void>();
  private readonly _direction: "column" | "row";
  private readonly _spacing: number;
  private readonly _padding: number;
  private readonly _buttonStyle: RadioButtonGroupButtonStyle;
  private readonly _entries: Array<{
    item: RadioButtonGroupItem;
    button: RadioButtonComponent;
    unsubPress: Unsubscribe;
  }> = [];

  private _items: readonly RadioButtonGroupItem[];
  private _selectedId: string | null;

  public constructor(opts: RadioButtonGroupComponentPreset = {}) {
    super();

    this._direction = opts.direction ?? "column";
    this._spacing = opts.spacing ?? 8;
    this._padding = opts.padding ?? 0;
    this._buttonStyle = opts.buttonStyle ?? {};
    this._items = opts.items ?? [];
    this._selectedId = this._resolveInitialSelection(opts.selectedId, this._items);

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    const layout: Omit<LayoutOptions, "target"> = {
      flexDirection: this._direction,
      gap: this._spacing,
      padding: this._padding,
      alignItems: "flex-start",
      justifyContent: "flex-start",
    };
    this.layout = layout;

    this._rebuildButtons();
  }

  /** The id of the selected item, or `null` when nothing is selected. */
  public get selectedId(): string | null {
    return this._selectedId;
  }

  /** The selected item, or `null` when nothing is selected. */
  public get selectedItem(): RadioButtonGroupItem | null {
    if (this._selectedId === null) return null;
    return this._items.find((it) => it.id === this._selectedId) ?? null;
  }

  /** The current items list. */
  public get items(): readonly RadioButtonGroupItem[] {
    return this._items;
  }

  /**
   * Replace the items list. If the previously selected id is no
   * longer present, the selection is cleared (silently — no
   * `onChange` is fired).
   */
  public setItems(items: readonly RadioButtonGroupItem[]): void {
    this._items = items;
    if (this._selectedId !== null && !items.some((it) => it.id === this._selectedId)) {
      this._selectedId = null;
    }
    this._rebuildButtons();
  }

  /**
   * Set the selection programmatically. Pass `null` to clear. No-op if
   * the id doesn't match any current item. Does NOT fire `onChange`.
   */
  public setSelectedId(id: string | null): void {
    if (id === this._selectedId) return;
    if (id !== null && !this._items.some((it) => it.id === id)) return;
    this._selectedId = id;
    this._syncButtonStates();
  }

  /** Subscribe to user-driven selection changes. Returns an unsubscribe function. */
  public onChange(cb: (id: string, item: RadioButtonGroupItem) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public override destroy(opts?: PIXI.DestroyOptions): void {
    for (const entry of this._entries) entry.unsubPress();
    this._entries.length = 0;
    this._changeListeners.clear();
    super.destroy(opts);
  }

  // ── Internals ──────────────────────────────────────────────────────

  private _resolveInitialSelection(id: string | undefined, items: readonly RadioButtonGroupItem[]): string | null {
    if (id === undefined) return null;
    return items.some((it) => it.id === id) ? id : null;
  }

  private _rebuildButtons(): void {
    for (const entry of this._entries) {
      entry.unsubPress();
      entry.button.removeFromParent();
      entry.button.destroy();
    }
    this._entries.length = 0;

    for (const item of this._items) {
      const button = new RadioButtonComponent({
        ...this._buttonStyle,
        label: item.label,
        selected: item.id === this._selectedId,
      });
      const unsubPress = button.onPress(() => this._handleButtonPressed(item));
      this.addChild(button);
      this._entries.push({ item, button, unsubPress });
    }
  }

  private _handleButtonPressed(item: RadioButtonGroupItem): void {
    if (this._selectedId === item.id) return;
    this._selectedId = item.id;
    this._syncButtonStates();
    for (const cb of this._changeListeners) cb(item.id, item);
  }

  private _syncButtonStates(): void {
    for (const entry of this._entries) {
      entry.button.setSelected(entry.item.id === this._selectedId);
    }
  }
}
