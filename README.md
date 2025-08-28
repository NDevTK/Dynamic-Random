# Celestial Canvas: An Interactive Particle Universe

Celestial Canvas is a generative art project that creates unique, interactive particle universes in your browser. Each universe is procedurally generated from a shareable "seed," giving it a distinct aesthetic, unique physics, and special user-activated powers. It's a digital zen garden where you can shape the cosmos, watch it evolve, and even trigger its beautiful destruction.

## ✨ Features

*   **Procedurally Generated Universes**: Every universe is unique! The background gradient, particle colors, physics, and interactive powers are all determined by a random seed.
*   **The Blueprint System**: Each seed generates a universe based on one of five distinct thematic blueprints, ensuring a wide variety of experiences:
    *   **Classical**: A familiar space theme with comets, supernovas, and gravity wells.
    *   **Organic**: A fluid, living universe with symbiotic particles and painterly trails.
    *   **Digital**: A retro-computing aesthetic with glitchy powers, straight-line physics, and character-based particles.
    *   **Cosmic Horror**: A dark, monochrome universe with black holes and unsettling ambient events.
    *   **Painterly**: A vibrant, artistic canvas where you can paint with colors and warp time.
*   **Interactive Physics**: Use your mouse to influence the cosmos. Every universe grants you a unique primary (left-click) and secondary (right-click) power to attract, repel, warp, or transform particles.
*   **Dynamic Ambient Events**: Universes are not static. They can experience random events like meteor showers, pulsing galactic cores, sudden color shifts, or even display a cryptic cosmic message.
*   **Energy & Cataclysms**: Interacting with the universe generates energy. Pushing it too far will destabilize the cosmos, triggering a spectacular "cataclysm" event that resets the simulation into a new, random universe.
*   **Shareable Seeds**: Found a universe you love? The current seed is always in the URL. Just copy the link and share it with others to let them experience the exact same cosmos!

## 🎮 How to Use

The controls are simple and designed for experimentation:

*   **Move Mouse**: Your cursor is a source of light and influence.
*   **Left-Click / Hold**: Activates your primary power. This could be anything from a powerful comet-like attraction to a destructive void.
*   **Right-Click / Hold**: Activates your secondary power. You might create a permanent gravity well, invert particle velocity, or toggle visual effects like particle trails.
*   **Capture Seed Button**: Click the button in the bottom-left corner to copy a shareable URL of your current universe to your clipboard.

## 🌱 The Seeding System

Everything in Celestial Canvas is controlled by the seed. The seed is a short, memorable string (e.g., `COSMIC-ECHO-1234`) found in the URL.

*   **Sharing**: To share a universe, just copy the full URL from your browser's address bar.
*   **Experimenting**: You can create your own seeds! Try changing the words or numbers in the URL and see what happens. For example: `?seed=MY-AWESOME-UNIVERSE-9999`.

## 🛠️ Technologies Used

*   **HTML5**
*   **CSS3** (for styling, gradients, and animations)
*   **JavaScript (ES6+)** (for all simulation logic)
*   **particles.js**: Used as the foundational library for particle rendering and management, but heavily customized with a custom animation loop and physics engine.

## 🚀 Running Locally

No server or special setup is required.

1.  **Download the File**: Download the `index.html` file from this project.
2.  **Open in Browser**: Open the `index.html` file directly in any modern web browser (like Chrome, Firefox, or Edge).

That's it! The simulation will start immediately.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
