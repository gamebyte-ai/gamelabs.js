import type { IAssetManager } from "../assets/IAssetManager.js";

export type PlaySfxOptions = {
  volume?: number;
  rate?: number;
  loop?: boolean;
};

export type PlayMusicOptions = {
  volume?: number;
  loop?: boolean;
  fadeInMs?: number;
};

export type StopMusicOptions = {
  fadeOutMs?: number;
};

/**
 * Game audio manager built on the Web Audio API.
 *
 * - Plays sound effects (fire-and-forget) and a single music track.
 * - Separate volume controls for master, SFX, and music.
 * - Handles browser autoplay policy via `resume()`.
 * - Auto-pauses on page visibility change.
 */
export class AudioManager {
  private _ctx: AudioContext | null = null;
  private _assetManager: IAssetManager | null = null;

  // Gain nodes
  private _masterGain: GainNode | null = null;
  private _sfxGain: GainNode | null = null;
  private _musicGain: GainNode | null = null;

  // Volume values (0–1)
  private _masterVolume = 1;
  private _sfxVolume = 1;
  private _musicVolume = 1;

  // Mute state
  private _masterMuted = false;
  private _sfxMuted = false;
  private _musicMuted = false;

  // Music state
  private _musicSource: AudioBufferSourceNode | null = null;
  private _musicAssetId: string | null = null;

  // External DSP chain connection points
  private _sfxDestination: AudioNode | null = null;
  private _musicDestination: AudioNode | null = null;

  // Visibility change handler
  private readonly _onVisibility = (): void => {
    if (document.hidden) this.pauseAll();
    else this.resumeAll();
  };

  public initialize(assetManager: IAssetManager): void {
    this._assetManager = assetManager;
    this._ctx = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)();

    this._masterGain = this._ctx.createGain();
    this._masterGain.connect(this._ctx.destination);

    this._sfxGain = this._ctx.createGain();
    this._sfxGain.connect(this._masterGain);

    this._musicGain = this._ctx.createGain();
    this._musicGain.connect(this._masterGain);

    this._sfxDestination = this._sfxGain;
    this._musicDestination = this._musicGain;

    this._applyVolumes();

