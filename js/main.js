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
import { background } from './background.js';
import { cursorEffects } from './cursor_effects.js';
import { cursorTrails } from './cursor_trails.js';
import { ambientFX } from './ambient_fx.js';
import { warpField } from './warp_field.js';
import { ambientSound } from './ambient_sound.js';
import { deviceSensors } from './device_sensors.js';
import { gamepadInput } from './gamepad_input.js';
import { micReactive } from './mic_reactive.js';
import { tabSync } from './tab_sync.js';
import { speechInput } from './speech_input.js';
import { cameraInput } from './camera_input.js';
import { webgpuCompute } from './webgpu_compute.js';
import { hud } from './hud.js';
import { inputToolbar } from './input_toolbar.js';
import { perfMonitor } from './perf_monitor.js';
import { touchGestures } from './touch_gestures.js';
import { archSelector } from './arch_selector.js';
import { screenshot } from './screenshot.js';
import { helpOverlay } from './help_overlay.js';
import { favorites } from './favorites.js';
import { generativeMusic } from './generative_music.js';
import { timeline } from './timeline.js';
import { themeEditor } from './theme_editor.js';
import { embedMode } from './embed_mode.js';
import { multiMonitor } from './multi_monitor.js';
import { loadingAnimation } from './loading_animation.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Loading animation (must be first) ---
    loadingAnimation.init();

    // --- Initial Load ---
    particlesJS('particles-js', baseConfig);
    const pJS = window.pJSDom[0].pJS;
    const urlParams = new URLSearchParams(window.location.search);

    background.init();
    cursorEffects.init();
    cursorTrails.init();
    ambientFX.init();
    warpField.init();
    ambientSound.init();
    deviceSensors.init();
    gamepadInput.init();
    micReactive.init();
    tabSync.init();
    speechInput.init();
    cameraInput.init();
    webgpuCompute.init();
    hud.init();
    inputToolbar.init();
    perfMonitor.init();
    touchGestures.init();
    archSelector.init();
    screenshot.init();
    helpOverlay.init();
    favorites.init();
    generativeMusic.init();
    timeline.init();
    themeEditor.init();
    multiMonitor.init();
    embedMode.init();

    initializeEventListeners(pJS);
    generateUniverse(pJS, urlParams.get('seed'));
    requestAnimationFrame(() => update(pJS));
});