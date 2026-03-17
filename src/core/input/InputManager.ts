import * as THREE from "three";
import type { Hud } from "../Hud.js";
import type { World } from "../World.js";
import type { IInputManager } from "./IInputManager.js";
import type { IPointerInputHandler } from "./IPointerInputHandler.js";
import { WorldViewBase } from "../views/WorldViewBase.js";
import { POINTER_INPUT_LAYER } from "./PointerInputLayer.js";

export class InputManager implements IInputManager {
  private readonly _canvas: HTMLCanvasElement;
  private readonly _hud: Hud | null;
  private readonly _world: World | null;
  private readonly _handlers = new Set<IPointerInputHandler>();
  private _listening = false;
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _pointerNdc = new THREE.Vector2();

  public constructor(canvas: HTMLCanvasElement, hud: Hud | null, world: World | null) {
    this._canvas = canvas;
    this._hud = hud;
    this._world = world;
    this._raycaster.layers.set(POINTER_INPUT_LAYER);
  }

  private _getRaycastView(event: PointerEvent): (WorldViewBase & IPointerInputHandler) | null {
    if (!this._world) return null;
    const rect = this._canvas.getBoundingClientRect();
    this._pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointerNdc, this._world.activeCamera);
    const intersects = this._raycaster.intersectObjects(this._world.scene.children, true);
    const nearest = intersects[0];
    if (!nearest) return null;
    let obj: THREE.Object3D | null = nearest.object;
    while (obj) {
      if (obj instanceof WorldViewBase && obj.isPointerInputHandler) {
        return obj as WorldViewBase & IPointerInputHandler;
      }
      obj = obj.parent;
    }
    return null;
  }

  private readonly _onPointerDown = (event: PointerEvent): void => {
    const raycastView = this._getRaycastView(event);
//    if (raycastView) console.log("InputManager raycast nearest view:", raycastView);
    for (const h of this._handlers) h.onPointerDown(event, h === raycastView);
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    const raycastView = this._getRaycastView(event);
    for (const h of this._handlers) h.onPointerMove(event, h === raycastView);
  };

  private readonly _onPointerUp = (event: PointerEvent): void => {
    const raycastView = this._getRaycastView(event);
    for (const h of this._handlers) h.onPointerUp(event, h === raycastView);
  };

  private readonly _onPointerCancel = (event: PointerEvent): void => {
    for (const h of this._handlers) h.onPointerCancel(event);
  };

  public addPointerHandler(handler: IPointerInputHandler): void {
    this._handlers.add(handler);
  }

  public removePointerHandler(handler: IPointerInputHandler): void {
    this._handlers.delete(handler);
  }

  public startListening(): void {
    if (this._listening) return;
    this._canvas.addEventListener("pointerdown", this._onPointerDown);
    this._canvas.addEventListener("pointermove", this._onPointerMove);
    this._canvas.addEventListener("pointerup", this._onPointerUp);
    this._canvas.addEventListener("pointercancel", this._onPointerCancel);
    this._listening = true;
  }

  public stopListening(): void {
    if (!this._listening) return;
    this._canvas.removeEventListener("pointerdown", this._onPointerDown);
    this._canvas.removeEventListener("pointermove", this._onPointerMove);
    this._canvas.removeEventListener("pointerup", this._onPointerUp);
    this._canvas.removeEventListener("pointercancel", this._onPointerCancel);
    this._listening = false;
  }
}
