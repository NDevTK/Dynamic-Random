Of course! Here is a comprehensive `README.md` file for your "Celestial Canvas" project. It explains the concept, details the features, and provides instructions on how to interact with it.

---

# Celestial Canvas

**Celestial Canvas** is an interactive generative art project that creates unique, mesmerizing particle universes right in your browser. Each universe is procedurally generated from a shareable seed, giving it a distinct set of physical laws, aesthetics, and interactive powers.

Use your mouse to shape the cosmos, trigger celestial events, and push your universe towards a spectacular, world-ending cataclysm.


*(Image is a representative animated GIF of the experience)*

## ✨ Key Features

*   **Infinitely Generative:** Every universe is created from a unique, shareable seed. Reload the page for a new experience, or share a URL with a specific seed to show others what you've found.
*   **Universe Blueprints:** The core of each universe is its blueprint, which defines its theme, physics, and available powers. Blueprints include:
    *   `Classical`: A standard space simulation with gravity and supernovae.
    *   `Organic`: A fluid, biological world with trails and symbiotic forces.
    *   `Digital`: A world of bits and glitches with straight-line physics.
    *   `Crystalline`: A rigid, bouncing universe of sharp edges and resonance.
    *   `BioMechanical`: A hybrid world of networked particles and infectious tendrils.
    *   `ChronoVerse`: A universe where time can be bent, accelerated, or frozen.
    *   `VoidTouched`: A stark, monochrome universe on the brink of annihilation.
    *   `PhantomEcho`: A ghostly world of repeating events and intangible zones.
    *   `Aetherial`: A soft, ethereal plane with gentle forces and fading particles.
*   **Game-Changing Mutators:** Each universe can have random mutators that dramatically alter its behavior:
    *   `Pulsing Particles`: Particles gently grow and shrink in a hypnotic rhythm.
    *   `Torus Field`: The universe wraps around! Exiting one edge teleports you to the opposite side.
    *   `Erratic`: Particles move with a chaotic, unpredictable jitter.
    *   `Rainbow`: Particles shift through the color spectrum over time.
    *   `Hyperspeed`, `Viscous`, `Low-Gravity`, and more!
*   **Rare Cosmic Anomalies:** There is a chance for a universe to spawn with a persistent, rare anomaly that reshapes the entire simulation:
    *   **Pulsar:** A rapidly spinning star that periodically emits powerful beams of energy, sweeping particles across the canvas.
    *   **Nebula:** A vast, colorful gas cloud that slows down and tints any particles that drift through it.
*   **Dynamic Mouse Powers:** Your mouse is the prime mover. Hold the left and right buttons to wield powers determined by the universe's blueprint. Attract, repel, freeze, infect, teleport, paint, and shatter the particles around you.
*   **Cataclysm System:** Interacting with the universe builds up energy. Push it too far, and you will trigger a spectacular, universe-ending **Cataclysm**, after which a new universe is born from the ashes.

## 🎮 How to Use

The experience is designed to be intuitive and discovery-based.

*   **Move Mouse:** Controls a glowing cursor that influences particles.
*   **Hold Left Mouse Button:** Activates the primary power (e.g., `Comet`, `Infect`, `Whisper`).
*   **Hold Right Mouse Button:** Activates the secondary power (e.g., `Set Orbit`, `Paint`, `Phase Zone`).
*   **Click Right Mouse Button:** Some secondary powers are instantaneous (e.g., `Supernova`, `Wormhole`, `Stasis Field`).

The UI in the bottom-left corner provides all the information about your current universe:
*   **Blueprint:** The fundamental theme of the universe.
*   **Seed:** The unique identifier for this universe. **Click it to copy a shareable URL!**
*   **Mutators:** Any special physics modifiers in effect.
*   **Anomaly:** If a rare cosmic anomaly is present.

## ⚙️ How It Works

Celestial Canvas is built with vanilla **HTML, CSS, and JavaScript**, with no external frameworks. It leverages the lightweight **`particles.js`** library as a foundation for rendering, but all generative logic, physics modifications, and interactive features are custom-built.

1.  **Seeding:** On load, a seed is either read from the URL (`?seed=...`) or randomly generated.
2.  **PRNG Initialization:** This seed is used to initialize a `mulberry32` pseudo-random number generator (PRNG). This ensures that the same seed will *always* produce the exact same sequence of random numbers.
3.  **Universe Generation:** The PRNG is used to determine every aspect of the new universe:
    *   The Blueprint is chosen.
    *   The left and right mouse powers are selected from the Blueprint's pool.
    *   Colors, base physics, and particle shapes are set.
    *   Mutators are rolled for and applied.
    *   A rare Anomaly is rolled for and spawned.
4.  **Real-time Simulation:** The main `requestAnimationFrame` loop continuously updates and draws the simulation, handling:
    *   Particle physics and movement.
    *   User mouse input and power activation.
    *   The logic for Anomalies, Mutators, and other special fields.
    *   The energy level and triggering of the Cataclysm.

## 🚀 Running Locally

This project is a single, self-contained `index.html` file. To run it, simply download the file and open it in any modern web browser. No web server is required.
