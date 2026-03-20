# Implementation Plan: Creative Background Effects Expansion

## Overview
Add device sensor integration, simplex noise library, 4 new architectures, improve existing architectures, and add more cursor effects. All changes are seed-driven for deterministic reproducibility.

---

## Phase 1: Simplex Noise Library (Foundation)
**Why first:** Many improvements in later phases depend on smooth noise.

### 1.1 Create `js/simplex_noise.js`
- Implement 2D and 3D simplex noise (public domain algorithm, ~120 lines)
- Export `createNoise2D(seed)` and `createNoise3D(seed)` functions that return seeded noise samplers
- Export `fbm2D(noiseFn, x, y, octaves, lacunarity, gain)` for fractal Brownian motion
- Export `ridgedNoise2D(noiseFn, x, y, octaves)` for ridged multi-fractal
- No external dependencies - pure JS implementation

### 1.2 Integrate into existing architectures
- **FlowArchitecture** (`flow_architecture.js`): Replace `Math.sin` vector field with curl noise from simplex. Creates dramatically better swirling flow patterns
- **LavaArchitecture** (`lava_architecture.js`): Use fbm noise for metaball movement paths instead of simple sin/cos oscillation
- **TerrainArchitecture** (`terrain_architecture.js`): Use ridged noise for terrain height generation
- **FluidArchitecture** (`fluid_architecture.js`): Use noise for initial dye injection patterns
- **InkArchitecture** (`ink_architecture.js`): Use noise for organic diffusion wobble
- **InterferenceArchitecture** (`interference_architecture.js`): Optional noise-modulated wave frequencies

---

## Phase 2: Device Orientation & Motion API
**File:** `js/device_sensors.js` (~200 lines)

### 2.1 Create sensor system
- Singleton `DeviceSensorSystem` class
- `init()`: Check for API support, request permission on iOS 13+
- Listen to `deviceorientation` (alpha, beta, gamma) and `devicemotion` (acceleration)
- Expose smoothed values: `tilt.x`, `tilt.y`, `tilt.z`, `shake.intensity`
- Fallback: On desktop, no-op (values stay at 0)
- Export normalized values (-1 to 1) for easy consumption

### 2.2 Integrate into `state.js`
- Add `deviceTilt: { x: 0, y: 0, z: 0 }` and `deviceShake: 0` to state
- Device sensors update these values each frame

### 2.3 Integrate into `background.js`
- Tilt shifts the background gradient subtly (parallax layer 0)
- Tilt affects shooting star direction
- Shake above threshold triggers shockwave at screen center

### 2.4 Integrate into `simulation.js`
- Tilt adds a global gravity vector to all particles: `particle.vx += tilt.x * 0.5`
- Shake above threshold boosts particle speed temporarily

### 2.5 Integrate into existing architectures
- **CosmicArchitecture**: Tilt shifts star parallax (already has parallax via mouse, add device tilt as additional offset)
- **FlowArchitecture**: Tilt rotates the flow field angle
- **LavaArchitecture**: Tilt shifts gravity direction for metaballs
- **PendulumArchitecture**: Tilt changes pendulum gravity angle (most natural fit)
- **DeepSeaArchitecture**: Tilt changes water current direction
- **FabricArchitecture**: Tilt adds gravity pull direction to mesh

### 2.6 Integrate into `main.js`
- Import and init device sensors alongside other systems
- Call `deviceSensors.init()` in DOMContentLoaded

---

## Phase 3: New Architectures (4 unique ones)

### 3.1 `js/typography_architecture.js` (~350 lines)
**Typewriter / Living Typography**
- Cascading words/glyphs that form, drift, and dissolve
- Seed selects from 6 word sets: code keywords, poetry fragments, mathematical symbols, music notation, ancient scripts, emoji sequences
- Seed determines: font size range, fall speed, formation patterns (rain, spiral, wave, explosion)
- Words form temporary phrases near mouse then scatter
- Gravity well: text vortex spiraling inward
- Shockwave: text explosion outward
- Mouse proximity: characters grow brighter and larger
- Performance: batch text rendering by size/color groups

### 3.2 `js/origami_architecture.js` (~400 lines)
**Paper-Folding Geometric Shapes**
- Flat polygons that fold along crease lines in pseudo-3D
- Seed determines: polygon complexity (3-8 sides), fold count, fold speed, paper texture color
- 4 paper styles: white origami, newspaper print, metallic foil, tissue paper
- Fold animation: vertices interpolate between flat and folded positions using rotation matrices
- Multiple independent origami pieces floating at different depths
- Mouse interaction: pieces unfold/refold as mouse approaches
- Gravity well: pieces crumple toward center
- Shockwave: sudden unfold/refold animation
- Crease lines drawn as dashed lines with shadow effect
- Light/shadow on faces based on fold angle relative to light source

### 3.3 `js/neural_net_architecture.js` (~350 lines)
**Neural Network Visualization**
- Visible forward-pass signal propagation through a layered network
- Seed determines: layer count (3-7), neurons per layer (4-12), activation function visual style
- 4 network topologies: feedforward, recurrent loops, convolutional grid, transformer attention
- Signals propagate as glowing pulses along connection lines
- Weight visualization: line thickness/color indicates strength
- Activation glow: neurons light up when signal arrives
- Mouse acts as input: cursor position feeds into first layer
- Gravity well: backpropagation visual (signals reverse direction)
- Shockwave: "training step" - all weights briefly flash and randomize
- Dropout visualization: some neurons randomly dim

