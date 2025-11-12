Oracle of Suits — launcher and games

Overview

This workspace contains a webcam-based launcher that detects card suits (MediaPipe Tasks) and routes to one of three p5.js games. The modernized code lives under `src/` and is served with Vite; static assets are under `public/`.

Structure (key paths)

- src/
  - launcher/
    - index.html, main.js — object detection + routing UI
  - games/
    - crossbow/ — Crossbow game (p5)
    - fingerpaint/ — FingerPaint game (p5)
    - carpioche/ — Card physics game (p5)
  - config/
    - routes.js — maps detected labels → game URLs
    - thresholds.js — stability thresholds (frames/time/score)
  - lib/mediapipe/
    - hands.js — shared MediaPipe Hands helper for games
- public/
  - images/ … fonts/ … models/ … videos/ … card/ — assets served at root (e.g. `/images/...`, `/models/model.tflite`)

How to run (recommended)

Use Vite for fast dev with multiple pages.

```bash
npm install
npm run dev
```

Then open the “launcher” page from the Vite multi-page index, or navigate directly to:

- Launcher: /src/launcher/index.html
- Games: /src/games/{crossbow|fingerpaint|carpioche}/index.html

Notes

- Asset paths are root-relative and resolved from `public/`. For example:
  - `/images/...`, `/videos/...`, `/fonts/...`, `/models/model.tflite`, `/card/...`
- Label → game routing and thresholds live in `src/config/`. Update there instead of editing the game code.
- Games share a single MediaPipe Hands helper at `src/lib/mediapipe/hands.js`.

Alternative: Live Server

If you prefer Live Server, serve the project root. Root-relative paths (`/images/...`) must exist at the server root. If needed, mirror assets from `public/` to top-level folders (`images/`, `card/`, `fonts/`) or switch to Vite for a simpler setup.

Troubleshooting

- 404 on images/videos/fonts: verify the file exists in `public/` with the same path used by the page (root-relative).
- Webcam blocked: allow camera access in your browser; use HTTPS where required.
- Model not loading: check `/models/model.tflite` exists under `public/models/`.

Next steps

- Optional: replace CDN `<script>` tags for p5/mediapipe with module imports for fully bundled builds.
- Optional: add ESLint + Prettier and a small test harness (e.g., `vitest`) for config utilities.
