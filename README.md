# Celestial Canvas

A seeded multiverse that lives in your browser tab. Every seed is a different
universe — different physics, palette, architecture, creatures, and lore — and
every universe ages, remembers you, and can be kept as a postcard.

**Live: [random.ndev.tk](https://random.ndev.tk)** · zero dependencies · no build step · installable PWA · works offline after one visit

## What a universe is made of

Each seed (e.g. `?seed=COSMIC-DRIFT-1234`) deterministically selects:

- **A blueprint** — one of 35 themes (StarForged, Eldritch, GlassySea, NeonCyber…) that sets physics, particle aesthetics, your click powers, ambient events, and which cataclysm ends the world.
- **A background architecture** — one of ~90 generative scenes (auroras, glitch cities, cosmic whales, WebGPU fluids…), chosen by blueprint affinity.
- **6–10 interactive effects** — from a registry of ~100 sub-systems (metro maps with live trains, clockwork orreries, domino runs, reaction-diffusion blooms…), tag-weighted toward the blueprint's mood.
- **A cursor familiar** — a small companion creature (wisp, moth flock, serpent, satellite swarm, jelly, or watching oculus) that follows your cursor, dozes when you idle, and startles when you click. It's named once, remembers your play time across visits, and grows from *hatchling* to *mythic*.
- **Field-guide lore** — a procedural epithet and surveyor's note ("*The Slow-Sinking Shipyard* — Depth is negotiable; bring a flexible ruler.").
- **Travelers** — every few minutes a visitor from a sibling universe drifts through with their own familiar, watches whatever yours watches, greets your cursor, and leaves. Their home seed shows in the HUD — type it in to visit where they live. Each traveler is steered by a tiny recurrent neural network, and the population *genuinely evolves*: visits are scored by an opportunity-fair fitness function, good minds enter a local gene pool (with niching against clone collapse), and most future visitors descend via crossover + mutation from the ones you engaged with. The whole "ML stack" is ~140 weights of dependency-free JS, and the test suite proves the loop converges on a known objective.
- **Mutators, anomalies, and ambient events** — gravity pockets, twin quasars, meteor showers, non-Euclidean shifts…

Universes also **age**: four epochs over ~20 minutes (First Light → The Long
Noon → Amber Hour → The Last Ember), then a heat-death rebirth into a
descendant seed (`COSMIC-DRIFT-1234-II`), so lineages stay shareable.

## Controls

| Input | Effect |
| --- | --- |
| Move | The universe notices; your familiar follows |
| Click / hold | Blueprint-specific powers (left and right differ per seed) |
| Hold left | Charge energy — overload it and the universe ends in a cataclysm |
| Right-click hold | Gravity well |
| `←` `→` | Cycle background architecture |
| `B` | Blend two architectures |
| `J` | Constellation journal (every universe you've visited) |
| `O` | Save a captioned postcard PNG |
| `P` | Screenshot |
| `R` | Record a WebM clip (30 s max) |
| `F` / `T` / `H` / `?` | Favorites / theme editor / HUD / help |
| Touch | Pinch zoom, swipe to cycle, double-tap shockwave, long-press gravity well |

The bottom toolbar gates permissioned inputs: **microphone** (audio-reactive),
**camera**, **speech**, **🎹 MIDI** (knobs warp speed and hue, notes strike
shockwaves), **⏺ record**, and **📤 share**. Gamepads work automatically —
sticks steer, rumble fires on shockwaves and cataclysms. The page also respects
`prefers-reduced-motion`, caps quality on low battery, and holds a screen wake
lock while idle-cycling as a screensaver.

## Running locally

It's a static site — serve the directory and open it:

```sh
python3 -m http.server 8000   # or any static server
```

No bundler, no `node_modules`. Everything is plain ES modules under `js/`,
including the in-house particle engine (`js/particle_engine.js`) — and the
in-house **WebAssembly assembler** (`js/wasm_forge.js`), which emits valid
.wasm binaries byte-by-byte at runtime. It powers the Alchemy architecture —
a ~130,000-cell falling-sand world (sand, water, fire, plant, smoke, lava)
whose chemistry rates are seeded per universe — and the cloth/soft-body
Verlet solver in `js/wasm_physics.js`. In both cases the plain-JS reference
kernel is the spec and the fallback; tests prove WASM and JS identical
(cell-for-cell for alchemy, bit-exact f64 for physics), so the WASM kernel
can take over mid-simulation invisibly.

## Tests

```sh
node tests/run_all.mjs
```

Six zero-dependency suites (Node 18+) guard the content registries, the
particle engine's API surface, and every registered effect — see
[`tests/README.md`](tests/README.md). New effects are picked up automatically;
if it survives the smoke suite, it ships.

## Adding an effect

1. Create `js/your_effect_effects.js` exporting a class with
   `configure(rng, palette)`, `update(mx, my, isClicking)`, and
   `draw(ctx, system)`. Derive **everything** from the seeded `rng` so the
   same seed always looks the same.
2. Register it in `js/effect_registry.js` with theme tags and a draw order.
3. `node tests/run_all.mjs` — the registry smoke suite will exercise it.

## License

[MIT](LICENSE)
