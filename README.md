# ✨ Celestial Canvas

**An interactive, generative cosmic sandbox for your browser.**

Celestial Canvas is a generative art experience where you can create and interact with unique, miniature universes. Each universe is procedurally generated from a shareable seed, complete with its own aesthetic, physical laws, interactive powers, and cosmic events.

Use your mouse as a cosmic force to attract, repel, warp, shatter, and paint the particles that inhabit your canvas. But be careful—pushing the universe too hard will build up energy, leading to a world-ending **Cataclysm** that births a new reality.

---

## 🚀 Features

*   **Procedural Universe Generation:** Every universe is generated from a unique, shareable seed string (e.g., `ASTRAL-WARP-4271`). No two universes are exactly alike.
*   **Deeply Interactive Physics:** Your mouse isn't just a pointer; it's an extension of your will. Left and right clicks unleash unique powers determined by the universe's blueprint.
*   **Immersive Background System:** A dynamic, procedurally generated background with **15 unique visual architectures**, each deeply reactive to mouse interaction, gravity wells, and shockwaves. The background looks dramatically different depending on the universe seed, with a 15% wildcard chance of getting any architecture regardless of blueprint. Architectures include:
    *   🌌 **Cosmic** — Animated starfields with nebula clouds, constellations, and shooting stars
    *   💻 **Digital** — Circuit board nodes with glowing junctions, data packets flowing along right-angle paths, and bright character rain streams
    *   💎 **Geometric** — Rotating crystal shards with mouse repulsion, per-shard glow, gravity well scatter, and shockwave response
    *   🌿 **Organic** — Bioluminescent tendrils and cells with spore particle emission, gravity well flee behavior, and glowing nodes
    *   🌊 **Flow** — Particle streams with persistent glow trails, dramatic spiral vortex on gravity well, per-particle hue shifting, and warp-mode bright core
    *   🎨 **Abstract** — Morphing gradient blobs with glow halos, floating particles, blob-to-blob bridges, and gravity well deformation
    *   📺 **Glitch** — Chromatic aberration (3-channel RGB), scan corruption strips, digital rain bursts, and chaotic gravity well scatter
    *   🧵 **Fabric** — Cloth simulation grid always visible at rest, with ripple wave propagation, glow nodes, and gravity well vortex with spiral arms
    *   🧊 **Voxel** — 3D-style block landscapes with depth shading
    *   🌳 **Fractal** — Recursive branching trees with depth-based color coding, animated growth, tip particles with object pooling, and mouse-responsive bending
    *   🌈 **Aurora** — Northern light curtains with wave physics, 4 seed-driven color palettes, magnetic field mouse disruption, and twinkling background stars
    *   🪲 **Firefly** — Synchronized bioluminescent swarms with 5 formation types (spiral, rings, river, constellation, chaotic), phase coupling, and mouse lantern attraction
    *   🌧️ **Raindrop** — Full weather system with 5 weather types (gentle rain, thunderstorm, neon cyberpunk, golden sun rain, snow), procedural lightning, puddle ripples, and mouse umbrella effect
    *   🔮 **Kaleidoscope** — Symmetric mirrored patterns with variable fold symmetry (3-12), spirograph overlays, trail persistence, and mouse deformation
    *   🏔️ **Terrain** — Parallax procedural landscapes with 5 times of day, multi-octave mountain generation, animated clouds, treelines, and weather effects
*   **Ever-Expanding Universe Engine:** A complex system of interlocking, randomized components ensures immense variety:
    *   🌌 **Blueprints:** Each universe is based on one of **32+** fundamental themes. Existing blueprints are now joined by new ones like `StellarNursery`, `AbyssalZone`, `TechnoUtopia`, `FungalForest`, `GlassySea`, `Papercraft`, `ChromaticAberration`, `SilkWeaver`, `VolcanicForge`, `LivingConstellation`, `GooeyMess`, `HauntedRealm`, and `CoralReef`.
    *   🔀 **Mutators:** Universes can be warped by one or more of **36+** mutators, like `Hyperspeed`, `Rainbow Particles`, `Clustering` (now with a breathing effect!), `Gravity Waves`, and new additions such as `PairBonding`, `Fragmenting`, `PhotonSails`, `ChaoticOrbits`, `TidalForces`, `Self-Propelled`, `ReflectiveEdges`, `Noctilucent`, `BrownianMotion`, `SupernovaRemains`, `Choral`, `Carnival`, and `ParticleChains`.
    *   🌠 **Anomalies:** Discover persistent cosmic features that dramatically alter the simulation, such as `Pulsars`, `Black Holes`, `Cosmic Web`, `Quasar`, and the new `CosmicGeyser`, `CrystallineField`, `TemporalRift`, `NegativeSpace`, `StellarWind`, `SolarFlare`, `ParticleAccelerator`, `SpacetimeFoam`, `EchoingVoid`, `CosmicNursery`, and `CosmicRiver`.
    *   💥 **Cataclysm System:** Constant interaction builds energy. When the universe becomes unstable, it triggers a spectacular, blueprint-specific cataclysm (e.g., `Supernova`, `Glitch Storm`, `False Vacuum Decay`, `The Bleed`, `SystemCrash`, `Shattering`, `WebCollapse`, `GrandCooling`, `BigRip`) before regenerating into a new, random universe.
*   **Share Your Creations:** The current universe's seed is stored in the URL. Simply copy the URL to share your exact cosmic discovery with others.
*   **Modular Codebase:** The project is now organized into separate HTML, CSS, and JavaScript files for easier maintenance and contribution.

