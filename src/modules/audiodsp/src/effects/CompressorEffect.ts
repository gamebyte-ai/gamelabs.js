import { DspEffect } from "./DspEffect.js";

export type CompressorEffectOptions = {
  threshold?: number;
  ratio?: number;
  attack?: number;
  release?: number;
  knee?: number;
};

/**
 * Dynamics compressor effect. Prevents clipping when many sounds play simultaneously.
 */
export class CompressorEffect extends DspEffect {
  private _compressor: DynamicsCompressorNode | null = null;
  private readonly _opts: CompressorEffectOptions;

  constructor(opts: CompressorEffectOptions = {}) {
    super();
    this._opts = opts;
  }

  protected _createNodes(ctx: AudioContext): void {
    this._compressor = ctx.createDynamicsCompressor();
    if (this._opts.threshold !== undefined) this._compressor.threshold.value = this._opts.threshold;
    if (this._opts.ratio !== undefined) this._compressor.ratio.value = this._opts.ratio;
    if (this._opts.attack !== undefined) this._compressor.attack.value = this._opts.attack;
    if (this._opts.release !== undefined) this._compressor.release.value = this._opts.release;
    if (this._opts.knee !== undefined) this._compressor.knee.value = this._opts.knee;

    this._input!.connect(this._compressor);
    this._compressor.connect(this._output!);
  }

  public override destroy(): void {
    this._compressor?.disconnect();
    this._compressor = null;
    super.destroy();
  }
}
