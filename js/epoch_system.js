/**
 * @file epoch_system.js
 * @description Universes age. Each seed lives through four epochs over
 * roughly twenty minutes of wall-clock time — First Light, The Long Noon,
 * Amber Hour, The Last Ember — with the simulation slowly brightening,
 * blooming, dimming, and finally guttering out. At heat death the universe
 * is reborn as its own descendant: the seed gains a generation numeral
 * (COSMIC-DRIFT-1234 → COSMIC-DRIFT-1234-II), so lineages stay shareable
 * via the URL.
 *
 * Modifiers ride existing knobs (particle speed, particle cap, background
 * hue bias and dimming) and are recaptured from scratch whenever a new
 * universe generates, so epochs never fight blueprint or mutator setup.
 */

import { currentSeed, cataclysmInProgress } from './state.js';
import { generateUniverse } from './universe.js';
import { background } from './background.js';
import { gamepadInput } from './gamepad_input.js';
import { mulberry32, stringToSeed } from './utils.js';

const EPOCHS = [
    { name: 'First Light',   speedMul: 1.08, maxMul: 1.0,  dim: 0,    hueBias: 8 },
    { name: 'The Long Noon', speedMul: 1.0,  maxMul: 1.0,  dim: 0,    hueBias: 0 },
    { name: 'Amber Hour',    speedMul: 0.85, maxMul: 0.9,  dim: 0.07, hueBias: -12 },
    { name: 'The Last Ember', speedMul: 0.62, maxMul: 0.65, dim: 0.16, hueBias: -22 },
];

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

export function toRoman(n) {
    let out = '';
    for (const [v, s] of ROMAN) {
        while (n >= v) { out += s; n -= v; }
    }
    return out;
}

export function fromRoman(str) {
    const vals = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
    let total = 0;
    for (let i = 0; i < str.length; i++) {
        const v = vals[str[i]];
        if (!v) return NaN;
        const next = vals[str[i + 1]] || 0;
        total += v < next ? -v : v;
    }
    return total;
}

/** Split a seed into its lineage base and generation (1 = no suffix). */
export function parseLineage(seed) {
    const m = /^(.*)-([MDCLXVI]+)$/.exec(seed || '');
    if (m) {
        const gen = fromRoman(m[2]);
        // Only canonical numerals count, so word-seeds that merely end in
        // roman-looking letters (or junk like IIII) aren't mistaken for lineage
        if (Number.isFinite(gen) && gen >= 2 && toRoman(gen) === m[2]) {
            return { base: m[1], generation: gen };
        }
    }
    return { base: seed || '', generation: 1 };
}

/** The next seed in a lineage: base name with an incremented numeral. */
export function descendantSeed(seed) {
    const { base, generation } = parseLineage(seed);
    return `${base}-${toRoman(generation + 1)}`;
}

export const epochSystem = {
    /** @type {{ name: string, generation: number, progress: number }} */
    current: { name: EPOCHS[0].name, generation: 1, progress: 0 },
    epochIndex: 0,

    _seed: null,
    _age: 0,
    _ticksPerEpoch: 14400, // ~4 min at 60fps, re-seeded per universe
    _baseSpeed: 1,
    _baseMax: 400,
    _rebirthing: false,

    /** Called once per frame from the simulation loop. */
    update(pJS) {
        if (cataclysmInProgress) return;

        if (currentSeed !== this._seed) this._adopt(pJS);
        if (!this._seed) return;

        this._age++;
        const lifeTicks = this._ticksPerEpoch * EPOCHS.length;

        if (this._age >= lifeTicks) {
            this._rebirth(pJS);
            return;
        }

        const idx = Math.min(EPOCHS.length - 1, Math.floor(this._age / this._ticksPerEpoch));
        const within = (this._age - idx * this._ticksPerEpoch) / this._ticksPerEpoch;
        this.epochIndex = idx;
        this.current.name = EPOCHS[idx].name;
        this.current.progress = within;

        // Smoothly blend toward the next epoch's character across each epoch
        const a = EPOCHS[idx];
        const b = EPOCHS[Math.min(EPOCHS.length - 1, idx + 1)];
        const t = within;
        const speedMul = a.speedMul + (b.speedMul - a.speedMul) * t;
        const maxMul = a.maxMul + (b.maxMul - a.maxMul) * t;

        pJS.particles.move.speed = this._baseSpeed * speedMul;
        pJS.particles.number.value_max = Math.round(this._baseMax * maxMul);
        background.epochDim = a.dim + (b.dim - a.dim) * t;
        background.epochHueBias = a.hueBias + (b.hueBias - a.hueBias) * t;
        background.epochIndex = idx; // consumed by the generative soundtrack
    },

    /** A new universe just generated: reset age and capture its baselines. */
    _adopt(pJS) {
        this._seed = currentSeed;
        this._age = 0;
        this._rebirthing = false;
        this.epochIndex = 0;
        const lineage = parseLineage(currentSeed);
        this.current = { name: EPOCHS[0].name, generation: lineage.generation, progress: 0 };
        // Per-universe lifespan: 3.5–5.5 minutes per epoch
        const rng = mulberry32(stringToSeed(String(currentSeed) + ':epoch'));
        this._ticksPerEpoch = 12600 + Math.floor(rng() * 7200);
        this._baseSpeed = pJS.particles.move.speed;
        this._baseMax = pJS.particles.number.value_max;
        background.epochDim = 0;
        background.epochHueBias = EPOCHS[0].hueBias;
        background.epochIndex = 0;
    },

    /** Heat death: a small supernova flourish, then the descendant takes over. */
    _rebirth(pJS) {
        if (this._rebirthing) return;
        this._rebirthing = true;
        const child = descendantSeed(this._seed);
        const cx = background.width / 2;
        const cy = background.height / 2;
        background.createShockwave(cx, cy);
        background.createShockwave(cx, cy);
        background.createShockwave(cx, cy);
        gamepadInput.vibrate(500, 0.8, 0.8);
        background.epochDim = 0;
        generateUniverse(pJS, child, false);
    },
};
