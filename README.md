# ✨ Celestial Canvas

**An interactive, generative cosmic sandbox built in a single HTML file.**

Celestial Canvas is a browser-based generative art experience where you can create and interact with unique, miniature universes. Each universe is procedurally generated from a shareable seed, complete with its own aesthetic, physical laws, interactive powers, and cosmic events.

Use your mouse as a cosmic force to attract, repel, warp, shatter, and paint the particles that inhabit your canvas. But be careful—pushing the universe too hard will build up energy, leading to a world-ending **Cataclysm** that births a new reality.

**(A vibrant, animated GIF of the sandbox in action would go here, showcasing different blueprints, mouse interactions, and perhaps the start of a cataclysm.)**

---

## 🚀 Features

*   **Procedural Universe Generation:** Every universe is generated from a unique, shareable seed string (e.g., `ASTRAL-WARP-4271`). No two universes are exactly alike.
*   **Deeply Interactive Physics:** Your mouse isn't just a pointer; it's an extension of your will. Left and right clicks unleash unique powers determined by the universe's blueprint.
*   **The Universe Engine:** A complex system of interlocking, randomized components ensures immense variety:
    *   🌌 **Blueprints:** Each universe is based on one of 12 fundamental themes (like `Classical`, `Organic`, `Digital`, `VoidTouched`, or `LivingInk`) that define its core aesthetic, physics, and available powers.
    *   🔀 **Mutators:** Universes can be warped by one or more mutators, like `Hyperspeed`, `Rainbow Particles`, `Repulsive Field`, or a `Torus Field` (where particles wrap around the screen).
    *   🌠 **Anomalies:** Discover persistent cosmic features that dramatically alter the simulation, such as `Pulsars`, `Black Holes`, `Nebulae`, or reality-bending `Cosmic Strings`.
    *   💥 **Cataclysm System:** Constant interaction builds energy. When the universe becomes unstable, it triggers a spectacular, blueprint-specific cataclysm (e.g., `Supernova`, `Glitch Storm`, `False Vacuum Decay`, `The Bleed`) before regenerating into a new, random universe.
*   **Share Your Creations:** The current universe's seed is stored in the URL. Simply copy the URL to share your exact cosmic discovery with others.
*   **Zero Dependencies:** Everything is self-contained in a single `index.html` file. It leverages the `particles.js` library, but fetches it from a CDN, requiring no local setup.

---

## 🎮 How to Use

### Running Locally
1.  Download the `index.html` file.
2.  Open it in a modern web browser (like Chrome, Firefox, or Edge).

That's it! The simulation will start immediately.

### Controls
*   **Move Mouse:** A passive glow follows your cursor, influencing particles in some universes.
*   **Left-Click (Hold):** Activates your primary power (e.g., attract particles, create tendrils, accelerate time).
*   **Right-Click (Hold or Click):** Activates your secondary power (e.g., unleash a supernova, create a stasis field, entangle particles).
*   **UI (Bottom Left):**
    *   Displays the current `Blueprint`, `Mutators`, and `Anomaly`.
    *   Click on the **Seed** text to copy the shareable URL to your clipboard.

---

## 🛠️ Technology Stack

*   **HTML5 / CSS3:** For the structure and vibrant visual styling.
*   **Vanilla JavaScript (ES6):** Powers the entire simulation logic, from the seeding engine to the physics and cataclysm events.
*   **particles.js:** Used as the base rendering engine for the particle system, which is then heavily modified and extended by the custom simulation loop.

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
