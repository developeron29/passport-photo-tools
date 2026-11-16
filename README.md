# Passport Photo Tools

Free, open-source passport and visa photo tools that run entirely in the browser. Your photo is never uploaded.

**Use them:** https://developeron29.github.io/passport-photo-tools/

| Tool | What it does |
|---|---|
| [Photo checker](https://developeron29.github.io/passport-photo-tools/checker/) | Checks a photo against the rules for 25 documents (DS-160, US passport, UK online passport, Canada, Schengen, India passport and OCI, China visa and more): format, shape, pixels, file size, background, and head size, centring and tilt. |
| [Compressor](https://developeron29.github.io/passport-photo-tools/compress/) | Gets a photo under an upload limit (240 KB for the DS-160, 200 KB for OCI, 20 KB for PAN, or any size) without changing its shape. |
| [4x6 print sheet](https://developeron29.github.io/passport-photo-tools/print-sheet/) | Tiles a 2x2 inch, 35x45 mm or other size photo onto a 4x6 inch sheet (300 DPI) with cut lines. |

## How it works

- Plain HTML and JavaScript modules, no build step. Open `index.html` through any static server.
- Face detection uses [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (`@mediapipe/tasks-vision` 1.0.1 from jsDelivr), run locally in the browser. MediaPipe has no landmark for the top of the head, so it's estimated as `chin - (chin - landmark 10) * 1.47`.
- Background is checked by sampling the strips beside the head for brightness, colour and evenness.
- Document rules are in [`assets/specs.js`](assets/specs.js). They come from official sources tracked by [visaphotos.app](https://visaphotos.app/how-we-check-the-rules), which covers 151 documents with sources and check dates.

All checks are estimates. The issuing authority makes the final decision.

## Need the photo made for you?

[visaphotos.app](https://visaphotos.app/?utm_source=github&utm_medium=referral&utm_campaign=readme) crops, sizes and checks a photo for 151 passport, visa and ID documents. Free preview; the download is paid.

## License

MIT. See [LICENSE](LICENSE).
