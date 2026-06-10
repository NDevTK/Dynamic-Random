/**
 * @file main.js
 * @description This file contains the core logic for the Celestial Canvas project.
 * It handles the main simulation loop, universe generation, user interaction,
 * and rendering of the particle system.
 */

import { baseConfig } from './config.js';
import { createParticleEngine } from './particle_engine.js';
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
import { interactiveEffects } from './interactive_background_effects.js';
import { environmentSense } from './environment_sense.js';
import { videoExport } from './video_export.js';
import { familiarMemory } from './familiar_memory.js';
import { postcard } from './postcard.js';
import { journal } from './journal.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Loading animation (must be first) ---
    loadingAnimation.init();
    // Environment awareness must precede the render loop (quality cap, calm mode)
    environmentSense.init();
    // Familiar memory must load before the first universe configures its familiar
    familiarMemory.init();
    // Journal must load before the first universe records itself
    journal.init();

    // --- Initial Load ---
    // In-house engine (particle_engine.js) — no CDN dependency
    const pJS = createParticleEngine('particles-js', baseConfig);
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
    interactiveEffects.init();
    videoExport.init();
    postcard.init();
    embedMode.init();

    initializeEventListeners(pJS);
    generateUniverse(pJS, urlParams.get('seed'));
    requestAnimationFrame(() => update(pJS));

    // Installable / offline-capable (sw.js caches the app shell + modules).
    // The CSP enforces Trusted Types, so the worker URL must go through a
    // policy — a bare string is blocked ("requires 'TrustedScriptURL'").
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        try {
            let swUrl = 'sw.js';
            if (window.trustedTypes && window.trustedTypes.createPolicy) {
                const policy = window.trustedTypes.createPolicy('celestial-sw', {
                    createScriptURL: (input) => (input === 'sw.js' ? input : ''),
                });
                swUrl = policy.createScriptURL('sw.js');
            }
            navigator.serviceWorker.register(swUrl).catch(() => { /* offline mode unavailable */ });
        } catch (err) { /* Trusted Types policy refused — run without offline support */ }
    }
});
