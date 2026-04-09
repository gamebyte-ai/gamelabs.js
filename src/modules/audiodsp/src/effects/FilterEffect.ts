import { DspEffect } from "./DspEffect.js";

export type FilterEffectOptions = {
  type?: BiquadFilterType;
  frequency?: number;
  Q?: number;
  gain?: number;
};

/**
 * Biquad filter effect (low-pass, high-pass, bandpass, etc.).
 */
export class FilterEffect extends DspEffect {
  private _filter: BiquadFilterNode | null = null;
  private readonly _opts: FilterEffectOptions;

  constructor(opts: FilterEffectOptions = {}) {
    super();
    this._opts = opts;
  }

  protected _createNodes(ctx: AudioContext): void {
    this._filter = ctx.createBiquadFilter();
    this._filter.type = this._opts.type ?? "lowpass";
    this._filter.frequency.value = this._opts.frequency ?? 1000;
    this._filter.Q.value = this._opts.Q ?? 1;
    if (this._opts.gain !== undefined) this._filter.gain.value = this._opts.gain;
    this._input!.connect(this._filter);
    this._filter.connect(this._output!);
  }

  public setFrequency(value: number, rampMs?: number): void {
    if (!this._filter || !this._ctx) return;
    if (rampMs && rampMs > 0) {
      this._filter.frequency.linearRampToValueAtTime(value, this._ctx.currentTime + rampMs / 1000);
    } else {
      this._filter.frequency.value = value;
    }
  }

  public setQ(value: number): void {
    if (this._filter) this._filter.Q.value = value;
  }

  public setType(type: BiquadFilterType): void {
    if (this._filter) this._filter.type = type;
  }

  public override destroy(): void {
    this._filter?.disconnect();
    this._filter = null;
    super.destroy();
  }
}
