import * as PIXI from "pixi.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

export type DropdownItem = {
  /** Unique identifier for this option. Used by `selectedId` / `setSelectedId`. */
  readonly id: string;
  /** Display label shown in the list and (when selected) in the header. */
  readonly label: string;
};

export type DropdownComponentPreset = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Header width. @default 160 */
  width?: number;
  /** Header height. @default 36 */
  height?: number;
  /** Corner radius for the header rectangle. @default 6 */
  radius?: number;
  /** Header fill color. @default 0x1f2937 */
  fillColor?: number;
  /** Header fill alpha. @default 1 */
  fillAlpha?: number;
  /** Header stroke color (also used for the open list's outline). @default 0x475569 */
  strokeColor?: number;
  /** Header stroke width. @default 1 */
  strokeWidth?: number;
  /** Label / item text style overrides merged on top of the defaults. */
  labelStyle?: Partial<PIXI.TextStyleOptions>;
  /** Text shown in the header when nothing is selected. @default "Select…" */
  placeholder?: string;
  /** Items to choose from. May also be set later with `setItems()`. */
  items?: readonly DropdownItem[];
  /** Initial selection. Must match an item id; ignored otherwise. */
  selectedId?: string;
  /** Chevron tint. @default 0xe8eef6 */
  chevronColor?: number;
  /** Per-item row height. @default 32 */
  itemHeight?: number;
  /** Item background color in the resting state. @default 0x111827 */
  itemFillColor?: number;
  /** Item background color when the pointer hovers over the row. @default 0x374151 */
  itemHoverColor?: number;
  /** Item background color for the currently selected row. @default 0x4338ca */
  itemSelectedColor?: number;
  /** Item label color. @default 0xe8eef6 */
  itemTextColor?: number;
  /** Vertical gap between header bottom and list top, in pixels. @default 4 */
  listOffset?: number;
};

/**
 * Parse a JSON string into DropdownComponentPreset.
 */
export function parseDropdownComponentPreset(json: string): DropdownComponentPreset {
  return JSON.parse(json) as DropdownComponentPreset;
}

const DEFAULT_LABEL_STYLE: Partial<PIXI.TextStyleOptions> = {
  fill: 0xe8eef6,
  fontSize: 14,
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  fontWeight: "600",
};

const SCRIM_EXTENT = 1_000_000;
/**
 * zIndex applied to the overlay scrim and list so they paint above
 * any sibling layers when the host root uses `sortableChildren`. A
 * deliberately huge value beats common HUD layer zIndexes (typically
 * single digits).
 */
const OVERLAY_Z_INDEX = 1_000_000;

/**
 * Reusable dropdown / select component.
 *
 * - The header shows the currently selected label (or the placeholder)
 *   plus a chevron that flips when the list is open. Tap the header to
 *   toggle.
 * - When opened, the option list is re-parented to the scene root,
 *   given a high `zIndex`, and the root is forced to
 *   `sortableChildren = true` so the list paints above any HUD layers
 *   or other zIndex-based stacking. A transparent scrim sits between
 *   the list and the rest of the scene to capture taps-outside and
 *   close the dropdown. Each item row uses an explicit hit rect so
 *   the entire row reacts to hover / tap (not just the text), and the
 *   list background absorbs pointer events so taps at the rounded
 *   corners don't fall through to the scrim.
 * - `onChange(cb)` returns an `Unsubscribe` and fires only on user
 *   selections — programmatic `setSelectedId` is silent.
 *
 * Limitations: the list is positioned once at open time using the
 * dropdown's current global transform. Moving the dropdown while open
 * will not reposition the list — close and re-open if the dropdown's
 * world transform changes during interaction. Parent scale / rotation
 * is not propagated to the re-parented list.
 */
