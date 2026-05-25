import * as THREE from "three";
import {
  GridsView,
  World,
  type GridCoord,
  type IInstanceResolver,
  type IPointerInputHandler,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig, type PieceCells, type PieceType } from "../../../BlockPuzzleConfig";
import { GameBoardItem } from "../models/GameBoardItem";
import { GameBoardItemObject } from "./GameBoardItemObject";
import { PieceMeshBuilder } from "./PieceMeshBuilder";
import type { IGameBoardsView, PiecePlacementInfo, PiecePlacementPredicate } from "./IGameBoardsView";

/**
 * Bookkeeping for an in-flight drag. The view is the only thing that
 * mutates `DragSession`; the controller learns about the drop via
 * the `onPiecePlacement` event after pointer-up.
 */
interface DragSession {
  readonly trayCol: number;
  readonly item: GameBoardItem;
  readonly pieceType: PieceType;
  readonly color: number;
  /** Reference to the tray cell's visual `GameBoardItemObject`. It's
   *  hidden during the drag and either restored (invalid drop) or
   *  removed by the framework's `onItemRemoved` path (valid drop). */
  readonly hiddenCellItem: GameBoardItemObject;
  readonly pointerId: number;
  readonly liftedGroup: THREE.Group;
  /** World-space delta from the pointer's ground projection to the
   *  piece's top-left cell (cell (0, 0)) at the moment of grab.
   *  During drag, `pieceTopLeftCellWorld = pointer + pickupOffset` —
   *  this keeps the relative grip the player started with regardless
   *  of how the piece scales between tray and grid sizes. */
  readonly pickupOffset: { readonly x: number; readonly z: number };
}

/**
 * World view for the boards (playing grid + tray) with drag-driven
 * piece placement layered on top of the framework's auto-sync.
 *
 * The lifted piece and the ghost preview are deliberately decoupled:
 *
 * - **Lifted piece** always free-tracks the pointer with the captured
 *   `pickupOffset`. It never snaps to the grid and can hang off the
 *   board edge — what the player sees under their finger is exactly
 *   where they grabbed the piece.
 * - **Ghost preview** uses the **pointer-area gate + clamp-into-
 *   bounds anchor**: when the pointer is inside the grid bbox plus
 *   `drag.pointerAreaMargin` cells, the raw target is computed from
 *   the piece's top-left (round-to-nearest) and then clamped to
 *   `[0, gridCols - pieceCols]` / `[0, gridRows - pieceRows]` so the
 *   whole footprint fits in bounds. After the clamp, validity is
 *   pure occupancy — the clamp gives the ghost a magnetic-to-edges
 *   feel (large pieces stick to the nearest valid corner regardless
 *   of which part of the piece was grabbed).
 *
 * Drop:
 * - Ghost visible (pointer in area + cells empty) → commit at the
 *   clamped anchor.
 * - Otherwise → snap the piece back to its tray slot.
 *
 * Pipeline on pointer-down:
 * 1. Raycast against every visible tray piece's blocks.
 * 2. If a piece is hit, hide its cell-item visual and build a
 *    lifted visual at grid scale inside the drag root.
 * 3. Capture `pickupOffset = topLeftCellWorld - pointerWorld` for
 *    free-tracking throughout the drag.
 *
 * Pipeline on pointer-move / pointer-up:
 * 1. Lifted piece position = pointer + pickupOffset (always free).
 * 2. Ghost target = {@link _computeAnchorAt}(ground); the ghost
 *    renders only when the predicate accepts the clamped footprint.
 * 3. On pointer-up: clamped anchor + accepting predicate → emit
 *    `onPiecePlacement`; otherwise → snap back to tray.
 */
export class GameBoardsView extends GridsView implements IGameBoardsView, IPointerInputHandler {
  private _world: World | null = null;
  private _config: BlockPuzzleConfig | null = null;

  private _dragRoot: THREE.Group | null = null;
  private _ghostRoot: THREE.Group | null = null;

  private _dragSession: DragSession | null = null;
  private _validityPredicate: PiecePlacementPredicate | null = null;

