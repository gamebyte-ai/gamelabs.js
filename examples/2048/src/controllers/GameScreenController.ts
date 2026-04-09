import { UnsubscribeBag, UIEvents, AudioManager, SettingsManager, SettingsEvents, SettingsUIIds, StorageService, type IInstanceResolver, type IViewController } from "gamelabsjs";
import { GameEvents } from "../events/GameEvents.js";
import { Game2048GridService } from "../utilities/Game2048GridService.js";
import type { IGameScreenView } from "../views/IGameScreenView.js";

const BEST_STORAGE_KEY = "best";

export class GameScreenController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private _gameEvents: GameEvents | null = null;
  private _uiEvents: UIEvents | null = null;
  private _audioManager: AudioManager | null = null;
  private _settingsManager: SettingsManager | null = null;
  private _settingsEvents: SettingsEvents | null = null;
  private _storage: StorageService | null = null;
  private _gridService: Game2048GridService | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._gameEvents = resolver.getInstance(GameEvents);
    this._uiEvents = resolver.getInstance(UIEvents);
    this._audioManager = resolver.getInstance(AudioManager);
    this._settingsManager = resolver.getInstance(SettingsManager);
    this._settingsEvents = resolver.getInstance(SettingsEvents);
    this._storage = resolver.getInstance(StorageService);
    this._gridService = resolver.getInstance(Game2048GridService);
    // SettingsManager pulls StorageService / SettingsEvents from DI itself (it implements IInjectionTarget).
    this._settingsManager.inject(resolver);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;

    // Restore best score from storage and seed the service.
    const storedBest = this._storage?.load<number>(BEST_STORAGE_KEY) ?? 0;
    if (storedBest > 0) this._gridService?.setBest(storedBest);

    view.setScore(this._gridService?.score ?? 0);
    view.setBest(this._gridService?.best ?? 0);
    view.showGameOver(false);

    this._subs.add(this._gameEvents?.onScoreChanged((score) => this._view?.setScore(score)));
    this._subs.add(this._gameEvents?.onBestChanged((best) => {
      this._view?.setBest(best);
      this._storage?.save(BEST_STORAGE_KEY, best);
    }));
    this._subs.add(this._gameEvents?.onGameOver(() => this._view?.showGameOver(true)));

    this._subs.add(this._gameEvents?.onPlaySfx((sfxId) => {
      this._audioManager?.playSfx(sfxId);
    }));

    this._subs.add(view.onSettingsTapped(() => {
      this._uiEvents?.createPopup(SettingsUIIds.SettingsPopup);
    }));

    this._subs.add(view.onRestartTapped(() => {
      this._view?.showGameOver(false);
      this._gameEvents?.emitRestartTapped();
    }));

    // React to settings changes (sfx-only since this example has no music).
    this._subs.add(this._settingsEvents?.onValueChanged((name: string) => {
      this._applyAudioSetting(name);
    }));
    this._applyAllAudioSettings();

    // Resume audio context on first interaction (browser autoplay policy).
    this._audioManager?.resume();
  }

  private _applyAudioSetting(name: string): void {
    if (!this._audioManager || !this._settingsManager) return;
    switch (name) {
      case "sfx":
        this._audioManager.setSfxMute(!this._settingsManager.getBooleanValue("sfx"));
        break;
      case "sfxVolume":
        this._audioManager.setSfxVolume(this._settingsManager.getNumberValue("sfxVolume") / 100);
        break;
    }
  }

  private _applyAllAudioSettings(): void {
    this._applyAudioSetting("sfx");
    this._applyAudioSetting("sfxVolume");
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._gameEvents = null;
    this._uiEvents = null;
    this._audioManager = null;
    this._settingsManager = null;
    this._settingsEvents = null;
    this._storage = null;
    this._gridService = null;
  }
}
