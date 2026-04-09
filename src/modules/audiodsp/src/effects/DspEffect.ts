/**
 * Base class for DSP effects.
 * Each effect wraps one or more Web Audio nodes.
 * Override `_createNodes()` to build the internal graph.
 */
export abstract class DspEffect {
  protected _ctx: AudioContext | null = null;
  protected _input: GainNode | null = null;
  protected _output: GainNode | null = null;
  private _bypassed = false;
  private _bypassGain: GainNode | null = null;

  /** Initialize the effect with an AudioContext. */
  public init(ctx: AudioContext): void {
    this._ctx = ctx;
    this._input = ctx.createGain();
    this._output = ctx.createGain();
    this._bypassGain = ctx.createGain();
    this._bypassGain.gain.value = 0;
    this._input.connect(this._bypassGain);
    this._bypassGain.connect(this._output);
    this._createNodes(ctx);
  }

  /** The node to connect incoming audio to. */
  public get input(): AudioNode {
    return this._input!;
  }

  /** The node to connect outgoing audio from. */
  public get output(): AudioNode {
    return this._output!;
  }

  public get bypassed(): boolean {
    return this._bypassed;
  }

  public set bypassed(value: boolean) {
    this._bypassed = value;
    if (!this._bypassGain) return;
    this._bypassGain.gain.value = value ? 1 : 0;
  }

  /** Override to create the effect's internal audio nodes. Connect _input → [nodes] → _output. */
  protected abstract _createNodes(ctx: AudioContext): void;

  public destroy(): void {
    this._input?.disconnect();
    this._output?.disconnect();
    this._bypassGain?.disconnect();
    this._input = null;
    this._output = null;
    this._bypassGain = null;
    this._ctx = null;
  }
}
