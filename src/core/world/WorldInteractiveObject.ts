import * as THREE from "three";
import type { IInputManager } from "../input/IInputManager.js";
import type { IPointerInputHandler } from "../input/IPointerInputHandler.js";

export class WorldInteractiveObject extends THREE.Group {
  //  MEMBERS
  private _isPointerInputHandlerCached: boolean | null = null;
  private _inputManager: IInputManager | null = null;
  private _isPointerListener: boolean = false;

  // Optional pointer handler methods. Subclasses that define all four
  // are automatically registered with the input manager when added to
  // the scene graph. Declared here so the duck-type check below is
  // type-safe (no `as any` needed).
  onPointerDown?(event: PointerEvent, onThisObject: boolean): void;
  onPointerMove?(event: PointerEvent, onThisObject: boolean): void;
  onPointerUp?(event: PointerEvent, onThisObject: boolean): void;
  onPointerCancel?(event: PointerEvent): void;

  //  CONSTRUCTOR
  public constructor() {
    super();
    this.addEventListener("added", this.onAdded);
    this.addEventListener("removed", this.onRemoved);
  }

  //  PROPERTIES
  public get inputManager(): IInputManager | null {
    return this._inputManager;
  }

  public get isPointerInputHandler(): boolean {
    if (this._isPointerInputHandlerCached === null) {
      this._isPointerInputHandlerCached =
        typeof this.onPointerDown === "function" &&
        typeof this.onPointerMove === "function" &&
        typeof this.onPointerUp === "function" &&
        typeof this.onPointerCancel === "function";
    }
    return this._isPointerInputHandlerCached;
  }

  //  METHODS
  protected setInputManager(inputManager: IInputManager | null): void {
    if (this._inputManager === null && inputManager !== null) {
      this._inputManager = inputManager;
      if (this._isPointerListener) {
        this._inputManager.addPointerHandler(this as unknown as IPointerInputHandler);
      }
    }
  }

  public destroy(): void {
    this.removeEventListener("added", this.onAdded);
    this.removeEventListener("removed", this.onRemoved);
  }

  private onAdded(_event: object): void {
    if (this.isPointerInputHandler) {
      this._isPointerListener = true;
      this._inputManager?.addPointerHandler(this as unknown as IPointerInputHandler);
    }
  }

  private onRemoved(_event: object): void {
    if (this._isPointerListener) {
      this._isPointerListener = false;
      this._inputManager?.removePointerHandler(this as unknown as IPointerInputHandler);
    }
  }
}
