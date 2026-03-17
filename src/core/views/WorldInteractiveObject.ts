import * as THREE from "three";
import type { IInputManager } from "../input/IInputManager.js";
import { IPointerInputHandler } from "../input/IPointerInputHandler.js";

export class WorldInteractiveObject extends THREE.Group {
  //  MEMBERS
  private _isPointerInputHandlerCached: boolean | null = null;
  private _inputManager: IInputManager | null = null;
  private _isPointerListener: boolean = false;

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
        typeof (this as any).onPointerDown === "function" &&
        typeof (this as any).onPointerMove === "function" &&
        typeof (this as any).onPointerUp === "function" &&
        typeof (this as any).onPointerCancel === "function";
    }
    return this._isPointerInputHandlerCached;
  }

  //  METHODS
  protected setInputManager(inputManager: IInputManager | null): void {
    if (this._inputManager===null && inputManager!==null) {
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

  private onAdded(): void {
    if (this.isPointerInputHandler) {
      this._isPointerListener = true;
      this._inputManager?.addPointerHandler(this as unknown as IPointerInputHandler);
    }
  }

  private onRemoved(): void {
    if (this._isPointerListener) {
      this._isPointerListener = false;
      this._inputManager?.removePointerHandler(this as unknown as IPointerInputHandler);
    }
  }
}