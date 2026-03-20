/**
 * @file hud.js
 * @description Singleton that creates and manages the info HUD overlay.
 */

import { universeProfile, currentSeed } from './state.js';
import { gamepadInput } from './gamepad_input.js';
import { micReactive } from './mic_reactive.js';
import { tabSync } from './tab_sync.js';
import { speechInput } from './speech_input.js';
import { cameraInput } from './camera_input.js';
import { perfMonitor } from './perf_monitor.js';
import { archSelector } from './arch_selector.js';
import { ARCH_DESCRIPTIONS } from './arch_descriptions.js';
import { background, ARCH_DISPLAY_NAMES } from './background.js';

export const hud = (() => {
    let container, blueprintEl, descriptionEl, seedEl, mutatorEl, anomalyEl, fpsEl;
    let badgeGamepad, badgeMic, badgeCamera, badgeSpeech, badgeTab;

    let lastMouseTime = 0;
    let hudVisible = true;
    let hudManuallyHidden = false;

    // Change detection for badge updates
    let _lastGamepadOn = false, _lastMicOn = false, _lastCameraOn = false, _lastSpeechOn = false;
    let _lastTabCount = 0;

    function makeDot(color) {
        const dot = document.createElement('span');
        dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin:0 3px;transition:background 0.3s;`;
        return dot;
    }

    function init() {
        // Main container
        container = document.createElement('div');
        container.id = 'ui-container';

        blueprintEl = document.createElement('div');
        blueprintEl.id = 'blueprint-display';
        blueprintEl.style.cursor = 'pointer';
        blueprintEl.title = 'Click to browse architectures';
        blueprintEl.addEventListener('click', () => archSelector.toggle());

        descriptionEl = document.createElement('div');
        descriptionEl.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);font-style:italic;font-family:"Exo 2",sans-serif;margin-top:2px;';

        seedEl = document.createElement('span');
        seedEl.id = 'seed-capture';
        seedEl.style.cursor = 'pointer';
        seedEl.addEventListener('click', () => {
            if (!currentSeed) return;
            navigator.clipboard.writeText(currentSeed).then(() => {
                seedEl.textContent = 'Copied!';
                seedEl.classList.add('copied-animation');
                setTimeout(() => {
                    seedEl.textContent = currentSeed;
                    seedEl.classList.remove('copied-animation');
                }, 2000);
            });
        });

        mutatorEl = document.createElement('div');
        mutatorEl.id = 'mutator-display';

        anomalyEl = document.createElement('div');
        anomalyEl.id = 'anomaly-display';

        // Input badges row
        const badgesRow = document.createElement('div');
        badgesRow.style.cssText = 'display:flex;align-items:center;margin-top:6px;gap:2px;';

        const makeLabel = (text) => {
            const lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:9px;color:rgba(255,255,255,0.4);margin-right:1px;font-family:"Exo 2",sans-serif;';
            lbl.textContent = text;
            return lbl;
        };

        badgeGamepad = makeDot('rgba(255,255,255,0.2)');
        badgeMic     = makeDot('rgba(255,255,255,0.2)');
        badgeCamera  = makeDot('rgba(255,255,255,0.2)');
        badgeSpeech  = makeDot('rgba(255,255,255,0.2)');

        badgeTab = document.createElement('span');
        badgeTab.style.cssText = 'font-size:9px;color:rgba(255,255,255,0.4);margin-left:4px;font-family:"Exo 2",sans-serif;';

        badgesRow.appendChild(makeLabel('GP'));
        badgesRow.appendChild(badgeGamepad);
        badgesRow.appendChild(makeLabel('MIC'));
        badgesRow.appendChild(badgeMic);
        badgesRow.appendChild(makeLabel('CAM'));
        badgesRow.appendChild(badgeCamera);
        badgesRow.appendChild(makeLabel('SPK'));
        badgesRow.appendChild(badgeSpeech);
        badgesRow.appendChild(badgeTab);

        container.appendChild(blueprintEl);
        container.appendChild(descriptionEl);
        container.appendChild(seedEl);
        container.appendChild(mutatorEl);
        container.appendChild(anomalyEl);
        container.appendChild(badgesRow);
        document.body.appendChild(container);

        // FPS counter
        fpsEl = document.createElement('div');
        fpsEl.style.cssText = 'position:fixed;top:10px;right:10px;z-index:101;font-size:11px;color:rgba(255,255,255,0.4);font-family:"Exo 2",sans-serif;';
        document.body.appendChild(fpsEl);

        // Mouse tracking
        document.addEventListener('mousemove', () => {
            lastMouseTime = performance.now();
            if (!hudManuallyHidden) {
                container.classList.add('visible');
                hudVisible = true;
            }
        });

        // 'H' key toggles HUD
        document.addEventListener('keydown', (e) => {
            if (e.key === 'h' || e.key === 'H') {
                hudManuallyHidden = !hudManuallyHidden;
                if (hudManuallyHidden) {
                    container.classList.remove('visible');
                    hudVisible = false;
                } else {
                    container.classList.add('visible');
                    hudVisible = true;
                    lastMouseTime = performance.now();
                }
            }
        });

        // Show after short delay
        setTimeout(() => {
            if (!hudManuallyHidden) {
                container.classList.add('visible');
                hudVisible = true;
                lastMouseTime = performance.now();
            }
        }, 500);
    }

    function update(timestamp) {
        // FPS — use perfMonitor's already-computed value instead of recalculating
        const ql = perfMonitor.qualityLevel !== 'ultra' ? ' [' + perfMonitor.qualityLevel + ']' : '';
        fpsEl.textContent = Math.round(perfMonitor.fps) + ' fps' + ql;

        // Blueprint + description
        blueprintEl.textContent = universeProfile.blueprintName || 'Unknown';
        const archIdx = background._currentArchIndex;
        const desc = archIdx >= 0 && ARCH_DESCRIPTIONS[archIdx] ? ARCH_DESCRIPTIONS[archIdx] : '';
        if (descriptionEl.textContent !== desc) descriptionEl.textContent = desc;

        // Seed
        if (document.activeElement !== seedEl && !seedEl.classList.contains('copied-animation')) {
            seedEl.textContent = currentSeed || '';
        }

        // Mutators
        const mutators = universeProfile.mutators;
        mutatorEl.textContent = Array.isArray(mutators) && mutators.length
            ? mutators.join(', ')
            : '';

        // Anomaly
        const anomaly = universeProfile.anomaly;
        anomalyEl.textContent = anomaly ? String(anomaly) : '';

        // Input badges (only update DOM when state changes)
        const gpOn = gamepadInput.connected, micOn = micReactive.active;
        const camOn = cameraInput.active, spkOn = speechInput.active;
        if (gpOn !== _lastGamepadOn) { badgeGamepad.style.background = gpOn ? '#00ff88' : 'rgba(255,255,255,0.2)'; _lastGamepadOn = gpOn; }
        if (micOn !== _lastMicOn) { badgeMic.style.background = micOn ? '#4488ff' : 'rgba(255,255,255,0.2)'; _lastMicOn = micOn; }
        if (camOn !== _lastCameraOn) { badgeCamera.style.background = camOn ? '#ff4444' : 'rgba(255,255,255,0.2)'; _lastCameraOn = camOn; }
        if (spkOn !== _lastSpeechOn) { badgeSpeech.style.background = spkOn ? '#cc44ff' : 'rgba(255,255,255,0.2)'; _lastSpeechOn = spkOn; }

        const tc = tabSync.tabCount;
        if (tc !== _lastTabCount) {
            badgeTab.textContent = tc > 1 ? tc + ' tabs' : '';
            _lastTabCount = tc;
        }

        // Auto-hide after 5 seconds of no mouse movement
        if (!hudManuallyHidden) {
            const idle = performance.now() - lastMouseTime;
            if (idle > 5000 && hudVisible) {
                container.classList.remove('visible');
                hudVisible = false;
            }
        }
    }

    return { init, update };
})();
