# AudioDsp Module

Web Audio DSP effects (filter, reverb, delay, distortion, compressor) composable as a serial chain. Each effect wraps one or more Web Audio nodes behind a uniform `DspEffect` interface; chains route audio from a source through the effect list to a destination AudioNode (e.g. `AudioService.sfxGain`).

## Purpose

- Ready-made effects for common game audio scenarios (underwater, occluded, radio, lo-fi, master compression).
- Uniform `init` / `destroy` / `bypassed` lifecycle on every effect via the `DspEffect` base class.
- A `DspChain` that owns the wiring — add or remove effects at runtime and the chain re-routes itself.
- A `DspPresets` factory for one-call construction of common chains.

## Module shape

Unlike most modules, `audiodsp` has **no `ModuleBinding`**. It's a class library that you construct and own directly — typically built on top of an `AudioContext` you got from `AudioService`. Nothing registers in DI; nothing ticks per-frame; nothing to `addModule(...)`.

## Usage

### Build a chain and insert it on the SFX bus

```ts
import { DspChain, FilterEffect, DelayEffect, AudioService } from "@gamebyte/gamelabsjs";

const audio = resolver.getInstance(AudioService);
const ctx = audio.context;
if (!ctx || !audio.sfxGain) throw new Error("AudioService not yet initialized");

const chain = new DspChain(ctx);
chain.addEffect(new FilterEffect({ type: "lowpass", frequency: 800, Q: 0.7 }));
chain.addEffect(new DelayEffect({ time: 0.25, feedback: 0.4, mix: 0.3 }));

// Insert the chain between AudioService's SFX input and its SFX gain:
// every playSfx() call now flows through the chain.
audio.setSfxDestination(chain.input);
chain.connectTo(audio.sfxGain);
```

Audio flow: `source → audio.sfxInput → chain.input → [effect1 → effect2 → …] → chain.output → audio.sfxGain → masterGain`.

To remove the chain later: `audio.setSfxDestination(null)` (restores the default routing), then `chain.disconnect()` and `chain.destroy()`.

`AudioService.context` is `null` until the browser's autoplay policy unlocks it (typically on the first user gesture) — guard accordingly or build chains lazily on the first `playSfx`.

### Use a preset

```ts
import { DspPresets, AudioService } from "@gamebyte/gamelabsjs";

const audio = resolver.getInstance(AudioService);
if (!audio.context || !audio.sfxGain) return;

const underwater = DspPresets.underwater(audio.context);
audio.setSfxDestination(underwater.input);
underwater.connectTo(audio.sfxGain);
```

### Bypass an effect at runtime

```ts
const filter = new FilterEffect({ type: "lowpass", frequency: 400 });
chain.addEffect(filter);
// later:
filter.bypassed = true;  // dry signal passes through
filter.bypassed = false; // effect re-engages
```

### Add or remove effects at runtime

```ts
const reverb = new ReverbEffect({ impulseAssetId: "MyGame.HallReverb", mix: 0.4 });
chain.addEffect(reverb);   // chain re-wires itself
chain.removeEffect(reverb); // ditto, and reverb.destroy() is called
```

### Tear down

```ts
chain.disconnect();
chain.destroy();
```

`destroy()` cleans up every effect in the chain plus the chain's own input/output nodes.

## Effects

| Effect              | Wraps                                  | Key options                                 |
| ------------------- | -------------------------------------- | ------------------------------------------- |
| `FilterEffect`      | `BiquadFilterNode`                     | `type` (low/high/bandpass/…), `frequency`, `Q`, `gain` |
| `ReverbEffect`      | `ConvolverNode` (+ dry/wet gains)      | `impulseAssetId` (AudioBuffer asset), `mix` |
| `DelayEffect`       | `DelayNode` + feedback / dry / wet     | `time`, `feedback`, `mix`                   |
| `DistortionEffect`  | `WaveShaperNode` + dry / wet           | `drive`, `mix`                              |
| `CompressorEffect`  | `DynamicsCompressorNode`               | `threshold`, `ratio`, `attack`, `release`, `knee` |

All effects extend `DspEffect`. Custom effects subclass `DspEffect` and implement `_createNodes(ctx)`, connecting `_input → [nodes] → _output`.

## Presets

`DspPresets` provides one-call factories that return a configured `DspChain`:

| Preset              | Configuration                                             | Use case                                  |
| ------------------- | --------------------------------------------------------- | ----------------------------------------- |
| `underwater(ctx)`   | low-pass @ 400 Hz, Q 2                                    | submerged / muffled                       |
| `occluded(ctx)`     | low-pass @ 800 Hz, Q 0.7                                  | behind a wall                             |
| `echo(ctx)`         | delay 0.25 s, feedback 0.4, mix 0.3                       | spacey echo                               |
| `radio(ctx)`        | bandpass @ 2 kHz Q 5 → distortion drive 20, mix 0.6       | radio / walkie-talkie                     |
| `lofi(ctx)`         | distortion drive 80, mix 0.8 → high-pass @ 300 Hz         | lo-fi / 8-bit                             |
| `masterCompressor(ctx)` | compressor (threshold −24 dB, ratio 4:1, attack 3 ms, release 250 ms) | master bus glue / clipping prevention |

## Notes & limits

- **Bring your own `AudioContext`.** The chain doesn't create one. Resolve `AudioService` from DI and pass `audio.context` (so suspend/resume and the unlock policy stay in one place).
- **`ReverbEffect` needs an impulse buffer.** Load one via `AssetManager` (`AssetTypes.AudioBuffer`), pass its id as `impulseAssetId`, then call `effect.resolveAssets(assetManager)` after the chain is built — the buffer is not auto-resolved on `init`. Alternatively skip the asset path and call `setImpulse(buffer)` with an `AudioBuffer` you've decoded yourself.
- **No global mix bus.** A chain has one input and one output — apps that want sub-bus topology build that themselves with multiple chains.
- **No automatic teardown.** Chains and effects you create are yours to `destroy()` at the right moment (e.g. when a level ends or the underwater scene exits). Forgotten chains leak Web Audio nodes for the lifetime of the page.
- **Bypass is a node-level switch, not a chain-level mute.** `effect.bypassed = true` routes the dry signal around the effect's internal nodes; the chain's wiring is untouched.

## Exports

- `DspChain` — Serial chain of `DspEffect` instances. API: `addEffect`, `removeEffect`, `connectTo`, `disconnect`, `destroy`, `input`, `output`.
- `DspPresets` — Static factory methods for common chains: `underwater`, `occluded`, `echo`, `radio`, `lofi`, `masterCompressor`.
- `DspEffect` — Abstract base for effects. Override `_createNodes(ctx)` to build the internal graph; subclasses inherit `init`, `destroy`, `bypassed`, `input`, `output`.
- `FilterEffect`, `FilterEffectOptions` — Biquad filter (low-/high-/bandpass etc.).
- `ReverbEffect`, `ReverbEffectOptions` — Convolution reverb backed by an impulse-response asset.
- `DelayEffect`, `DelayEffectOptions` — Delay with feedback and dry/wet mix.
- `DistortionEffect`, `DistortionEffectOptions` — Waveshaper distortion.
- `CompressorEffect`, `CompressorEffectOptions` — Dynamics compressor.
