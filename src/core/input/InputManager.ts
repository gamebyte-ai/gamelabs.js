import * as THREE from "three";
import type { Hud } from "../hud/Hud.js";
import type { World } from "../world/World.js";
import type { IInputManager } from "./IInputManager.js";
import type { IPointerInputHandler } from "./IPointerInputHandler.js";
import { POINTER_INPUT_LAYER } from "./PointerInputLayer.js";
import { WorldInteractiveObject } from "../world/WorldInteractiveObject.js";

export class InputManager implements IInputManager {
  private readonly _canvas: HTMLCanvasElement;
  private readonly _eventTarget: HTMLElement;
  private readonly _hud: Hud | null;
  private readonly _world: World | null;
  private readonly _handlers = new Set<IPointerInputHandler>();
  private _listening = false;
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _pointerNdc = new THREE.Vector2();

  public constructor(canvas: HTMLCanvasElement, hud: Hud | null, world: World | null, eventTarget?: HTMLElement) {
    this._canvas = canvas;
    this._eventTarget = eventTarget ?? canvas;
    this._hud = hud;
    this._world = world;
    this._raycaster.layers.set(POINTER_INPUT_LAYER);
  }

  private _getRaycastHandler(event: PointerEvent): (WorldInteractiveObject & IPointerInputHandler) | null {
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
      if (obj instanceof WorldInteractiveObject && obj.isPointerInputHandler) {
        return obj as WorldInteractiveObject & IPointerInputHandler;
      }
      obj = obj.parent;
    }
    return null;
  }

  /**
   * Check if the pointer event should be handled by the HUD instead of the world.
   * Returns true when the pointer hits an interactive HUD element (button,
   * popup blocker, panel background, etc.).
   */
  private _isHudEvent(event: PointerEvent): boolean {
    if (!this._hud) return false;
    const canvas = this._hud.app.canvas as unknown as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    // Convert client coordinates to Pixi global coordinates (CSS-relative)
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = this._hud.app.renderer.events.rootBoundary.hitTest(x, y);
    return hit !== null && hit !== this._hud.app.stage;
  }

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (this._isHudEvent(event)) return;
    const raycastView = this._getRaycastHandler(event);
    for (const h of this._handlers) h.onPointerDown(event, h === raycastView);
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    if (this._isHudEvent(event)) return;
    const raycastView = this._getRaycastHandler(event);
    for (const h of this._handlers) h.onPointerMove(event, h === raycastView);
  };

  private readonly _onPointerUp = (event: PointerEvent): void => {
    if (this._isHudEvent(event)) return;
    const raycastView = this._getRaycastHandler(event);
    for (const h of this._handlers) h.onPointerUp(event, h === raycastView);
  };

  private readonly _onPointerCancel = (event: PointerEvent): void => {
    if (this._isHudEvent(event)) return;
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
    this._eventTarget.addEventListener("pointerdown", this._onPointerDown);
    this._eventTarget.addEventListener("pointermove", this._onPointerMove);
    this._eventTarget.addEventListener("pointerup", this._onPointerUp);
    this._eventTarget.addEventListener("pointercancel", this._onPointerCancel);
    this._listening = true;
  }

  public stopListening(): void {
    if (!this._listening) return;
    this._eventTarget.removeEventListener("pointerdown", this._onPointerDown);
    this._eventTarget.removeEventListener("pointermove", this._onPointerMove);
    this._eventTarget.removeEventListener("pointerup", this._onPointerUp);
    this._eventTarget.removeEventListener("pointercancel", this._onPointerCancel);
    this._listening = false;
  }
}
