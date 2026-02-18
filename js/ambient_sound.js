/**
 * @file ambient_sound.js
 * @description Generative ambient sound engine using Web Audio API.
 * Creates seed-unique ambient soundscapes from oscillators, noise, and filters.
 * Sound is reactive to mouse movement and universe events.
 * Starts muted, activated by user interaction (click).
 */

import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';

const SOUND_PROFILES = [
    'deepSpace',      // Low drones with shimmering harmonics
    'crystalCave',    // Tinkling high frequencies with resonance
    'bioOrgan',       // Pulsing, breathing organic sounds
    'digitalGlitch',  // Bit-crushed static with random pitch
    'oceanDepth',     // Deep rumbles with wave-like modulation
    'windChimes',     // Pentatonic bells with delay
    'electricStorm',  // Crackling with thunder drones
    'tibetanBowls',   // Sustaining resonant harmonics
];

class AmbientSoundSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isActive = false;
        this.isStarted = false;
        this.rng = Math.random;
        this.profile = '';
        this.oscillators = [];
        this.noiseNode = null;
        this.lfo = null;
        this.filter = null;
        this.reverbNode = null;
        this.tick = 0;
        this.mouseSpeed = 0;
        this.prevMouse = { x: 0, y: 0 };
    }

    init() {
        // Set up click listener to activate audio (required by browser policy)
        const activateAudio = () => {
            if (!this.isStarted && this.isActive) {
                this._startAudio();
            }
        };
        window.addEventListener('click', activateAudio, { once: false });
        window.addEventListener('mousedown', activateAudio, { once: false });
    }

    configure(rng, palette) {
        this.rng = rng;
        this.profile = SOUND_PROFILES[Math.floor(rng() * SOUND_PROFILES.length)];

        // If audio was already running, reconfigure it
        if (this.isStarted) {
            this._stopAll();
            this._buildSoundscape();
        }
        this.isActive = true;
    }

    _startAudio() {
        if (this.isStarted) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0;
            this.masterGain.connect(this.ctx.destination);

            // Fade in very gently
            this.masterGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 3);

            this._buildSoundscape();
            this.isStarted = true;

            // Start update loop
            this._updateLoop();
        } catch (e) {
            // Web Audio not supported, fail silently
        }
    }

    _buildSoundscape() {
        if (!this.ctx) return;
        const rng = this.rng;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        switch (this.profile) {
            case 'deepSpace':
                this._createDrone(40 + rng() * 30, 0.04);
                this._createDrone(80 + rng() * 40, 0.02);
                this._createShimmer(800 + rng() * 2000, 0.01, 0.5 + rng() * 2);
                this._createNoise('brown', 0.015);
                break;

            case 'crystalCave':
                this._createBell(440 * Math.pow(2, Math.floor(rng() * 12) / 12), 0.02, 2 + rng() * 3);
                this._createBell(660 * Math.pow(2, Math.floor(rng() * 12) / 12), 0.015, 3 + rng() * 2);
                this._createShimmer(2000 + rng() * 3000, 0.008, 1 + rng() * 2);
                this._createNoise('pink', 0.005);
                break;

            case 'bioOrgan':
                this._createDrone(60 + rng() * 20, 0.03);
                this._createBreather(120 + rng() * 60, 0.02, 0.1 + rng() * 0.3);
                this._createBreather(180 + rng() * 80, 0.015, 0.15 + rng() * 0.2);
                this._createNoise('pink', 0.01);
                break;

            case 'digitalGlitch':
                this._createSquareDrone(55 + rng() * 30, 0.02);
                this._createSquareDrone(110 + rng() * 60, 0.01);
                this._createNoise('white', 0.008);
                this._createGlitchPulse(200 + rng() * 400, 0.01);
                break;

            case 'oceanDepth':
                this._createDrone(30 + rng() * 20, 0.05);
                this._createNoise('brown', 0.03);
                this._createShimmer(100 + rng() * 200, 0.02, 3 + rng() * 5);
                break;

            case 'windChimes': {
                const pentatonic = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
                for (let i = 0; i < 3; i++) {
                    const freq = pentatonic[Math.floor(rng() * pentatonic.length)];
                    this._createBell(freq, 0.01, 2 + rng() * 4);
                }
                this._createNoise('pink', 0.008);
                break;
            }

            case 'electricStorm':
                this._createDrone(50 + rng() * 20, 0.04);
                this._createNoise('white', 0.01);
                this._createCrackle(0.008);
                break;

            case 'tibetanBowls':
                this._createBowl(110 + rng() * 60, 0.03);
                this._createBowl(220 + rng() * 80, 0.02);
                this._createBowl(330 + rng() * 100, 0.015);
                this._createNoise('brown', 0.005);
                break;
        }
    }

    _createDrone(freq, volume) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.value = freq * 3;
        filter.Q.value = 1;
        gain.gain.value = volume;

        // Slow frequency wobble
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1 + this.rng() * 0.3;
        lfoGain.gain.value = freq * 0.02;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this.oscillators.push({ osc, gain, lfo, filter });
    }

    _createShimmer(freq, volume, rate) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0;

        // Tremolo
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = rate;
        lfoGain.gain.value = volume;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this.oscillators.push({ osc, gain, lfo });
    }

    _createNoise(type, volume) {
        const ctx = this.ctx;
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // White noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        if (type === 'brown') {
            filter.type = 'lowpass';
            filter.frequency.value = 200;
        } else if (type === 'pink') {
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
        } else {
            filter.type = 'allpass';
        }

        const gain = ctx.createGain();
        gain.gain.value = volume;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start();

        this.oscillators.push({ osc: source, gain, filter });
    }

    _createBell(freq, volume, decay) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = volume;

        // Repeating bell strike via LFO on gain
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sawtooth';
        lfo.frequency.value = 1 / (decay * 2);
        lfoGain.gain.value = volume;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this.oscillators.push({ osc, gain, lfo });
    }

    _createBreather(freq, volume, breathRate) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0;

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = breathRate;
        lfoGain.gain.value = volume;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this.oscillators.push({ osc, gain, lfo });
    }

    _createSquareDrone(freq, volume) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.value = freq * 2;
        gain.gain.value = volume;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this.oscillators.push({ osc, gain, filter });
    }

    _createGlitchPulse(freq, volume) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.value = volume;

        // Random frequency jumps via LFO
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'square';
        lfo.frequency.value = 2 + this.rng() * 6;
        lfoGain.gain.value = freq * 0.5;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this.oscillators.push({ osc, gain, lfo });
    }

    _createCrackle(volume) {
        this._createNoise('white', volume * 0.5);
    }

    _createBowl(freq, volume) {
        const ctx = this.ctx;
        // Singing bowl = fundamental + overtones
        const harmonics = [1, 2.71, 5.4];
        for (const h of harmonics) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq * h;
            gain.gain.value = volume / (h * h);

            // Slow beating
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 0.2 + this.rng() * 0.5;
            lfoGain.gain.value = gain.gain.value * 0.5;
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            lfo.start();

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();

            this.oscillators.push({ osc, gain, lfo });
        }
    }

    _updateLoop() {
        if (!this.isStarted || !this.ctx) return;
        this.tick++;

        const dx = mouse.x - this.prevMouse.x;
        const dy = mouse.y - this.prevMouse.y;
        this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this.prevMouse = { x: mouse.x, y: mouse.y };

        // Modulate filters/volumes based on mouse speed
        const speedNorm = Math.min(1, this.mouseSpeed / 30);
        for (const node of this.oscillators) {
            if (node.filter && node.filter.type === 'lowpass') {
                const baseFreq = node.filter.frequency.value;
                node.filter.frequency.linearRampToValueAtTime(
                    baseFreq * (1 + speedNorm * 2),
                    this.ctx.currentTime + 0.1
                );
            }
        }

        // Mouse click modulation
        if (isLeftMouseDown && this.masterGain) {
            this.masterGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.2);
        } else if (this.masterGain) {
            this.masterGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.5);
        }

        requestAnimationFrame(() => this._updateLoop());
    }

    _stopAll() {
        for (const node of this.oscillators) {
            try {
                if (node.osc) node.osc.stop();
                if (node.lfo) node.lfo.stop();
            } catch (e) { /* ignore */ }
        }
        this.oscillators = [];
    }
}

export const ambientSound = new AmbientSoundSystem();
