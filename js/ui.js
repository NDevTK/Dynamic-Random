/**
 * @file ui.js
 * @description This file handles UI interactions, DOM updates, and event listeners.
 */

import { ui, setMouse, setLeftMouseDown, setRightMouseDown, currentSeed, cataclysmInProgress, universeProfile, isLeftMouseDown, isRightMouseDown, setSeedCopyTimeout, clearSeedCopyTimeout } from './state.js';
import { handleClickPower } from './powers.js';
import { generateUniverse } from './universe.js';
import { background } from './background.js';

/**
 * Sets a random gradient background for the body and canvas, with a starfield.
 * @param {number} hue - The base hue for the gradient.
 * @param {boolean} isMonochrome - Whether the gradient should be monochrome.
 * @param {function(): number} seededRandom - The seeded random number generator.
 * @param {boolean} isDark - Whether the gradient should be dark.
 * @param {string} blueprintName - The name of the universe blueprint.
 */
export function setRandomGradient(hue, isMonochrome, seededRandom, isDark, blueprintName) {
    background.setTheme(hue, isMonochrome, seededRandom, isDark, blueprintName);

    // Clear any previous inline styles that might interfere
    document.body.style.background = '';
    ui.canvasContainer.style.background = '';
    document.body.style.backgroundSize = '';
    ui.canvasContainer.style.backgroundSize = '';
}

/**
 * Updates the URL to reflect the current seed without reloading the page.
 */
export function updateUI() {
    history.replaceState(null, '', `?seed=${encodeURIComponent(currentSeed)}`);
}

/**
 * Initializes global event listeners for interactions.
 * @param {Object} pJS - The particles.js instance.
 */
export function initializeEventListeners(pJS) {
    window.addEventListener('mousemove', e => {
        setMouse({ x: e.clientX, y: e.clientY });
        ui.cursorGlow.style.left = `${e.clientX}px`;
        ui.cursorGlow.style.top = `${e.clientY}px`;
    });

    window.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('mousedown', e => {
        if (cataclysmInProgress) return;
        if (e.button === 0) setLeftMouseDown(true);
        else if (e.button === 2) setRightMouseDown(true);
        ui.cursorGlow.style.setProperty('--glow-color', `${pJS.particles.color.value}40`);
        ui.cursorGlow.classList.add('active');
    });

    window.addEventListener('mouseup', e => {
        if (cataclysmInProgress) return;
        const powerName = e.button === 0 ? universeProfile.leftClickPower : universeProfile.rightClickPower;
        const clickPowers = ['supernova', 'gravityWell', 'stasisField', 'unravel', 'harvest', 'toggleLinks', 'glitch', 'crystalize', 'wormhole', 'entangle', 'decohere', 'shockwave', 'silence', 'splatter', 'blot', 'gaze', 'realityTear', 'paletteKnife', 'wash', 'disperse', 'cool', 'flashFreeze', 'polymorph', 'whiteHoleSpawn', 'pressureWave', 'overgrow', 'decompose', 'paperTear', 'smooth', 'aberrate', 'pullThreads', 'quench', 'connectConstellation', 'dissolveGoo', 'materialize'];
        if (clickPowers.includes(powerName)) {
            handleClickPower(powerName, pJS, { x: e.clientX, y: e.clientY });
        }
        if (e.button === 0) setLeftMouseDown(false);
        else if (e.button === 2) setRightMouseDown(false);
        if (!isLeftMouseDown && !isRightMouseDown) ui.cursorGlow.classList.remove('active');
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (pJS && currentSeed && !cataclysmInProgress) {
                generateUniverse(pJS, currentSeed, true);
            }
        }, 250);
    });
}