### 3.4 `js/tidal_pool_architecture.js` (~350 lines)
**Water Surface with Caustics**
- Simulated water surface using height field
- Caustic light patterns projected onto "floor" beneath
- Ripple physics: mouse creates ripples, edges reflect
- Seed determines: water color/clarity, floor pattern, ripple damping, number of floating objects
- 4 floor types: sandy, rocky, coral, mosaic tiles
- Floating debris: leaves, petals, small fish silhouettes (seed-selected)
- Mouse click: stone drop creating concentric ripples
- Gravity well: whirlpool with swirling debris
- Caustics rendered via water surface normal → light refraction approximation
- Rendering: downsampled height field, caustic overlay with 'lighter' blend

---

## Phase 4: Improve Existing Architectures

### 4.1 Improve `CosmicArchitecture` (background_architectures.js)
- Add nebula color variety based on seed (currently fixed alpha)
- Add comet objects (long trailing particles crossing the screen)
- Add gravitational lensing effect near black holes (distort nearby stars)
- Add galaxy arm structure to celestial objects (spiral pattern)

### 4.2 Improve `GeometricArchitecture` (background_architectures.js)
- Add shard-to-shard collision physics (bounce off each other)
- Add "magnetic" mode where shards align rotation to nearby shards
- Add inner patterns to shards (inscribed smaller polygons)
- Add shatter effect: large shards break into fragments on strong shockwave

### 4.3 Improve `FlowArchitecture` (flow_architecture.js)
- Replace sin-based field with simplex noise curl field (Phase 1 dependency)
- Add flow field visualization option: draw subtle direction arrows
- Add dye injection: colored streaks that follow flow
- Add vortex shedding: periodic vortex spawning behind mouse

### 4.4 Improve `AbstractArchitecture` (abstract_architecture.js)
- Add blob mitosis: blobs split and merge based on energy
- Add tendril connections between blobs (organic bridges)
- Add internal structure to blobs (vein-like patterns)
- Add color bleeding between nearby blobs

### 4.5 Improve `FractalArchitecture` (fractal_architecture.js)
- Add seasonal variation (spring→summer→fall→winter cycle affecting colors/leaves)
- Add wind effect that bends all branches in one direction
- Add fruit/flower generation at branch tips (small colored circles)
- Add falling leaf particles from branch tips

---

## Phase 5: New Cursor Effects (4 new styles)

### 5.1 Add to `cursor_effects.js`

**Compass Rose** - A rotating navigational compass that points toward mouse movement direction. Rose petals expand when moving fast, contract when still. Cardinal/ordinal points rendered with different colors from palette.

**Particle Physics** - Miniature particle collider visualization. Two beams of particles orbit cursor in opposite directions. When clicking, beams collide creating shower of decay products with physics-accurate (simplified) trajectories.

**Ink Brush** - East Asian calligraphy brush effect. Thick-to-thin stroke based on speed. Ink splatters on direction changes. Brush tip rendered with bristle texture (parallel thin lines). Dripping effect when stationary.

**Holographic** - Glitchy hologram projection of rotating 3D wireframe shape (cube, tetrahedron, dodecahedron based on seed). Scanline interference. Occasional flicker/displacement. Color fringing at edges.

---

## Phase 6: Integration & Polish

### 6.1 Update `universe.js`
- Pass simplex noise instance to architectures via system object
- Initialize device sensors in universe generation flow

### 6.2 Update `background.js`
- Add 4 new architectures to ALL_ARCHITECTURES array
- Add blueprint mapping entries for new architectures
- Add new architectures to default fallback selection

### 6.3 Performance audit
- Ensure all new architectures stay under 16ms frame budget
- Use object pooling for all particle systems
- Use offscreen canvas for pixel-manipulation architectures
- Batch draw calls where possible (single beginPath for same-styled elements)

### 6.4 Seed differentiation testing
- Verify 10 different seeds produce visually distinct results
- Ensure new gradient styles, mutators, and architectures appear with reasonable frequency

---

## File Summary

**New files (10):**
- `js/simplex_noise.js` - Noise library
- `js/device_sensors.js` - Device orientation/motion
- `js/typography_architecture.js` - Living text
- `js/origami_architecture.js` - Paper folding
- `js/neural_net_architecture.js` - Neural network viz
- `js/tidal_pool_architecture.js` - Water caustics

**Modified files (12):**
- `js/background.js` - New architecture imports + selection
- `js/state.js` - Device tilt state
- `js/simulation.js` - Tilt gravity vector
- `js/main.js` - Init device sensors
- `js/universe.js` - Pass noise instance
- `js/cursor_effects.js` - 4 new cursor styles
- `js/flow_architecture.js` - Simplex noise integration
- `js/lava_architecture.js` - Noise-based movement
- `js/ink_architecture.js` - Noise diffusion
- `js/background_architectures.js` - Cosmic + Geometric improvements
- `js/abstract_architecture.js` - Blob improvements
- `js/fractal_architecture.js` - Seasonal + wind effects

**Estimated total new code:** ~3,500 lines
