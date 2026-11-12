# Helios Quantum Gyro-Core — Interactive 3D & Low-Res Gaussian Bloom Experience

A modular ES-module web application centered around a single composite 3D hero object (**Helios Quantum Gyro-Core**) with a custom **low-resolution FBO + two-pass separable 9-tap Gaussian blur bloom post-processing shader**, continuous cursor-anchored zoom (`0.6x` to `4.0x`), scroll-driven Overview travel, and a 4-tab Detail inspection mode (`SURFACE`, `CORE`, `SIGNAL`, `SPECS`).

## Running the Project (No Bundler Required)

Because the project uses standard browser ES modules and a pinned Three.js import map in `index.html`, you can run it directly with any static file server:

```bash
npx serve .
```

Or using Python's built-in HTTP server:

```bash
python3 -m http.server 3000
```

Or using the included Vite development server:

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

## File Structure

- `/index.html` — Semantic markup, pinned Three.js `importmap` (`cdnjs`), Overview sections, Detail tab bar & side panel, and zoom control dock.
- `/css/base.css` — Foundational reset, WCAG AA (`>= 4.5:1`) high-contrast tokens, dynamic accent variables, and additive UI bloom glow classes.
- `/css/layout.css` — Fixed 3D stage, background parallax grid, lens vignette, scroll-driven Overview track, Detail mode overlay, and mobile responsive rules.
- `/css/components.css` — Rotating typographic ring, 3D-projected orbiting labels, animated tab underline pill, side panel stat cards, and bottom segmented mobile tabs.
- `/js/config.js` — All tunables (`ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_DETAIL_THRESHOLD`, `SHARED_EASING`, `BLOOM_CONFIG`, `TABS`, `OVERVIEW_SECTIONS`, `ORBIT_LABELS`) and pure mathematical helpers.
- `/js/scene.js` — Three.js scene with an 8-part composite hero `THREE.Group`, 320 interactive burst particles, cross-fading material states, and a quarter-resolution (`0.25x`) ping-pong FBO + 2-pass separable 9-tap Gaussian blur fragment shader for additive light bleed.
- `/js/camera.js` — Smoothed zoom dolly, cursor-anchored zoom offsets, `ZOOM_DETAIL_THRESHOLD` (`2.0x`) mode switching, per-tab camera angle nudges, and zoom-proportional camera shake & lens vignette.
- `/js/tabs.js` — Detail mode 4-tab controller (`SURFACE`, `CORE`, `SIGNAL`, `SPECS`), animated underline pill, count-up stat readouts, and URL hash synchronization (`#detail/core`).
- `/js/scroll.js` — Scroll-driven section travel in Overview mode, fast-scroll squash-and-stretch velocity tracking, exact scroll position restoration on Detail exit, and 3D-projected orbiting labels.
- `/js/input.js` — Unified pointer, wheel, pinch, drag-inertia, double-click, touch swipe, and keyboard (`+`/`-`, `1`–`4`, `←`/`→`, `Esc`, `Space`, `?`, `B`) handling.
- `/js/main.js` — Application bootstrapper and frame loop.