  private readonly _raycaster = new THREE.Raycaster();
  private readonly _ndc = new THREE.Vector2();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly _groundHit = new THREE.Vector3();
  private readonly _scratchVec = new THREE.Vector3();

  private readonly _placementListeners = new Set<(info: PiecePlacementInfo) => void>();

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._world = resolver.getInstance(World);
    this._config = resolver.getInstance(BlockPuzzleConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this._dragRoot = new THREE.Group();
    this._dragRoot.name = "BlockPuzzle.DragRoot";
    this._dragRoot.visible = false;
    this.add(this._dragRoot);

    this._ghostRoot = new THREE.Group();
    this._ghostRoot.name = "BlockPuzzle.GhostRoot";
    this._ghostRoot.visible = false;
    this.add(this._ghostRoot);
  }

  public setPlacementPredicate(predicate: PiecePlacementPredicate | null): void {
    this._validityPredicate = predicate;
  }

  public onPiecePlacement(callback: (info: PiecePlacementInfo) => void): Unsubscribe {
    this._placementListeners.add(callback);
    return () => {
      this._placementListeners.delete(callback);
    };
  }

  // IPointerInputHandler — the view does its own raycasting against
  // tray-piece meshes; `onThisObject` from the InputManager is unused.

  public onPointerDown(event: PointerEvent, _onThisObject: boolean): void {
    if (this._dragSession !== null) return;
    if (!this._config) return;
    const hit = this._pickTrayPiece(event);
    if (hit === null) return;
    this._beginDragSession(hit.trayCol, hit.cellItem, event);
  }

  public onPointerMove(event: PointerEvent, _onThisObject: boolean): void {
    const session = this._dragSession;
    if (session === null) return;
    if (event.pointerId !== session.pointerId) return;
    const ground = this._projectPointerToGround(event);
    if (ground === null) return;
    this._updateLiftedAt(session, ground);
    this._updateGhostAt(session, this._computeAnchorAt(session, ground));
  }

  public onPointerUp(event: PointerEvent, _onThisObject: boolean): void {
    const session = this._dragSession;
    if (session === null) return;
    if (event.pointerId !== session.pointerId) return;
    const ground = this._projectPointerToGround(event);
    const anchor = ground !== null ? this._computeAnchorAt(session, ground) : null;
    const footprint =
      anchor !== null ? GameBoardsView._footprintFor(anchor.col, anchor.row, session.pieceType.cells) : null;
    const valid = footprint !== null && this._validityPredicate !== null && this._validityPredicate(footprint);
    if (valid && footprint !== null) {
      const info: PiecePlacementInfo = {
        trayCol: session.trayCol,
        item: session.item,
        footprint,
      };
      // Tear down view-side state BEFORE notifying the controller —
      // the controller's commit will fire `onItemRemoved` on the
      // tray item and remove its visual from the cell, which is fine
      // because we already un-parented our lifted visual.
      this._endDragSession(false);
      for (const cb of this._placementListeners) cb(info);
    } else {
      this._endDragSession(true);
    }
  }

  public onPointerCancel(_event: PointerEvent): void {
    if (this._dragSession === null) return;
    this._endDragSession(true);
  }

  public override preDestroy(): void {
    this._placementListeners.clear();
    this._validityPredicate = null;
    if (this._dragSession !== null) this._endDragSession(true);
    if (this._dragRoot !== null) {
      this._dragRoot.removeFromParent();
      this._dragRoot = null;
    }
    if (this._ghostRoot !== null) {
      this._ghostRoot.removeFromParent();
      this._ghostRoot = null;
    }
    this._world = null;
    this._config = null;
    super.preDestroy();
  }

