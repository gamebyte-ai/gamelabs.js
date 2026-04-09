import { DspEffect } from "./DspEffect.js";
import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";

export type ReverbEffectOptions = {
  /** Asset ID of an AudioBuffer impulse response. */
  impulseAssetId?: string;
  /** Dry/wet mix (0 = fully dry, 1 = fully wet). @default 0.5 */
  mix?: number;
};

/**
 * Convolution reverb effect using an impulse response AudioBuffer.
 */
export class ReverbEffect extends DspEffect {
  private _convolver: ConvolverNode | null = null;
  private _dryGain: GainNode | null = null;
  private _wetGain: GainNode | null = null;
  private readonly _opts: ReverbEffectOptions;

  constructor(opts: ReverbEffectOptions = {}) {
    super();
    this._opts = opts;
  }

  protected _createNodes(ctx: AudioContext): void {
    this._convolver = ctx.createConvolver();
    this._dryGain = ctx.createGain();
    this._wetGain = ctx.createGain();

    const mix = this._opts.mix ?? 0.5;
    this._dryGain.gain.value = 1 - mix;
    this._wetGain.gain.value = mix;

    // Dry path
    this._input!.connect(this._dryGain);
    this._dryGain.connect(this._output!);

    // Wet path
    this._input!.connect(this._convolver);
    this._convolver.connect(this._wetGain);
    this._wetGain.connect(this._output!);
  }

  /** Load the impulse response from the asset manager. */
  public resolveAssets(assetManager: IAssetManager): void {
    if (!this._opts.impulseAssetId || !this._convolver) return;
    const buffer = assetManager.getAsset<AudioBuffer>(this._opts.impulseAssetId);
    if (buffer) this._convolver.buffer = buffer;
  }

  /** Set the impulse response directly. */
  public setImpulse(buffer: AudioBuffer): void {
    if (this._convolver) this._convolver.buffer = buffer;
  }

  public setMix(mix: number): void {
    const m = Math.max(0, Math.min(1, mix));
    if (this._dryGain) this._dryGain.gain.value = 1 - m;
    if (this._wetGain) this._wetGain.gain.value = m;
  }

  public override destroy(): void {
    this._convolver?.disconnect();
    this._dryGain?.disconnect();
    this._wetGain?.disconnect();
    this._convolver = null;
    this._dryGain = null;
    this._wetGain = null;
    super.destroy();
  }
}
