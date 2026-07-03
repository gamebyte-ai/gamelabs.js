import type { Object3D } from "three";
import { Raycaster, Vector2 } from "three";
import type { IInputManager } from "../input/IInputManager.js";
import type { IPointerInputHandler } from "../input/IPointerInputHandler.js";
import { POINTER_INPUT_LAYER } from "../input/PointerInputLayer.js";
import type { World } from "./World.js";
import { WorldInteractiveObject } from "./WorldInteractiveObject.three.js";
import type { IWorldPointerInput } from "./IWorldPointerInput.js";

/**
 * 3D pointer input subsystem. Registers itself with the base `InputManager`
 * as a single `IPointerInputHandler`. On each pointer event, it raycasts the
 * World scene, finds the nearest `WorldInteractiveObject` that opted in, and
 * dispatches to its own set of handlers — passing `onThisObject=true` to the
 * raycast hit and `false` to everyone else (mirroring the prior contract).
 */
export class WorldPointerInput implements IPointerInputHandler, IWorldPointerInput {
  private readonly _canvas: HTMLCanvasElement;
  private readonly _world: World;
  private readonly _handlers = new Set<IPointerInputHandler>();
  private readonly _raycaster = new Raycaster();
  private readonly _pointerNdc = new Vector2();

  public constructor(canvas: HTMLCanvasElement, world: World, inputManager: IInputManager) {
    this._canvas = canvas;
    this._world = world;
    this._raycaster.layers.set(POINTER_INPUT_LAYER);
    inputManager.addPointerHandler(this);
  }

  public addPointerHandler(handler: IPointerInputHandler): void {
    this._handlers.add(handler);
  }

  public removePointerHandler(handler: IPointerInputHandler): void {
    this._handlers.delete(handler);
  }

  private _getRaycastHandler(event: PointerEvent): (WorldInteractiveObject & IPointerInputHandler) | null {
    const rect = this._canvas.getBoundingClientRect();
    this._pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointerNdc, this._world.activeCamera);
    const intersects = this._raycaster.intersectObjects(this._world.scene.children, true);
    const nearest = intersects[0];
    if (!nearest) return null;
    let obj: Object3D | null = nearest.object;
    while (obj) {
      if (obj instanceof WorldInteractiveObject && obj.isPointerInputHandler) {
        return obj as WorldInteractiveObject & IPointerInputHandler;
      }
      obj = obj.parent;
    }
    return null;
  }

  public onPointerDown(event: PointerEvent, _onThisObject: boolean): void {
    const raycastView = this._getRaycastHandler(event);
    for (const h of this._handlers) h.onPointerDown(event, h === raycastView);
  }

  public onPointerMove(event: PointerEvent, _onThisObject: boolean): void {
    const raycastView = this._getRaycastHandler(event);
    for (const h of this._handlers) h.onPointerMove(event, h === raycastView);
  }

  public onPointerUp(event: PointerEvent, _onThisObject: boolean): void {
    const raycastView = this._getRaycastHandler(event);
    for (const h of this._handlers) h.onPointerUp(event, h === raycastView);
  }

  public onPointerCancel(event: PointerEvent): void {
    for (const h of this._handlers) h.onPointerCancel(event);
  }
}