  private _beginDragSession(trayCol: number, cellItem: GameBoardItemObject, event: PointerEvent): void {
    if (!this._config || !this._dragRoot) return;
    const ground = this._projectPointerToGround(event);
    if (ground === null) return;
    const modelItem = GameBoardsView._readModelItem(cellItem);
    if (modelItem === null) {
      // `GameBoardItemObject`'s constructor stamps the back-reference,
      // so a missing modelItem is a structural error.
      throw new Error("GameBoardsView: tray cell item is missing model-item back-reference");
    }

    const pickupOffset = this._capturePickupOffset(cellItem, modelItem.pieceType, ground);

    cellItem.visible = false;

    const liftedGroup = new THREE.Group();
    PieceMeshBuilder.appendBlocks(liftedGroup, modelItem.pieceType.cells, this._config.gridCellSize, modelItem.color, {
      opacity: 1,
      y: 0,
    });
    this._dragRoot.add(liftedGroup);
    this._dragRoot.visible = true;

    this._dragSession = {
      trayCol,
      item: modelItem,
      pieceType: modelItem.pieceType,
      color: modelItem.color,
      hiddenCellItem: cellItem,
      pointerId: event.pointerId,
      liftedGroup,
      pickupOffset,
    };

    this._updateLiftedAt(this._dragSession, ground);
    this._updateGhostAt(this._dragSession, this._computeAnchorAt(this._dragSession, ground));
  }

  /**
   * Tear-down. `restoreCellItem` controls whether the originating
   * tray-cell visual is un-hidden — `true` for invalid drops (the
   * piece returns to the slot), `false` for valid drops (the
   * controller's commit removes it via `onItemRemoved`).
   */
  private _endDragSession(restoreCellItem: boolean): void {
    const session = this._dragSession;
    if (session === null) return;
    this._dragSession = null;

    if (restoreCellItem) session.hiddenCellItem.visible = true;

    if (this._dragRoot !== null) {
      session.liftedGroup.removeFromParent();
      this._dragRoot.visible = false;
    }
    GameBoardsView._disposeGroupChildren(session.liftedGroup);

    if (this._ghostRoot !== null) {
      GameBoardsView._clearGroup(this._ghostRoot);
      this._ghostRoot.visible = false;
    }
  }

  /**
   * Capture the world-space delta from the pointer to the piece's
   * top-left cell (cell (0, 0)) at grab time.
   *
   * The tray-cell visual centres the piece's bbox on the cell, so
   * cell (0, 0)'s world position is the cell centre minus the
   * bbox-half offset (computed at tray block size).
   */
  private _capturePickupOffset(
    cellItem: GameBoardItemObject,
    pieceType: PieceType,
    ground: { readonly x: number; readonly z: number },
  ): { x: number; z: number } {
    if (!this._config) throw new Error("GameBoardsView: config not injected");
    // The piece's visual is parented to its tray cell object, and the
    // tray cell object sits at the cell centre. So the cell centre
    // world position is the cell-item visual's parent world position.
    cellItem.getWorldPosition(this._scratchVec);
    const cellCenterX = this._scratchVec.x;
    const cellCenterZ = this._scratchVec.z;
    const { width, height } = PieceMeshBuilder.computeBbox(pieceType.cells);
    const trayBlockSize = this._config.trayPieceCellSize;
    const topLeftCellWorldX = cellCenterX - ((width - 1) / 2) * trayBlockSize;
    const topLeftCellWorldZ = cellCenterZ - ((height - 1) / 2) * trayBlockSize;
    return {
      x: topLeftCellWorldX - ground.x,
      z: topLeftCellWorldZ - ground.z,
    };
  }

  /**
   * Position the lifted piece. Free-tracks the pointer with the
   * captured `pickupOffset`: cell (0, 0) lands at
   * `pointer + pickupOffset`, regardless of where the ghost snapped.
   * The piece can extend past the grid edge — what the player sees
   * under their finger is always the same point on the piece they
   * grabbed. The bbox-centred render means we shift the drag root
   * by the half-bbox so cell (0, 0) lands at the desired point.
   */
  private _updateLiftedAt(session: DragSession, ground: { readonly x: number; readonly z: number }): void {
    if (this._dragRoot === null || this._config === null) return;
    const topLeftX = ground.x + session.pickupOffset.x;
    const topLeftZ = ground.z + session.pickupOffset.z;
    const { width, height } = PieceMeshBuilder.computeBbox(session.pieceType.cells);
    const blockSize = this._config.gridCellSize;
    this._dragRoot.position.set(
      topLeftX + ((width - 1) / 2) * blockSize,
      this._config.drag.liftedY,
      topLeftZ + ((height - 1) / 2) * blockSize,
    );
  }

