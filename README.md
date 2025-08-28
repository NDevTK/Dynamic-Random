# Celestial Canvas: A Generative Interactive Background

**Celestial Canvas** is not just a dynamic website background; it's a generative art piece. It leverages a powerful physics and aesthetics engine to create a completely unique, interactive cosmos every single time the page is loaded. There are no controls or UI—the entire experience is about discovering the unique laws of each new universe and the surprising power you wield within it.

## Core Features

This project goes beyond simple randomization. It procedurally generates a unique set of rules and visuals for each session, resulting in a nearly infinite number of possible experiences.

### 1. Generative Universe Engine
On every page load, a new universe is born with its own unique properties:

*   **Procedural Physics:** The fundamental laws of motion are randomized. Particles might drift gently in a unified direction (`Cosmic Drift`), be trapped within the screen's bounds (`Contained Universe`), or wander freely into the void.
*   **Inter-Particle Gravity:** Some universes will have their own internal gravity, causing particles to naturally clump and form galaxies over time.
*   **Generative Aesthetics:**
    *   The background is a unique, multi-color animated gradient.
    *   Particles can be standard geometric shapes (circles, stars, polygons) or one of several custom image types (moons, starbursts, cosmic swirls).
    *   The fabric of space can be a void or an interconnected web (`Living Constellation`).
*   **Ambient Animation:** Some universes will feature particles that have a life of their own, gently "breathing" in size or "twinkling" in opacity.

### 2. Procedurally Generated User Power
Your interaction with the universe is also a surprise. The primary mouse-hold function is procedurally generated on each load, creating a unique "force profile" for you to discover. Your power might be:

*   A powerful **attractor** that pulls matter into a swirling vortex.
*   A strong **repulsor** that carves out empty space.
*   A gentle **gravity well** that forms stable orbital rings.
*   A **creator** force that paints new matter into the world.
*   ...or a subtle and unique **combination of all these properties**.

### 3. Advanced Physics-Based Interaction
The user's "force" is designed to feel physical and expressive:

*   **Orbital Mechanics:** Particles don't just move towards the cursor; they can be caught in its gravitational pull, creating beautiful, swirling orbits.
*   **Inertia and Friction:** All particles have a sense of weight. They are affected by a universal friction, causing forces to dissipate naturally and creating smoother, more organic motion.
*   **Dynamic Supernova:** For attractive forces, releasing the mouse creates a supernova explosion. The force and direction of this blast are directly influenced by the user's physical mouse movement, adding a layer of skill and expression.

### 4. Dual Interaction Model (Click vs. Hold)
The system intelligently distinguishes between two core user actions:

*   **Quick Click:** A fast press-and-release always creates a small burst of new particles at the cursor's location. It's a simple, satisfying, and creative spark.
*   **Press & Hold:** A longer press activates the session's unique, procedurally generated "Force Profile," unleashing a powerful and mysterious force that begs to be explored.

## How to Use

This project is entirely self-contained in a single file.

1.  Download the `index.html` file.
2.  Open it in any modern web browser.
3.  That's it! A new universe will be generated on every page load or refresh.

## Technology Stack

*   **HTML5**
*   **CSS3** (for background gradients and animations)
*   **JavaScript (ES6)** (for all generative logic and physics)
*   **particles.js:** A lightweight library used for the core particle rendering and management, which has been heavily extended with our custom physics engine.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