    document.addEventListener("visibilitychange", this._onVisibility);
  }

  public get context(): AudioContext | null {
    return this._ctx;
  }

  /** The node that SFX sources connect to. DSP chains insert before this. */
  public get sfxInput(): AudioNode | null {
    return this._sfxDestination;
  }

  /** The node that music sources connect to. DSP chains insert before this. */
  public get musicInput(): AudioNode | null {
    return this._musicDestination;
  }

  /**
   * Set a custom destination for SFX (e.g. a DspChain output).
   * The chain's output should connect to `sfxGain`.
   */
  public setSfxDestination(node: AudioNode | null): void {
    this._sfxDestination = node ?? this._sfxGain;
  }

  /**
   * Set a custom destination for music (e.g. a DspChain output).
   * The chain's output should connect to `musicGain`.
   */
  public setMusicDestination(node: AudioNode | null): void {
    this._musicDestination = node ?? this._musicGain;
  }

  public get sfxGain(): GainNode | null {
    return this._sfxGain;
  }

  public get musicGain(): GainNode | null {
    return this._musicGain;
  }

  // ── Playback ──

  public playSfx(assetId: string, opts: PlaySfxOptions = {}): AudioBufferSourceNode | null {
    if (!this._ctx || !this._assetManager || !this._sfxDestination) return null;
    const buffer = this._assetManager.getAsset<AudioBuffer>(assetId);
    if (!buffer) return null;

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop ?? false;
    source.playbackRate.value = opts.rate ?? 1;

    if (opts.volume !== undefined && opts.volume !== 1) {
      const gain = this._ctx.createGain();
      gain.gain.value = opts.volume;
      source.connect(gain);
      gain.connect(this._sfxDestination);
    } else {
      source.connect(this._sfxDestination);
    }

    source.start();
    return source;
  }

  public playMusic(assetId: string, opts: PlayMusicOptions = {}): void {
    if (!this._ctx || !this._assetManager || !this._musicDestination) return;

    // Stop current music
    this._stopMusicImmediate();

    const buffer = this._assetManager.getAsset<AudioBuffer>(assetId);
    if (!buffer) return;

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop ?? true;

    if (opts.volume !== undefined && opts.volume !== 1) {
      const gain = this._ctx.createGain();
      gain.gain.value = opts.volume;
      source.connect(gain);
      gain.connect(this._musicDestination);
    } else {
      source.connect(this._musicDestination);
    }

    if (opts.fadeInMs && opts.fadeInMs > 0) {
      this._musicGain!.gain.setValueAtTime(0, this._ctx.currentTime);
      this._musicGain!.gain.linearRampToValueAtTime(
        this._getEffectiveMusicVolume(),
        this._ctx.currentTime + opts.fadeInMs / 1000
      );
    }

    source.start();
    this._musicSource = source;
    this._musicAssetId = assetId;
  }

  public stopMusic(opts: StopMusicOptions = {}): void {
    if (!this._ctx || !this._musicSource) return;

    if (opts.fadeOutMs && opts.fadeOutMs > 0) {
      const source = this._musicSource;
      this._musicGain!.gain.linearRampToValueAtTime(0, this._ctx.currentTime + opts.fadeOutMs / 1000);
      setTimeout(() => {
        try { source.stop(); } catch { /* already stopped */ }
      }, opts.fadeOutMs);
      this._musicSource = null;
      this._musicAssetId = null;
    } else {
      this._stopMusicImmediate();
    }
  }

  private _stopMusicImmediate(): void {
    if (this._musicSource) {
      try { this._musicSource.stop(); } catch { /* already stopped */ }
      this._musicSource = null;
      this._musicAssetId = null;
    }
  }

  // ── Volume ──

  public setMasterVolume(v: number): void {
    this._masterVolume = Math.max(0, Math.min(1, v));
    this._applyVolumes();
  }

  public setSfxVolume(v: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    this._applyVolumes();
  }

  public setMusicVolume(v: number): void {
    this._musicVolume = Math.max(0, Math.min(1, v));
    this._applyVolumes();
  }

  public getMasterVolume(): number { return this._masterVolume; }
  public getSfxVolume(): number { return this._sfxVolume; }
  public getMusicVolume(): number { return this._musicVolume; }

  // ── Mute ──

  public setMasterMute(muted: boolean): void {
    this._masterMuted = muted;
    this._applyVolumes();
  }

  public setSfxMute(muted: boolean): void {
    this._sfxMuted = muted;
    this._applyVolumes();
  }

  public setMusicMute(muted: boolean): void {
    this._musicMuted = muted;
    this._applyVolumes();
  }

  public isMasterMuted(): boolean { return this._masterMuted; }
  public isSfxMuted(): boolean { return this._sfxMuted; }
  public isMusicMuted(): boolean { return this._musicMuted; }

  // ── Lifecycle ──

  /** Resume the AudioContext (call on first user interaction to handle autoplay policy). */
  public resume(): void {
    if (this._ctx?.state === "suspended") this._ctx.resume();
  }

  public pauseAll(): void {
    if (this._ctx?.state === "running") this._ctx.suspend();
  }

  public resumeAll(): void {
    if (this._ctx?.state === "suspended") this._ctx.resume();
  }

  public destroy(): void {
    document.removeEventListener("visibilitychange", this._onVisibility);
    this._stopMusicImmediate();
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
    this._masterGain = null;
    this._sfxGain = null;
    this._musicGain = null;
    this._sfxDestination = null;
    this._musicDestination = null;
    this._assetManager = null;
  }

  // ── Internal ──

  private _getEffectiveMusicVolume(): number {
    return this._musicMuted ? 0 : this._musicVolume;
  }

  private _applyVolumes(): void {
    if (this._masterGain) {
      this._masterGain.gain.value = this._masterMuted ? 0 : this._masterVolume;
    }
    if (this._sfxGain) {
      this._sfxGain.gain.value = this._sfxMuted ? 0 : this._sfxVolume;
    }
    if (this._musicGain) {
      this._musicGain.gain.value = this._musicMuted ? 0 : this._musicVolume;
    }
  }
}
