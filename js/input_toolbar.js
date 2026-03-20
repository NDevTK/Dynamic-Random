/**
 * @file input_toolbar.js
 * @description Floating toolbar for activating permission-gated input systems.
 * CSP-safe: no innerHTML, insertAdjacentHTML, or string-to-DOM methods.
 */

import { micReactive } from './mic_reactive.js';
import { cameraInput } from './camera_input.js';
import { speechInput } from './speech_input.js';

const ACCENTS = { mic: '#4fc3f7', camera: '#ef5350', speech: '#ab47bc' };

let _toolbar = null;
let _buttons = {};
let _hideTimer = null;
let _visible = true;

function _injectStyles() {
    const style = document.createElement('style');
    style.textContent =
        '@keyframes inputPulse {' +
        '0%,100%{box-shadow:0 0 8px var(--accent);}' +
        '50%{box-shadow:0 0 20px var(--accent);}' +
        '}';
    document.head.appendChild(style);
}

function _makeButton(symbol, accent) {
    const btn = document.createElement('button');
    btn.textContent = symbol;
    btn.style.cssText =
        'width:40px;height:40px;border-radius:50%;' +
        'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);' +
        'font-size:18px;display:flex;align-items:center;justify-content:center;' +
        'cursor:pointer;opacity:0.5;transition:opacity 0.2s,border-color 0.2s,box-shadow 0.2s;' +
        'padding:0;color:inherit;';
    btn.dataset.active = 'false';
    btn.dataset.accent = accent;
    return btn;
}

function _setActive(btn, active, pulse) {
    const accent = btn.dataset.accent;
    btn.dataset.active = active ? 'true' : 'false';
    if (active) {
        btn.style.opacity = '1';
        btn.style.borderColor = accent;
        btn.style.setProperty('--accent', accent);
        btn.style.animation = pulse ? 'inputPulse 1.6s ease-in-out infinite' : 'none';
        btn.style.boxShadow = pulse ? '' : `0 0 10px ${accent}`;
    } else {
        btn.style.opacity = '0.5';
        btn.style.borderColor = 'rgba(255,255,255,0.15)';
        btn.style.animation = 'none';
        btn.style.boxShadow = 'none';
    }
}

function _isInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function _scheduleHide() {
    clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
        if (_toolbar) _toolbar.style.opacity = '0';
        _visible = false;
    }, 5000);
}

function _showToolbar() {
    if (_toolbar) _toolbar.style.opacity = '1';
    _visible = true;
    _scheduleHide();
}

export const inputToolbar = {
    init() {
        _injectStyles();

        _toolbar = document.createElement('div');
        _toolbar.style.cssText =
            'position:fixed;bottom:25px;left:50%;transform:translateX(-50%);z-index:101;' +
            'display:flex;gap:12px;padding:8px 16px;border-radius:24px;' +
            'background:rgba(20,20,25,0.6);backdrop-filter:blur(12px);' +
            'border:1px solid rgba(255,255,255,0.1);transition:opacity 0.4s;';

        const hasMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        const hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

        if (hasMic) {
            const btn = _makeButton('🎤', ACCENTS.mic);
            btn.addEventListener('click', async () => {
                if (btn.dataset.active === 'false') {
                    try {
                        await micReactive.activate();
                        _setActive(btn, true, true);
                    } catch (err) {
                        console.warn('[inputToolbar] Mic activation failed:', err.message ?? err);
                    }
                } else {
                    _setActive(btn, false, false);
                }
            });
            _toolbar.appendChild(btn);
            _buttons.mic = btn;
        }

        if (hasCamera) {
            const btn = _makeButton('📷', ACCENTS.camera);
            btn.addEventListener('click', async () => {
                if (btn.dataset.active === 'false') {
                    try {
                        await cameraInput.activate();
                        _setActive(btn, true, false);
                    } catch (err) {
                        console.warn('[inputToolbar] Camera activation failed:', err.message ?? err);
                    }
                } else {
                    cameraInput.deactivate();
                    _setActive(btn, false, false);
                }
            });
            _toolbar.appendChild(btn);
            _buttons.camera = btn;
        }

        if (hasSpeech) {
            const btn = _makeButton('💬', ACCENTS.speech);
            btn.addEventListener('click', async () => {
                if (btn.dataset.active === 'false') {
                    try {
                        await speechInput.activate();
                        _setActive(btn, true, true);
                    } catch (err) {
                        console.warn('[inputToolbar] Speech activation failed:', err.message ?? err);
                    }
                } else {
                    speechInput.deactivate();
                    _setActive(btn, false, false);
                }
            });
            _toolbar.appendChild(btn);
            _buttons.speech = btn;
        }

        document.body.appendChild(_toolbar);

        document.addEventListener('keydown', (e) => {
            if (_isInputFocused()) return;
            if (e.key === 'm' && _buttons.mic) _buttons.mic.click();
            else if (e.key === 'c' && _buttons.camera) _buttons.camera.click();
            else if (e.key === 'v' && _buttons.speech) _buttons.speech.click();
        });

        document.addEventListener('mousemove', _showToolbar);
        _scheduleHide();
    },

    update() {
        if (_buttons.mic) {
            const on = micReactive.active;
            const was = _buttons.mic.dataset.active === 'true';
            if (was !== on) _setActive(_buttons.mic, on, true);
        }
        if (_buttons.camera) {
            const on = cameraInput.active;
            const was = _buttons.camera.dataset.active === 'true';
            if (was !== on) _setActive(_buttons.camera, on, false);
        }
        if (_buttons.speech) {
            const on = speechInput.active;
            const was = _buttons.speech.dataset.active === 'true';
            if (was !== on) _setActive(_buttons.speech, on, true);
        }
    },
};
