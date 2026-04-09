import { UnsubscribeBag, UIEvents, AudioService, SettingsManager, SettingsEvents, SettingsUIIds, type IInstanceResolver, type IViewController } from "gamelabsjs";
import { GameEvents } from "../events/GameEvents.js";
import { Match3AssetIds } from "../Match3AssetIds.js";
import type { IGameScreenView } from "../views/IGameScreenView.js";

export class GameScreenViewController implements IViewController<IGameScreenView> {
  private _view: IGameScreenView | null = null;
  private _gameEvents: GameEvents | null = null;
  private _uiEvents: UIEvents | null = null;
  private _audioService: AudioService | null = null;
  private _settingsManager: SettingsManager | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._gameEvents = resolver.getInstance(GameEvents);
    this._uiEvents = resolver.getInstance(UIEvents);
    this._audioService = resolver.getInstance(AudioService);
    this._settingsManager = resolver.getInstance(SettingsManager);
  }

  public initialize(view: IGameScreenView): void {
    this._view = view;
    view.setScore(0);

    this._subs.add(this._gameEvents?.onScoreChanged((score) => this._view?.setScore(score)));

    // Play SFX from game events
    this._subs.add(this._gameEvents?.onPlaySfx((sfxId) => {
      this._audioService?.playSfx(sfxId);
    }));

    // Settings button opens settings popup
    this._subs.add(view.onSettingsTapped(() => {
      this._uiEvents?.createPopup(SettingsUIIds.SettingsPopup);
    }));

    // React to settings changes
    const settingsEvents = this._settingsManager?.events;
    if (settingsEvents) {
      this._subs.add(settingsEvents.onValueChanged((name) => {
        this._applyAudioSetting(name);
      }));
    }

    // Apply initial audio settings
    this._applyAllAudioSettings();

    // Start background music
    this._audioService?.playMusic(Match3AssetIds.MusicBg, { fadeInMs: 1000 });

    // Resume audio context on first interaction
    this._audioService?.resume();
  }

  private _applyAudioSetting(name: string): void {
    if (!this._audioService || !this._settingsManager) return;
    switch (name) {
      case "music":
        this._audioService.setMusicMute(!this._settingsManager.getBooleanValue("music"));
        break;
      case "sfx":
        this._audioService.setSfxMute(!this._settingsManager.getBooleanValue("sfx"));
        break;
      case "musicVolume":
        this._audioService.setMusicVolume(this._settingsManager.getNumberValue("musicVolume") / 100);
        break;
      case "sfxVolume":
        this._audioService.setSfxVolume(this._settingsManager.getNumberValue("sfxVolume") / 100);
        break;
    }
  }

  private _applyAllAudioSettings(): void {
    this._applyAudioSetting("music");
    this._applyAudioSetting("sfx");
    this._applyAudioSetting("musicVolume");
    this._applyAudioSetting("sfxVolume");
  }

  public destroy(): void {
    this._audioService?.stopMusic({ fadeOutMs: 300 });
    this._subs.flush();
    this._view = null;
    this._gameEvents = null;
    this._uiEvents = null;
    this._audioService = null;
    this._settingsManager = null;
  }
}
