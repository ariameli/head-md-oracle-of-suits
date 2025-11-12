Project launcher for object-detection → game routing

Overview

This workspace contains a MediaPipe-based object detector (top-level `sketch.js`) that uses your webcam. When specific objects are detected, the launcher will automatically open the corresponding game page:

- diamond → `crossbow-final/index.html`
- heart → `crossbow-final/index.html`
- baton → `carpioche/index.html`

What I changed

- Enhanced `sketch.js` (top-level) to:
  - monitor detected labels
  - debounce/stabilize detection (consecutive frames / time threshold)
  - show a small overlay with the candidate label and a short countdown
  - redirect to the appropriate game folder index page when detection is stable

Files used from game folders

I didn't copy game source files. The launcher redirects the browser to the existing game pages, so the following pages should exist and be self-contained:

- `crossbow-final/index.html` (uses files inside `crossbow-final`)
- `carpioche/index.html` (uses files inside `carpioche`)

If any of those pages reference shared assets or libraries using absolute paths, you may need to adjust the paths or copy assets into the game folders.

How to run locally (quick)

You should serve the project over a local HTTP server so the browser can load the model and webcam properly.

From the project root (macOS / zsh):

```bash
# using Python 3
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser. Allow camera access when prompted.

Notes & next steps

- If you'd rather not navigate away from the launcher page, I can instead load the game's JS into the same p5 canvas (embedding). That requires verifying the game's code (possible namespace collisions) and copying only the required source files.
- If labels in your model use different names (uppercase or localized), tell me the exact label strings and I will update the mapping.
- I can make the required stability thresholds adjustable from a small UI control.

Contact me which behaviour you prefer (redirect vs embed) and if you want different mapping or stability settings.
