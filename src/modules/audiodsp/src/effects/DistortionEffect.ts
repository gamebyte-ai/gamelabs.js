import { DspEffect } from "./DspEffect.js";

export type DistortionEffectOptions = {
  /** Drive amount (higher = more distortion). @default 50 */
  drive?: number;
  /** Dry/wet mix (0–1). @default 0.5 */
  mix?: number;
};

/**
 * Waveshaper distortion effect.
 */
export class DistortionEffect extends DspEffect {
  private _shaper: WaveShaperNode | null = null;
  private _dryGain: GainNode | null = null;
  private _wetGain: GainNode | null = null;
  private readonly _opts: DistortionEffectOptions;

  constructor(opts: DistortionEffectOptions = {}) {
    super();
    this._opts = opts;
  }

  protected _createNodes(ctx: AudioContext): void {
    this._shaper = ctx.createWaveShaper();
    this._shaper.oversample = "4x";
    this.setDrive(this._opts.drive ?? 50);

    this._dryGain = ctx.createGain();
    this._wetGain = ctx.createGain();

    const mix = this._opts.mix ?? 0.5;
    this._dryGain.gain.value = 1 - mix;
    this._wetGain.gain.value = mix;

    this._input!.connect(this._dryGain);
    this._dryGain.connect(this._output!);

    this._input!.connect(this._shaper);
    this._shaper.connect(this._wetGain);
    this._wetGain.connect(this._output!);
  }

  public setDrive(drive: number): void {
    if (!this._shaper) return;
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * drive);
    }
    this._shaper.curve = curve;
  }

  public setMix(mix: number): void {
    const m = Math.max(0, Math.min(1, mix));
    if (this._dryGain) this._dryGain.gain.value = 1 - m;
    if (this._wetGain) this._wetGain.gain.value = m;
  }

  public override destroy(): void {
    this._shaper?.disconnect();
    this._dryGain?.disconnect();
    this._wetGain?.disconnect();
    this._shaper = null;
    this._dryGain = null;
    this._wetGain = null;
    super.destroy();
  }
}
