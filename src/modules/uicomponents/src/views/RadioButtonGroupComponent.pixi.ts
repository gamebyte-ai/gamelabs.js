import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import { RadioButtonComponent } from "./RadioButtonComponent.pixi.js";
import type { RadioButtonComponentStyle } from "../UIComponentsStyleTypes.js";

export type RadioButtonGroupItem = {
  /** Unique identifier for this option. Used by `selectedId` / `setSelectedId`. */
  readonly id: string;
  /** Display label rendered next to the radio indicator. */
  readonly label: string;
};

/**
 * Geometry / content options for a {@link RadioButtonGroupComponent}.
 * Visual styling for the child radios lives on the
 * {@link RadioButtonComponentStyle} passed alongside the asset manager
 * — the group hands that style to every child uniformly.
 */
export type RadioButtonGroupComponentOpts = {
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
   * Outer ring radius forwarded to every child. @default 9
   * (Children render at `2 * radius` square per their own opts.)
   */
  radius?: number;
  /** Gap between indicator and label inside each child. @default 8 */
  gap?: number;
};

/**
 * Reusable radio-button group, themed via the framework's style system.
 *
 * Construction takes an `AssetManager`, a fully-resolved
 * {@link RadioButtonComponentStyle} that the group hands to every child
 * radio, and group geometry / content opts:
 *
 * ```ts
 * const radioStyle = this.styleManager.resolve<RadioButtonComponentStyle>(
 *   UIComponentsStyleIds.RadioButton,
 * );
 * const group = new RadioButtonGroupComponent(this.assetLoader, radioStyle, {
 *   items: [{ id: "easy", label: "Easy" }, { id: "hard", label: "Hard" }],
 *   selectedId: "easy",
 *   direction: "column",
 * });
 * group.onChange((id, item) => console.log("picked:", id));
 * ```
 *
 * - Renders one `RadioButtonComponent` per item, arranged via flex.
 * - Owns the mutual-exclusion model — tapping a button records the new
 *   selection, calls `setSelected(false)` on every other button +
 *   `setSelected(true)` on the tapped one, and fires `onChange`.
 * - `setSelectedId(id | null)` is silent — selection updates flow to
 *   the buttons but `onChange` is not fired (programmatic state changes
 *   don't notify, matching the rest of the module).
 * - Re-tapping the already-selected button is a no-op.
 */
export class RadioButtonGroupComponent extends PIXI.Container {
  private readonly _assetManager: AssetManager;
  private readonly _style: RadioButtonComponentStyle;
  private readonly _changeListeners = new Set<(id: string, item: RadioButtonGroupItem) => void>();
  private readonly _direction: "column" | "row";
  private readonly _spacing: number;
  private readonly _padding: number;
  private readonly _radius: number;
  private readonly _gap: number;
  private readonly _entries: Array<{
    item: RadioButtonGroupItem;
    button: RadioButtonComponent;
    unsubPress: Unsubscribe;
  }> = [];

  private _items: readonly RadioButtonGroupItem[];
  private _selectedId: string | null;

  public constructor(assetManager: AssetManager, style: RadioButtonComponentStyle, opts: RadioButtonGroupComponentOpts = {}) {
    super();

    this._assetManager = assetManager;
    this._style = style;
    this._direction = opts.direction ?? "column";
    this._spacing = opts.spacing ?? 8;
    this._padding = opts.padding ?? 0;
    this._radius = opts.radius ?? 9;
    this._gap = opts.gap ?? 8;
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
      const button = new RadioButtonComponent(this._assetManager, this._style, {
        label: item.label,
        radius: this._radius,
        gap: this._gap,
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