---

## 🎮 How to Use

### Running Locally
Because the project now uses JavaScript modules (`import`/`export`), you need to run it from a local web server to avoid CORS errors.

1.  Clone or download the repository.
2.  Navigate to the project directory in your terminal.
3.  Start a simple web server. If you have Python 3, you can run:
    ```bash
    python -m http.server
    ```
4.  Open your browser and go to `http://localhost:8000`.

The simulation will start immediately.

### Controls
*   **Move Mouse:** A passive glow follows your cursor, influencing particles in some universes.
*   **Left-Click (Hold):** Activates your primary power (e.g., attract particles, create tendrils, accelerate time). Triggers "Warp Speed" background effect.
*   **Right-Click (Hold or Click):** Activates your secondary power (e.g., unleash a supernova, create a stasis field, entangle particles). Triggers "Gravity Well" background effect.
*   **Share:** The current seed is always in the URL. Copy the browser URL to share your unique universe.

---

## 🛠️ Technology Stack

*   **HTML5 / CSS3:** For the structure and vibrant visual styling.
*   **Vanilla JavaScript (ES6 Modules):** Powers the entire simulation logic, from the seeding engine to the physics and cataclysm events.
*   **particles.js:** Used as the base rendering engine for the particle system, which is then heavily modified and extended by the custom simulation loop.

---

## 📂 Codebase Overview

The JavaScript code is organized into a modular structure:

*   **`js/main.js`**: The main entry point for the application. It initializes the particles.js instance and kicks off the simulation.
*   **`js/simulation.js`**: Contains the core update loop, handling all particle physics, interactions, and anomaly updates.
*   **`js/universe.js`**: Manages the procedural generation of new universes based on a seed.
*   **`js/state.js`**: Manages the global state of the application, including the current universe profile, active effects, and user input.
*   **`js/effects.js`**: Defines the data for procedural generation, including `universeBlueprints`, `mutators`, and `anomalies`.
*   **`js/powers.js`**: Contains the logic for all player-activated powers.
*   **`js/cataclysms.js`**: Handles the logic for universe-ending cataclysm events.
*   **`js/ui.js`**: Manages all DOM interactions, UI updates, and event listeners.
*   **`js/drawing.js`**: Contains functions for drawing custom visual effects on the canvas.
*   **`js/utils.js`**: A collection of utility functions, such as color conversion and seeding algorithms.
*   **`js/config.js`**: Stores the base configuration for the particles.js library.

### Background Architecture Files

Each background visual style lives in its own module, extending a shared `Architecture` base class with `init()`, `update()`, and `draw()` methods:

*   **`js/background.js`**: Central orchestrator — maps universe blueprints to architectures, manages rendering loop, handles wildcard selection and performance features (object pooling, Path2D caching).
*   **`js/background_architectures.js`**: Contains the `Architecture` base class plus **Cosmic**, **Digital**, and **Geometric** architectures.
*   **`js/organic_architecture.js`**: Organic tendrils, bioluminescent cells, and spore particles.
*   **`js/flow_architecture.js`**: Particle flow fields with glow trails and spiral vortex.
*   **`js/abstract_architecture.js`**: Morphing gradient blobs with bridges and floating particles.
*   **`js/glitch_architecture.js`**: Chromatic aberration, scan corruption, and digital rain.
*   **`js/fabric_architecture.js`**: Cloth simulation with ripple waves and gravity vortex.
*   **`js/voxel_architecture.js`**: 3D-style voxel block landscapes.
*   **`js/fractal_architecture.js`**: Recursive branching trees with depth coloring and tip particles.
*   **`js/aurora_architecture.js`**: Northern light curtains with wave physics.
*   **`js/firefly_architecture.js`**: Synchronized bioluminescent swarm with formation patterns.
*   **`js/raindrop_architecture.js`**: Weather system with rain, snow, lightning, and puddles.
*   **`js/kaleidoscope_architecture.js`**: Symmetric mirrored patterns with variable fold symmetry.
*   **`js/terrain_architecture.js`**: Parallax procedural landscapes with time-of-day lighting.
*   **`js/spatial_grid.js`**: Spatial partitioning grid for efficient neighbor queries.
*   **`js/post_processing.js`**: Post-processing visual effects pipeline.

---

## ⚡ Performance

The background system uses several techniques to maintain smooth frame rates:

*   **Object Pooling:** Particles, sparks, and spores are recycled from pre-allocated pools to minimize garbage collection pauses.
*   **Path2D Caching:** Static geometric paths (scanlines, constellation lines, circuit connections) are computed once and reused across frames.
*   **Offscreen Canvas:** Gradient backgrounds are pre-rendered to offscreen canvases and drawn as images each frame.
*   **Spatial Partitioning:** `SpatialGrid` enables efficient distance queries for neighbor lookups without O(n²) comparisons.
*   **Additive Blending:** Glow effects use `globalCompositeOperation = 'lighter'` for GPU-friendly additive blending instead of layered transparency.

---

## 🔮 Future Ideas

This project is a sandbox for creative coding. Potential future additions could include:

*   **Soundscapes:** Procedurally generated ambient audio that reacts to the universe's state and user interaction.
*   **More Blueprints, Mutators, and Anomalies:** The system is designed to be easily expandable with new and crazier ideas.
*   **Mobile/Touch Controls:** Adapting the experience for touch devices.
*   **A "Saved Seeds" Gallery:** A way to bookmark and revisit favorite universes.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
