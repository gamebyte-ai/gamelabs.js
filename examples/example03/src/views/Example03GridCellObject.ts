import * as THREE from "three";
import { GameGridCellObject, GameGridPreset, POINTER_INPUT_LAYER } from "gamelabsjs";
import type { IInputManager, IPointerInputHandler } from "gamelabsjs";
import type { IGameGridObjectPointerListener } from "gamelabsjs";
import type { Vector3 } from "gamelabsjs";

export class Example03GridCellObject extends GameGridCellObject implements IPointerInputHandler {
  private static readonly COLLIDER_THICKNESS = 0.2;

  public constructor(gridId: number, col: number, row: number, position: Vector3, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, inputManager: IInputManager | null) {
    super(gridId, col, row, position, preset, pointerListener, inputManager);
  }

  protected override createCollider(): void {
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const geom = new THREE.BoxGeometry(this.preset.columnSize * 0.9, Example03GridCellObject.COLLIDER_THICKNESS, this.preset.rowSize * 0.9);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(0, Example03GridCellObject.COLLIDER_THICKNESS * 0.5, 0);
    mesh.layers.enable(POINTER_INPUT_LAYER);
    this.add(mesh);
  }

  public onPointerDown(_event: PointerEvent, _onThisObject: boolean): void {
    if (_onThisObject){
      this._pointerListener.onGridCellPointerDown(this.gridId, this.col, this.row, _event);
    }
  }

  public onPointerMove(_event: PointerEvent, _onThisObject: boolean): void {}

  public onPointerUp(_event: PointerEvent, _onThisObject: boolean): void {}

  public onPointerCancel(_event: PointerEvent): void {}
}
