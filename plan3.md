# Implementation Plan: Interactive Control Panel & Polish

## Context
The project has 47 architectures, 22+ cursor effects, 5 input systems (gamepad, mic, speech, camera, multi-tab), WASM physics, WebGPU compute, device sensors, and ambient sound — but zero user-facing controls. The CSS already has styles for `#ui-container`, `#blueprint-display`, `#seed-capture`, etc. that aren't instantiated yet.

## Phase 1: HUD Overlay (show what's happening)
**File: `js/hud.js`** — Singleton that creates and manages the info overlay

- Create `#ui-container` dynamically (CSS already exists for it)
- Show current architecture name (`#blueprint-display`)
- Show seed with click-to-copy (`#seed-capture` with `.copied-animation`)
- Show active mutators (`#mutator-display`)
- Show FPS counter (small, top-right corner)
- Show connected input badges: gamepad icon, mic icon, camera icon, speech icon, tab count
- Auto-hide after 5s of no mouse movement, reappear on mouse move
- Press `H` to toggle HUD visibility

## Phase 2: Input Activation Toolbar
**File: `js/input_toolbar.js`** — Floating toolbar for activating permission-gated inputs

- Row of icon buttons along bottom-center of screen
- Mic toggle: calls `micReactive.activate()` / deactivates, visual feedback (pulsing when active)
- Camera toggle: calls `cameraInput.activate()` / `deactivate()`
- Speech toggle: calls `speechInput.activate()` / `deactivate()`
- Each button shows state: inactive (dim), requesting (pulse), active (bright), unavailable (hidden)
- Buttons only appear if the browser supports the API (feature detect)
- Gamepad auto-detected (show connected indicator, no button needed)
- Minimal design: glass-morphism circles, no text labels, tooltip on hover
- Keyboard shortcuts: `M` for mic, `C` for camera, `S` for speech

## Phase 3: Architecture Selector
**Enhance `js/hud.js`** — Let users browse and switch architectures

- Click architecture name in HUD to open a scrollable palette
- Grid of architecture thumbnails (just colored squares with names for now)
- Click to switch — calls `background.setTheme()` with forced architecture override
- Add `background.forceArchitecture(ArchClass)` method
- Left/Right arrow keys cycle through architectures
- Current architecture highlighted in the palette
- Close palette on Escape or clicking outside

## Phase 4: Adaptive Performance
**File: `js/perf_monitor.js`** — Auto-adjust quality based on FPS

- Track rolling average FPS over last 60 frames
- Quality levels: Ultra (default), High, Medium, Low
- Thresholds: <45fps → drop one level, >55fps sustained → raise one level
- Each level adjusts:
  - Particle counts in architectures (via `system.qualityScale` 0.25–1.0)
  - Background mutator complexity (disable FilmGrain/Noise at Low)
  - Trail particle cap
  - Fluid/cloth grid resolution
- Expose `system.qualityScale` for architectures to read
- Show quality level in HUD (small indicator)

## Phase 5: Multi-Tab Sync Effects
**Enhance existing architectures** to read `system.tabSync`

- Sync background hue across all tabs (leader broadcasts, followers apply)
- Shockwave propagation: clicking in one tab sends a shockwave to adjacent tabs
- Shared particle migration: particles that leave one tab's edge "appear" in another
- Tab count affects visuals: more tabs = more intensity/spread
- Architecture-aware: only architectures that benefit get tab-sync behavior (Cosmic, Flow, Fluid)

## Phase 6: Touch Gestures
**File: `js/touch_gestures.js`** — Mobile-specific interactions

- Two-finger pinch: zoom the architecture (scale transform)
- Two-finger rotate: rotate the canvas
- Swipe left/right: cycle architectures
- Long press: activate gravity well (same as right-click)
- Double-tap: trigger shockwave (same as click)
- Three-finger tap: toggle HUD
- Integrate with existing mouse handlers in background.js

## Implementation Order & Priority
1. **Phase 1+2** (HUD + Input Toolbar) — Highest priority, fills the biggest UX gap
2. **Phase 4** (Adaptive Performance) — Important for heavy architectures
3. **Phase 3** (Architecture Selector) — Fun but not critical
4. **Phase 6** (Touch Gestures) — Important for mobile
5. **Phase 5** (Multi-Tab Sync) — Cool but niche

## New Files
- `js/hud.js` — HUD overlay + architecture selector
- `js/input_toolbar.js` — Permission-gated input toggles
- `js/perf_monitor.js` — Adaptive quality system
- `js/touch_gestures.js` — Mobile gesture handling

## Modified Files
- `js/main.js` — Import and init new systems
- `js/background.js` — Add `forceArchitecture()`, expose `qualityScale`, read tabSync
- `js/simulation.js` — Read `qualityScale` for particle adjustments
- `css/style.css` — Styles for toolbar, palette, FPS counter
- `index.html` — No changes needed (all DOM created dynamically)