export class DropdownComponent extends PIXI.Container {
  private readonly _header: PIXI.Graphics;
  private readonly _label: PIXI.Text;
  private readonly _chevron: PIXI.Graphics;
  private readonly _list: PIXI.Container;
  private readonly _listBg: PIXI.Graphics;
  private readonly _itemRows: PIXI.Container[] = [];
  private readonly _changeListeners = new Set<(id: string, item: DropdownItem) => void>();

  private readonly _width: number;
  private readonly _height: number;
  private readonly _radius: number;
  private readonly _fillColor: number;
  private readonly _fillAlpha: number;
  private readonly _strokeColor: number;
  private readonly _strokeWidth: number;
  private readonly _labelStyle: Partial<PIXI.TextStyleOptions>;
  private readonly _placeholder: string;
  private readonly _chevronColor: number;
  private readonly _itemHeight: number;
  private readonly _itemFillColor: number;
  private readonly _itemHoverColor: number;
  private readonly _itemSelectedColor: number;
  private readonly _itemTextColor: number;
  private readonly _listOffset: number;

  private _items: readonly DropdownItem[];
  private _selectedId: string | null;
  private _isOpen = false;
  private _scrim: PIXI.Graphics | null = null;
  private _listOverlayParent: PIXI.Container | null = null;

  public constructor(opts: DropdownComponentPreset = {}) {
    super();

    this._width = opts.width ?? 160;
    this._height = opts.height ?? 36;
    this._radius = opts.radius ?? 6;
    this._fillColor = opts.fillColor ?? 0x1f2937;
    this._fillAlpha = opts.fillAlpha ?? 1;
    this._strokeColor = opts.strokeColor ?? 0x475569;
    this._strokeWidth = opts.strokeWidth ?? 1;
    this._labelStyle = { ...DEFAULT_LABEL_STYLE, ...opts.labelStyle };
    this._placeholder = opts.placeholder ?? "Select…";
    this._chevronColor = opts.chevronColor ?? 0xe8eef6;
    this._itemHeight = opts.itemHeight ?? 32;
    this._itemFillColor = opts.itemFillColor ?? 0x111827;
    this._itemHoverColor = opts.itemHoverColor ?? 0x374151;
    this._itemSelectedColor = opts.itemSelectedColor ?? 0x4338ca;
    this._itemTextColor = opts.itemTextColor ?? 0xe8eef6;
    this._listOffset = opts.listOffset ?? 4;
    this._items = opts.items ?? [];
    this._selectedId = this._resolveInitialSelection(opts.selectedId, this._items);

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._header = new PIXI.Graphics();
    this._header.eventMode = "static";
    this._header.cursor = "pointer";
    this._header.on("pointertap", () => this.toggle());
    this.addChild(this._header);

    this._label = new PIXI.Text({ text: this._computeHeaderLabel(), style: this._labelStyle });
    this._label.anchor.set(0, 0.5);
    this.addChild(this._label);

    this._chevron = new PIXI.Graphics();
    this._chevron.eventMode = "none";
    this.addChild(this._chevron);

    this._list = new PIXI.Container();
    this._list.visible = false;
    this._list.eventMode = "static";
    this.addChild(this._list);

    this._listBg = new PIXI.Graphics();
    // Absorb pointer events so clicks at the rounded corners (where no
    // item row sits) don't fall through to the scrim and close the
    // dropdown unexpectedly.
    this._listBg.eventMode = "static";
    this._list.addChild(this._listBg);

    this._redrawHeader();
    this._rebuildList();
  }

  /** The id of the selected item, or `null` when nothing is selected. */
  public get selectedId(): string | null {
    return this._selectedId;
  }

  /** The selected item, or `null` when nothing is selected. */
  public get selectedItem(): DropdownItem | null {
    if (this._selectedId === null) return null;
    return this._items.find((it) => it.id === this._selectedId) ?? null;
  }

  /** Whether the option list is currently open. */
  public get isOpen(): boolean {
    return this._isOpen;
  }

  /** Current items list. */
  public get items(): readonly DropdownItem[] {
    return this._items;
  }

