/**
 * @file main.js
 * @description This file contains the core logic for the Celestial Canvas project.
 * It handles the main simulation loop, universe generation, user interaction,
 * and rendering of the particle system.
 */

import { baseConfig } from './config.js';
import { generateUniverse } from './universe.js';
import { update } from './simulation.js';
import { initializeEventListeners } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Initial Load ---
    particlesJS('particles-js', baseConfig);
    const pJS = window.pJSDom[0].pJS;
    const urlParams = new URLSearchParams(window.location.search);

    initializeEventListeners(pJS);
    generateUniverse(pJS, urlParams.get('seed'));
    requestAnimationFrame(() => update(pJS));
});