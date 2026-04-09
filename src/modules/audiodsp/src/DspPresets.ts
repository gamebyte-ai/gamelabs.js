import { DspChain } from "./DspChain.js";
import { FilterEffect } from "./effects/FilterEffect.js";
import { DelayEffect } from "./effects/DelayEffect.js";
import { DistortionEffect } from "./effects/DistortionEffect.js";
import { CompressorEffect } from "./effects/CompressorEffect.js";

/**
 * Factory methods for common DSP chain configurations.
 */
export class DspPresets {
  /** Muffled underwater sound: low-pass filter at 400Hz. */
  static underwater(ctx: AudioContext): DspChain {
    const chain = new DspChain(ctx);
    chain.addEffect(new FilterEffect({ type: "lowpass", frequency: 400, Q: 2 }));
    return chain;
  }

  /** Behind a wall / occluded: low-pass filter at 800Hz with gentle rolloff. */
  static occluded(ctx: AudioContext): DspChain {
    const chain = new DspChain(ctx);
    chain.addEffect(new FilterEffect({ type: "lowpass", frequency: 800, Q: 0.7 }));
    return chain;
  }

  /** Spacey echo: short delay with moderate feedback. */
  static echo(ctx: AudioContext): DspChain {
    const chain = new DspChain(ctx);
    chain.addEffect(new DelayEffect({ time: 0.25, feedback: 0.4, mix: 0.3 }));
    return chain;
  }

  /** Radio / walkie-talkie: bandpass filter + light distortion. */
  static radio(ctx: AudioContext): DspChain {
    const chain = new DspChain(ctx);
    chain.addEffect(new FilterEffect({ type: "bandpass", frequency: 2000, Q: 5 }));
    chain.addEffect(new DistortionEffect({ drive: 20, mix: 0.6 }));
    return chain;
  }

  /** Lo-fi / 8-bit: heavy distortion + high-pass filter to cut bass. */
  static lofi(ctx: AudioContext): DspChain {
    const chain = new DspChain(ctx);
    chain.addEffect(new DistortionEffect({ drive: 80, mix: 0.8 }));
    chain.addEffect(new FilterEffect({ type: "highpass", frequency: 300 }));
    return chain;
  }

  /** Master bus compressor: prevents clipping when many sounds play at once. */
  static masterCompressor(ctx: AudioContext): DspChain {
    const chain = new DspChain(ctx);
    chain.addEffect(new CompressorEffect({ threshold: -24, ratio: 4, attack: 0.003, release: 0.25 }));
    return chain;
  }
}
