import { UnsubscribeBag, type IInstanceResolver, type IViewController, UpdateManager, GameCameraManager, Orbital3dCameraController } from "@gamebyte/gamelabsjs";
import type { ICubeView } from "../views/ICubeView";
import { GameEvents } from "../events/GameEvents";
import { HelloWorldConfig } from "../HelloWorldConfig";

export class CubeViewController implements IViewController<ICubeView> {
  private _view: ICubeView | null = null;
  private _update: UpdateManager | null = null;
  private _gameEvents: GameEvents | null = null;
  private _cameraManager: GameCameraManager | null = null;
  private _config: HelloWorldConfig | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _rotationEnabled = true;

  public inject(resolver: IInstanceResolver): void {
    this._update = resolver.getInstance(UpdateManager);
    this._gameEvents = resolver.getInstance(GameEvents);
    this._cameraManager = resolver.getInstance(GameCameraManager);
    this._config = resolver.getInstance(HelloWorldConfig);
  }

  public initialize(view: ICubeView): void {
    this._view = view;
    this._subs.add(this._update!.register((dt: number) => this._onUpdate(dt), 0));
    this._subs.add(this._gameEvents!.onChangeCubeColor((hex: number) => this._view?.setColor(hex)));
    this._subs.add(this._gameEvents!.onToggleCubeRotation(() => {
      this._rotationEnabled = !this._rotationEnabled;
    }));
  }

  private _onUpdate(dt: number): void {
    if (!this._rotationEnabled) return;
    this._view?.rotate(dt * 0.6, dt * 0.9);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._update = null;
    this._gameEvents = null;
    this._cameraManager = null;
    this._config = null;
  }
}
