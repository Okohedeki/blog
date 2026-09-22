# Portfolio media

## Resonance listening example

The three `resonance-*.mp3` files are the first 20 seconds of Resonance Studio's
supplied-track example, encoded as mono MP3 at 64 kbps. They are synthetic
stock-voice speech, not recordings of a person or a cloned voice.

- Voice 01: Kokoro-82M stock `af_heart`, starting at 0 seconds.
- Voice 02: Kokoro-82M stock `am_michael`, starting at 7 seconds.
- Mix: the sum of those two tracks, each at gain 0.55.

The original project records the generated demo audio and original scripts as
CC0-1.0. Its generation records identify Kokoro-82M v1.0 through kokoro-onnx,
with MIT wrapper code and Apache-2.0 model weights. No model is shipped here.

This sample demonstrates mix/solo listening with supplied tracks. It does not
demonstrate a model separating an unknown recording. The on-page transcript
contains the original scripts for both voices.

`resonance-waveforms.svg` is drawn from 100 measured peak-amplitude windows per
track. It is a time-aligned view of the same 20-second example.

## Screenshots

`resonance-editor.png` shows the current recording-layer editor with its supplied
synthetic example. Captured at 1440 × 960. No private recording is shown.

`resonance-video.png` is retained as an older screenshot so existing public
image links continue to resolve; the current project page uses the newer editor.
