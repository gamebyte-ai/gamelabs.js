import { DspEffect } from "./effects/DspEffect.js";

/**
 * A serial chain of DspEffects.
 *
 * Audio flows: source → chain.input → [effect1 → effect2 → ...] → chain.output → destination.
 *
 * Use `connectTo(destination)` to wire the chain's output to an AudioNode (e.g. AudioManager's sfxGain).
 */
export class DspChain {
  private readonly _ctx: AudioContext;
  private readonly _effects: DspEffect[] = [];
  private readonly _input: GainNode;
  private readonly _output: GainNode;

  constructor(ctx: AudioContext) {
    this._ctx = ctx;
    this._input = ctx.createGain();
    this._output = ctx.createGain();
    this._input.connect(this._output);
  }

  /** The node that audio sources should connect to. */
  public get input(): GainNode {
    return this._input;
  }

  /** The node that carries the processed audio out. */
  public get output(): GainNode {
    return this._output;
  }

  /** Add an effect to the end of the chain. */
  public addEffect(effect: DspEffect): void {
    effect.init(this._ctx);
    this._effects.push(effect);
    this._rewire();
  }

  /** Remove an effect from the chain. */
  public removeEffect(effect: DspEffect): void {
    const idx = this._effects.indexOf(effect);
    if (idx < 0) return;
    this._effects.splice(idx, 1);
    effect.destroy();
    this._rewire();
  }

  /** Connect the chain's output to a destination node. */
  public connectTo(destination: AudioNode): void {
    this._output.connect(destination);
  }

  /** Disconnect the chain's output. */
  public disconnect(): void {
    this._output.disconnect();
  }

  public destroy(): void {
    for (const e of this._effects) e.destroy();
    this._effects.length = 0;
    this._input.disconnect();
    this._output.disconnect();
  }

  private _rewire(): void {
    // Disconnect everything
    this._input.disconnect();
    for (const e of this._effects) {
      e.input.disconnect();
      e.output.disconnect();
    }

    if (this._effects.length === 0) {
      this._input.connect(this._output);
      return;
    }

    // Input → first effect
    this._input.connect(this._effects[0]!.input);

    // Chain effects
    for (let i = 0; i < this._effects.length - 1; i++) {
      this._effects[i]!.output.connect(this._effects[i + 1]!.input);
    }

    // Last effect → output
    this._effects[this._effects.length - 1]!.output.connect(this._output);
  }
}
