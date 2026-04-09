import { DspEffect } from "./DspEffect.js";

export type DelayEffectOptions = {
  /** Delay time in seconds. @default 0.3 */
  time?: number;
  /** Feedback amount (0–1). @default 0.4 */
  feedback?: number;
  /** Dry/wet mix (0–1). @default 0.5 */
  mix?: number;
};

/**
 * Delay/echo effect with feedback.
 */
export class DelayEffect extends DspEffect {
  private _delay: DelayNode | null = null;
  private _feedbackGain: GainNode | null = null;
  private _dryGain: GainNode | null = null;
  private _wetGain: GainNode | null = null;
  private readonly _opts: DelayEffectOptions;

  constructor(opts: DelayEffectOptions = {}) {
    super();
    this._opts = opts;
  }

  protected _createNodes(ctx: AudioContext): void {
    this._delay = ctx.createDelay(5);
    this._delay.delayTime.value = this._opts.time ?? 0.3;

    this._feedbackGain = ctx.createGain();
    this._feedbackGain.gain.value = Math.max(0, Math.min(0.95, this._opts.feedback ?? 0.4));

    this._dryGain = ctx.createGain();
    this._wetGain = ctx.createGain();

    const mix = this._opts.mix ?? 0.5;
    this._dryGain.gain.value = 1 - mix;
    this._wetGain.gain.value = mix;

    // Dry path
    this._input!.connect(this._dryGain);
    this._dryGain.connect(this._output!);

    // Wet path with feedback loop
    this._input!.connect(this._delay);
    this._delay.connect(this._feedbackGain);
    this._feedbackGain.connect(this._delay);
    this._delay.connect(this._wetGain);
    this._wetGain.connect(this._output!);
  }

  public setTime(seconds: number, rampMs?: number): void {
    if (!this._delay || !this._ctx) return;
    if (rampMs && rampMs > 0) {
      this._delay.delayTime.linearRampToValueAtTime(seconds, this._ctx.currentTime + rampMs / 1000);
    } else {
      this._delay.delayTime.value = seconds;
    }
  }

  public setFeedback(value: number): void {
    if (this._feedbackGain) this._feedbackGain.gain.value = Math.max(0, Math.min(0.95, value));
  }

  public setMix(mix: number): void {
    const m = Math.max(0, Math.min(1, mix));
    if (this._dryGain) this._dryGain.gain.value = 1 - m;
    if (this._wetGain) this._wetGain.gain.value = m;
  }

  public override destroy(): void {
    this._delay?.disconnect();
    this._feedbackGain?.disconnect();
    this._dryGain?.disconnect();
    this._wetGain?.disconnect();
    this._delay = null;
    this._feedbackGain = null;
    this._dryGain = null;
    this._wetGain = null;
    super.destroy();
  }
}