  /**
   * Show the ghost only when the anchor is non-null (pointer over
   * the placement area) AND the predicate accepts the footprint
   * (which after clamping reduces to: every target cell is empty).
   * The lifted piece and the ghost both derive from the same anchor,
   * so they visually align.
   */
  private _updateGhostAt(session: DragSession, anchor: { readonly col: number; readonly row: number } | null): void {
    if (this._ghostRoot === null || this._config === null) return;

    const hideGhost = (): void => {
      if (this._ghostRoot === null) return;
      GameBoardsView._clearGroup(this._ghostRoot);
      this._ghostRoot.visible = false;
    };

    if (anchor === null) {
      hideGhost();
      return;
    }
    const footprint = GameBoardsView._footprintFor(anchor.col, anchor.row, session.pieceType.cells);
    const valid = this._validityPredicate !== null && this._validityPredicate(footprint);
    if (!valid) {
      hideGhost();
      return;
    }

    const grid = this.getGridObject(this._config.boardIds.grid);
    if (!grid) {
      hideGhost();
      return;
    }
    GameBoardsView._clearGroup(this._ghostRoot);
    grid.getWorldPosition(this._scratchVec);
    this._ghostRoot.position.set(this._scratchVec.x, this._config.drag.ghostY, this._scratchVec.z);

    const cellSize = this._config.gridCellSize;
    // Build one inset square per footprint cell at the cell's local
    // position on the grid. We bypass `PieceMeshBuilder.appendBlocks`
    // here because the ghost's geometry is per-footprint-cell (already
    // in grid coords), not piece-relative.
    const drawSize = cellSize * PieceMeshBuilder.BLOCK_INSET;
    for (const { col, row } of footprint) {
      const geom = new THREE.PlaneGeometry(drawSize, drawSize);
      const mat = new THREE.MeshBasicMaterial({
        color: session.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: this._config.drag.ghostOpacity,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(col * cellSize, 0, row * cellSize);
      this._ghostRoot.add(mesh);
    }
    this._ghostRoot.visible = true;
  }

  /**
   * Pointer-area gate + clamp-into-bounds anchor.
   *
   * Returns `null` when the pointer (ground projection) sits outside
   * the grid bbox extended by `drag.pointerAreaMargin` cells on
   * every side — that's the "no preview, no commit" zone.
   *
   * Otherwise returns the anchor cell: the raw target from the
   * piece's top-left (round-to-nearest), clamped to
   * `[0, gridCols - pieceCols]` and `[0, gridRows - pieceRows]` so
   * the full footprint always fits inside the grid. The clamp is
   * what gives the piece its magnetic-to-edges feel — pointer near a
   * corner snaps the piece to that corner regardless of which part
   * of the piece was grabbed. After the clamp, occupancy is the
   * only thing the validity predicate has to check.
   */
  private _computeAnchorAt(
    session: DragSession,
    ground: { readonly x: number; readonly z: number },
  ): { col: number; row: number } | null {
    if (!this._config) return null;
    const grid = this.getGridObject(this._config.boardIds.grid);
    if (!grid) return null;
    grid.getWorldPosition(this._scratchVec);
    const cellSize = this._config.gridCellSize;
    const margin = this._config.drag.pointerAreaMargin;

    // Pointer-area gate, in cell units. The grid's visible bbox spans
    // `[-0.5, columnCount - 0.5]` in cell units (cell centres run
    // 0..columnCount-1, each cell is one unit wide); the margin
    // extends that on every side.
    const pointerCol = (ground.x - this._scratchVec.x) / cellSize;
    const pointerRow = (ground.z - this._scratchVec.z) / cellSize;
    if (pointerCol < -0.5 - margin || pointerCol > grid.columnCount - 0.5 + margin) return null;
    if (pointerRow < -0.5 - margin || pointerRow > grid.rowCount - 0.5 + margin) return null;

    // Raw target from the piece's top-left in grid-local cell units,
    // then clamp so the entire footprint stays inside the grid.
    const topLeftX = ground.x + session.pickupOffset.x;
    const topLeftZ = ground.z + session.pickupOffset.z;
    const rawCol = Math.round((topLeftX - this._scratchVec.x) / cellSize);
    const rawRow = Math.round((topLeftZ - this._scratchVec.z) / cellSize);
    const { width: pieceCols, height: pieceRows } = PieceMeshBuilder.computeBbox(session.pieceType.cells);
    const maxAnchorCol = Math.max(0, grid.columnCount - pieceCols);
    const maxAnchorRow = Math.max(0, grid.rowCount - pieceRows);
    const col = Math.max(0, Math.min(maxAnchorCol, rawCol));
    const row = Math.max(0, Math.min(maxAnchorRow, rawRow));
    return { col, row };
  }

  private static _footprintFor(anchorCol: number, anchorRow: number, cells: PieceCells): GridCoord[] {
    const out: GridCoord[] = [];
    for (const [c, r] of cells) {
      out.push({ col: anchorCol + c, row: anchorRow + r });
    }
    return out;
  }

  /**
   * Raycast against every visible tray-cell item's block meshes and
   * return the hit piece (plus its tray column). The piece's model
   * back-reference is recovered later via {@link _readModelItem}.
   */
  private _pickTrayPiece(event: PointerEvent): { readonly trayCol: number; readonly cellItem: GameBoardItemObject } | null {
    if (!this._world || !this._config) return null;
    if (!this._updatePointerNdc(event)) return null;
    const trayObj = this.getGridObject(this._config.boardIds.tray);
    if (!trayObj) return null;

    const meshes: THREE.Mesh[] = [];
    const meshToItem = new Map<THREE.Object3D, { readonly trayCol: number; readonly cellItem: GameBoardItemObject }>();
    for (let col = 0; col < trayObj.columnCount; col++) {
      const cell = trayObj.getCell(col, 0);
      if (!cell?.item) continue;
      if (!cell.item.visible) continue;
      if (!(cell.item instanceof GameBoardItemObject)) continue;
      const ref = { trayCol: col, cellItem: cell.item };
      for (const mesh of cell.item.pickableMeshes) {
        if (mesh instanceof THREE.Mesh) {
          meshes.push(mesh);
          meshToItem.set(mesh, ref);
        }
      }
    }
    if (meshes.length === 0) return null;

    this._raycaster.setFromCamera(this._ndc, this._world.activeCamera);
    const hits = this._raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const hit = hits[0]!.object;
    return meshToItem.get(hit) ?? null;
  }

  private _projectPointerToGround(event: PointerEvent): { readonly x: number; readonly z: number } | null {
    if (!this._world) return null;
    if (!this._updatePointerNdc(event)) return null;
    this._raycaster.setFromCamera(this._ndc, this._world.activeCamera);
    const hit = this._raycaster.ray.intersectPlane(this._groundPlane, this._groundHit);
    if (!hit) return null;
    return { x: this._groundHit.x, z: this._groundHit.z };
  }

  private _updatePointerNdc(event: PointerEvent): boolean {
    if (!this._world) return false;
    const canvas = this._world.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  }

  /**
   * Resolve the model `GameBoardItem` behind a visual cell item. The
   * back-reference is stamped onto `userData` in
   * `GameBoardItemObject`'s constructor so the view can recover the
   * model item without going through DI.
   */
  private static _readModelItem(visual: GameBoardItemObject): GameBoardItem | null {
    const ref = visual.userData["modelItem"];
    return ref instanceof GameBoardItem ? ref : null;
  }

  private static _clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[group.children.length - 1]!;
      group.remove(child);
      GameBoardsView._disposeNode(child);
    }
  }

  private static _disposeGroupChildren(group: THREE.Group): void {
    group.traverse((node) => GameBoardsView._disposeNode(node));
  }

  private static _disposeNode(node: THREE.Object3D): void {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry?.dispose();
    const mat = node.material as THREE.Material | readonly THREE.Material[];
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose();
    } else {
      (mat as THREE.Material).dispose();
    }
  }
}