  /**
   * Replace the items list. If the previously selected id is no
   * longer present, the selection is cleared (silently — no
   * `onChange` is fired).
   */
  public setItems(items: readonly DropdownItem[]): void {
    this._items = items;
    if (this._selectedId !== null && !items.some((it) => it.id === this._selectedId)) {
      this._selectedId = null;
    }
    this._label.text = this._computeHeaderLabel();
    this._rebuildList();
  }

  /**
   * Set the selection programmatically. Pass `null` to clear. No-op if
   * the id doesn't match any current item. Does NOT fire `onChange`.
   */
  public setSelectedId(id: string | null): void {
    if (id === this._selectedId) return;
    if (id !== null && !this._items.some((it) => it.id === id)) return;
    this._selectedId = id;
    this._label.text = this._computeHeaderLabel();
    this._rebuildList();
  }

  /** Open the option list. No-op if already open or items list is empty. */
  public open(): void {
    if (this._isOpen || this._items.length === 0) return;
    this._isOpen = true;
    this._list.visible = true;
    this._installOverlay();
    this._redrawHeader();
  }

  /** Close the option list. No-op if already closed. */
  public close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._list.visible = false;
    this._removeOverlay();
    this._redrawHeader();
  }

  /** Flip open ↔ closed. */
  public toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  /** Subscribe to user selections. Returns an unsubscribe function. */
  public onChange(cb: (id: string, item: DropdownItem) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public override destroy(opts?: PIXI.DestroyOptions): void {
    if (this._isOpen) this.close();
    this._changeListeners.clear();
    super.destroy(opts);
  }

  // ── Internals ──────────────────────────────────────────────────────

  private _resolveInitialSelection(id: string | undefined, items: readonly DropdownItem[]): string | null {
    if (id === undefined) return null;
    return items.some((it) => it.id === id) ? id : null;
  }

  private _computeHeaderLabel(): string {
    const sel = this.selectedItem;
    return sel ? sel.label : this._placeholder;
  }

  private _redrawHeader(): void {
    const w = this._width;
    const h = this._height;
    const r = this._radius;

    this._header.clear();
    this._header
      .roundRect(0, 0, w, h, r)
      .fill({ color: this._fillColor, alpha: this._fillAlpha })
      .stroke({ color: this._strokeColor, width: this._strokeWidth });

    const labelPad = 12;
    this._label.position.set(labelPad, h / 2);

    const chevronSize = 6;
    const chevronX = w - 12 - chevronSize;
    const chevronY = h / 2;
    this._chevron.clear();
    if (this._isOpen) {
      this._chevron
        .moveTo(0, chevronSize / 2)
        .lineTo(chevronSize, chevronSize / 2)
        .lineTo(chevronSize / 2, -chevronSize / 2)
        .closePath()
        .fill({ color: this._chevronColor });
    } else {
      this._chevron
        .moveTo(0, -chevronSize / 2)
        .lineTo(chevronSize, -chevronSize / 2)
        .lineTo(chevronSize / 2, chevronSize / 2)
        .closePath()
        .fill({ color: this._chevronColor });
    }
    this._chevron.position.set(chevronX, chevronY);
  }

  private _rebuildList(): void {
    for (const row of this._itemRows) {
      row.removeFromParent();
      row.destroy({ children: true });
    }
    this._itemRows.length = 0;

    const w = this._width;
    const ih = this._itemHeight;
    const totalH = this._items.length * ih;

    this._listBg.clear();
    if (totalH > 0) {
      this._listBg
        .roundRect(0, 0, w, totalH, this._radius)
        .fill({ color: this._itemFillColor, alpha: 1 })
        .stroke({ color: this._strokeColor, width: this._strokeWidth });
    }

    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i]!;
      const row = this._createItemRow(item, i);
      this._list.addChild(row);
      this._itemRows.push(row);
    }
  }

  private _createItemRow(item: DropdownItem, index: number): PIXI.Container {
    const w = this._width;
    const ih = this._itemHeight;
    const row = new PIXI.Container();
    row.position.set(0, index * ih);
    row.eventMode = "static";
    row.cursor = "pointer";
    // A bare Container with `eventMode: static` but no `hitArea`
    // defers hit testing to interactive children — the row's bg has
    // `eventMode: none`, so without this only the text bounds catch
    // pointer events. Defining the hit rect here makes the entire
    // row react to hover and tap.
    row.hitArea = new PIXI.Rectangle(0, 0, w, ih);

    const isSelected = this._selectedId === item.id;
    const bg = new PIXI.Graphics();
    bg.eventMode = "none";
    const paintBg = (color: number): void => {
      bg.clear();
      bg.roundRect(0, 0, w, ih, 0).fill({ color, alpha: 1 });
    };
    paintBg(isSelected ? this._itemSelectedColor : this._itemFillColor);
    row.addChild(bg);

    const text = new PIXI.Text({
      text: item.label,
      style: { ...this._labelStyle, fill: this._itemTextColor },
    });
    text.anchor.set(0, 0.5);
    text.position.set(12, ih / 2);
    row.addChild(text);

    row.on("pointerover", () => this._selectedId !== item.id && paintBg(this._itemHoverColor));
    row.on("pointerout", () => paintBg(this._selectedId === item.id ? this._itemSelectedColor : this._itemFillColor));
    row.on("pointertap", () => this._handleItemSelect(item));

    return row;
  }

  private _handleItemSelect(item: DropdownItem): void {
    const changed = this._selectedId !== item.id;
    if (changed) {
      this._selectedId = item.id;
      this._label.text = this._computeHeaderLabel();
      this._rebuildList();
    }
    this.close();
    if (changed) {
      for (const cb of this._changeListeners) cb(item.id, item);
    }
  }

  private _installOverlay(): void {
    const root = this._findRoot();
    if (!root) {
      // Detached from the scene — keep list inline. Caller is
      // responsible for z-order in this fallback path.
      this._list.position.set(0, this._height + this._listOffset);
      return;
    }

    // Position list in root's coords so it sits just below the header.
    const headerBottomGlobal = this.toGlobal({ x: 0, y: this._height + this._listOffset });
    const headerBottomLocal = root.toLocal(headerBottomGlobal);
    this._list.position.set(headerBottomLocal.x, headerBottomLocal.y);

    // Scrim sits behind the list; tapping it (anywhere outside the
    // list's hit bounds) closes the dropdown.
    const scrim = new PIXI.Graphics();
    scrim.rect(-SCRIM_EXTENT, -SCRIM_EXTENT, SCRIM_EXTENT * 2, SCRIM_EXTENT * 2).fill({ color: 0x000000, alpha: 0.001 });
    scrim.eventMode = "static";
    scrim.on("pointertap", () => this.close());

    // Force the root to sort children so our high zIndex actually wins.
    // Hosts that mount UI through HUD layers (or any other zIndex-based
    // stacking) would otherwise paint over our overlay because the
    // re-parented list lands at zIndex 0.
    root.sortableChildren = true;
    scrim.zIndex = OVERLAY_Z_INDEX;
    this._list.zIndex = OVERLAY_Z_INDEX + 1;

    root.addChild(scrim);
    root.addChild(this._list);
    this._scrim = scrim;
    this._listOverlayParent = root;
  }

  private _removeOverlay(): void {
    if (this._scrim) {
      this._scrim.removeFromParent();
      this._scrim.destroy();
      this._scrim = null;
    }
    if (this._listOverlayParent) {
      this._list.position.set(0, this._height + this._listOffset);
      this.addChild(this._list);
      this._listOverlayParent = null;
    }
  }

  private _findRoot(): PIXI.Container | null {
    if (!this.parent) return null;
    let node: PIXI.Container = this.parent;
    while (node.parent) node = node.parent;
    return node;
  }
}
