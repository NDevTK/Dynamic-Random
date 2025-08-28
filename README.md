# Celestial Canvas: The Omega Engine

**Celestial Canvas** is the definitive generative, interactive art engine. It is both a destination for discovery and a powerful creative tool. At its heart is the **Omega Engine**, a system designed for maximum variety and unpredictability, ensuring that it will likely never create the same universe twice.

This final, production-ready version is a complete experience, offering two distinct ways to play: **Discovery Mode**, a classic journey into the unknown, and **Sandbox Mode**, the ultimate creative suite for designing your own cosmos.

## Key Features

*   **Dual Modes:** Choose between the unpredictable **Discovery Mode** or the fully customizable **Sandbox Mode**.
*   **Ten Unique Blueprints:** Explore ten distinct cosmic themes, from the astronomical `Classical` to the time-bending `Chrono`, each with unique aesthetics, physics, and powers.
*   **Complete Creative Control:** In Sandbox Mode, design your own universe by selecting your blueprint, powers, ambient events, and even fine-tuning the physics.
*   **Shareable Universes:** Generate a unique URL for any universe you discover or create. Share your favorite random seeds or your custom-built sandbox creations.
*   **Challenge System:** Each randomly generated universe comes with an optional, themed objective to add a layer of gameplay and test your mastery.
*   **Persistent Settings & Stats:** Your preferences for sound and UI theme, along with your lifetime stats, are automatically saved in your browser.
*   **Full Accessibility:** The experience is fully functional on both desktop (mouse) and mobile (touch), with a responsive UI and keyboard-accessible controls for all major functions.
*   **Secure & Robust:** Hardened against common web vulnerabilities by avoiding `innerHTML` for Trusted Types compliance, and built to function gracefully even in restricted environments where `localStorage` may be unavailable.

## How to Use

1.  Save the code as a single `index.html` file.
2.  Open it in any modern web browser (desktop or mobile).
3.  You will be greeted with a **Mode Selection** screen.
    *   Choose **Discovery Mode** for a randomly generated experience.
    *   Choose **Sandbox Mode** to open the editor and design your own.
4.  **Controls:**
    *   **Desktop:** Move the mouse to interact. Use **Left-Click** and **Right-Click** for your primary and secondary powers.
    *   **Mobile:** Use **one finger** to interact (primary power) and a **two-finger tap** for your secondary power.
5.  Use the on-screen UI to start a new universe, pause the simulation, or access the settings panel.

## Core Concepts Explained

### The Blueprints
The engine forges each session around one of these core themes:

*   **`Classical:`** A beautiful and balanced cosmos of stars and nebulae.
*   **`Organic:`** A living, breathing universe of soft, flowing matter.
*   **`Digital:`** A universe of information, text characters, and glitches.
*   **`Cosmic Horror:`** A strange, unsettling, and often monochrome universe.
*   **`Painterly:`** A world of beautiful, smearing particle trails.
*   **`Aquatic:`** A deep-sea simulation with currents and water-themed powers.
*   **`Crystalline:`** A universe of sharp, geometric forms and shattering physics.
*   **`Kinetic:`** A high-energy cosmos built around physics and motion.
*   **`Celestial:`** An astronomical simulation for creating star nurseries and constellations.
*   **`Chrono:`** A universe governed by the laws of time itself.

### The Sandbox Editor
In Sandbox Mode, you have full control:
*   **Blueprint:** Sets the core theme and physics.
*   **Powers:** Choose any primary and secondary power from the entire game.
*   **Ambient Event:** Select the background event for your universe.
*   **Physics:** Fine-tune the **Particle Count** and **Friction**.

Click "Launch" to start your creation, or "Share" to generate a unique URL that saves all your settings.

## Technology & Standards

*   **HTML5 / CSS3:** For structure and modern styling.
*   **JavaScript (ES6):** Powers the entire Omega Engine, generative logic, and physics.
*   **particles.js:** Used as a lightweight rendering foundation, now heavily extended by a custom physics and interaction engine.
*   **Accessibility:** All interactive controls are built with semantic HTML (`<button>`, `<input type="checkbox">`) and include `aria-label` attributes where necessary, ensuring keyboard and screen reader compatibility.
*   **Security:** `innerHTML` is never used for DOM manipulation, making the application compliant with strict Content Security Policies that enforce Trusted Types.
*   **Robustness:** All `localStorage` operations are wrapped in `try...catch` blocks, allowing the application to function perfectly even in sandboxed iframes or browsers with disabled storage.

---

## License

This project is licensed under the MIT License.
