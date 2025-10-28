/**
 * @file ui.js
 * @description This file handles UI interactions, DOM updates, and event listeners.
 */

import { ui, setMouse, setLeftMouseDown, setRightMouseDown, currentSeed, cataclysmInProgress, universeProfile, isLeftMouseDown, isRightMouseDown, setSeedCopyTimeout, clearSeedCopyTimeout } from './state.js';
import { handleClickPower } from './powers.js';
import { generateUniverse } from './universe.js';

/**
 * Sets a random gradient background for the body and canvas.
 * @param {number} hue - The base hue for the gradient.
 * @param {boolean} isMonochrome - Whether the gradient should be monochrome.
 * @param {function(): number} seededRandom - The seeded random number generator.
 * @param {boolean} isDark - Whether the gradient should be dark.
 */
export function setRandomGradient(hue, isMonochrome, seededRandom, isDark) {
    const angle = Math.floor(seededRandom() * 360);
    if (isDark) {
        document.body.style.background = `linear-gradient(${angle}deg, #0a050d, #120510, #000000)`;
    } else if (isMonochrome) {
        document.body.style.background = `linear-gradient(${angle}deg, hsl(${hue}, 80%, 10%), hsl(${hue}, 40%, 20%), hsl(${hue}, 90%, 5%))`;
    } else {
        document.body.style.background = `linear-gradient(${angle}deg, hsl(${hue},80%,30%), hsl(${(hue + 120) % 360},80%,20%), hsl(${(hue + 240) % 360},80%,25%))`;
    }
    ui.canvasContainer.style.background = document.body.style.background;
    ui.canvasContainer.style.backgroundSize = '400% 400%';
}

export function updateUI() {
    history.replaceState(null, '', `?seed=${currentSeed}`);
    ui.blueprint.innerText = `Blueprint: ${universeProfile.blueprintName}`;
    ui.seed.innerText = `Seed: ${currentSeed}`;
    ui.mutators.innerText = universeProfile.mutators.length ? `Mutators: ${universeProfile.mutators.join(', ')}` : 'Mutators: None';
    ui.anomaly.innerText = universeProfile.anomaly ? `Anomaly: ${universeProfile.anomaly}` : 'Anomaly: None';
    setTimeout(() => { ui.container.classList.add('visible'); }, 500);
}

export function initializeEventListeners(pJS) {
    ui.seed.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            ui.seed.innerText = 'Copied!';
            clearSeedCopyTimeout();
            const timeout = setTimeout(() => ui.seed.innerText = `Seed: ${currentSeed}`, 2000);
            setSeedCopyTimeout(timeout);
        });
    });

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

    window.addEventListener('resize', () => {
        let resizeTimeout;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (pJS && currentSeed && !cataclysmInProgress) {
                generateUniverse(pJS, currentSeed, true);
            }
        }, 250);
    });
}