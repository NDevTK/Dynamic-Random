/** @file speech_typography_architecture.js — spoken words as living typography */

import { Architecture } from './background_architectures.js';
import { speechInput } from './speech_input.js';

const SENTIMENT_HUE = {
    positive: { base: 40,  range: 60 },   // warm yellows → oranges
    negative: { base: 220, range: 60 },   // cool blues → purples
};

const AMBIENT_WORDS   = ['speak', 'listen', 'voice', 'echo', 'sound', 'breathe', 'word', 'flow'];
const MAX_ENTITIES    = 30;
const POOL_SIZE       = 40;
const LIFETIME_MS     = 5000;
const FADE_IN_MS      = 400;
const FADE_OUT_MS     = 1200;
const CONNECT_DIST    = 160;
const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST;

function makeWordEntity() {
    return {
        active: false, text: '',
        x: 0, y: 0, vx: 0, vy: 0,
        scale: 1, rotation: 0, opacity: 0,
        color: '#ffffff', energy: 0,
        bornAt: 0, isAmbient: false,
        fontSize: 20, pulse: 0,
    };
}

export class SpeechTypographyArchitecture extends Architecture {
    constructor() {
        super();
        this.pool        = [];
        this.entities    = [];
        this.palette     = {};
        this.lastWords   = 0;
        this.beatPhase   = 0;
        this.beatEnergy  = 0;
        this.wavePhase   = 0;
        this.ambientTimer = 0;
    }

    init(system) {
        this.pool     = [];
        this.entities = [];
        for (let i = 0; i < POOL_SIZE; i++) this.pool.push(makeWordEntity());

        // Color palette derived from system.hue
        const h = system.hue;
        this.palette = {
            positive: (system.rng() * 60 + 20 + 360) % 360,  // warm hues
            negative: (h + 200 + system.rng() * 40) % 360,   // cool complement
            accent:   (h + 150) % 360,
            base:     h,
        };

        this.lastWords   = 0;
        this.beatPhase   = 0;
        this.beatEnergy  = 0;
        this.wavePhase   = 0;
        this.ambientTimer = 0;

        // Seed initial ambient words scattered across the canvas
        for (let i = 0; i < 5; i++) this._spawnAmbient(system, true);
    }

    update(system) {
        const now   = performance.now();
        const speed = system.speedMultiplier;

        // Beat energy: driven by word-rate when active, decays otherwise
        if (speechInput.active) {
            const targetBeat = Math.min(1, (speechInput.wordRate || 0) / 3);
            this.beatEnergy += (targetBeat - this.beatEnergy) * 0.08;
        } else {
            this.beatEnergy *= 0.95;
        }
        this.beatPhase += 0.06 * speed;
        const beatPulse = Math.sin(this.beatPhase) * 0.5 + 0.5;

        // Ingest new spoken words
        if (speechInput.active) {
            const wordCount = speechInput.words.length;
            if (wordCount > this.lastWords) {
                const startIdx = wordCount - (wordCount - this.lastWords);
                for (let i = startIdx; i < wordCount; i++) {
                    if (this.entities.length < MAX_ENTITIES) {
                        this._spawnWord(system, speechInput.words[i], now);
                    }
                }
            }
            this.lastWords = wordCount;
        } else {
            this.lastWords = 0;
        }

        // Replenish ambient words when not actively speaking
        if (!speechInput.active || !speechInput.isSpeaking) {
            this.ambientTimer -= speed;
            if (this.ambientTimer <= 0) {
                this.ambientTimer = 120 + system.rng() * 200;
                const ambientCount = this.entities.filter(e => e.isAmbient).length;
                if (ambientCount < 6) this._spawnAmbient(system, false);
            }
        }

        // Update all entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e   = this.entities[i];
            const age = now - e.bornAt;

            // Opacity envelope: fade-in / sustain / fade-out
            if (age < FADE_IN_MS) {
                e.opacity = age / FADE_IN_MS;
            }
            const remaining = LIFETIME_MS - age;
            if (remaining < FADE_OUT_MS) {
                e.opacity = Math.min(e.opacity, remaining / FADE_OUT_MS);
            }

            if (age >= LIFETIME_MS || e.opacity < 0) {
                this._release(i);
                continue;
            }

            // Beat-driven pulse on real words
            if (!e.isAmbient && this.beatEnergy > 0.2) {
                e.pulse += (this.beatEnergy * beatPulse * 0.4 - e.pulse) * 0.12;
            } else {
                e.pulse *= 0.9;
            }

            // Physics: gravity, drift, damping, rotation
            e.vy += 0.015 * (e.isAmbient ? 0.1 : 1) * speed;
            e.x  += e.vx * speed;
            e.y  += e.vy * speed;
            e.vx *= 0.985;
            e.vy *= 0.985;
            e.rotation += (e.isAmbient ? 0.0005 : 0.001) * speed;

            // Ambient words wrap at canvas edges
            if (e.isAmbient) {
                if (e.y > system.height + 60) e.y = -60;
                if (e.y < -60)                e.y = system.height + 60;
                if (e.x < -100)               e.x = system.width + 100;
                if (e.x > system.width + 100) e.x = -100;
            }
        }

        this.wavePhase += 0.04 * speed;
    }

    draw(system) {
        const ctx = system.ctx;
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        // Connecting lines between temporally-close real words
        const realWords = this.entities.filter(e => !e.isAmbient && e.opacity > 0.1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 1;
        for (let i = 0; i < realWords.length; i++) {
            for (let j = i + 1; j < realWords.length; j++) {
                const a = realWords[i], b = realWords[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                if (dx * dx + dy * dy > CONNECT_DIST_SQ) continue;
                const dist  = Math.sqrt(dx * dx + dy * dy);
                const alpha = (1 - dist / CONNECT_DIST) * Math.min(a.opacity, b.opacity) * 0.35;
                ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }

        // Draw each word entity
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            if (e.opacity <= 0.01) continue;

            const drawScale = e.scale * (1 + e.pulse);
            const fontSize  = Math.round(e.fontSize * drawScale);
            const isHigh    = e.energy > 0.5 && !e.isAmbient;

            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(e.rotation);
            ctx.globalAlpha = Math.min(1, e.opacity);

            if (isHigh) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.shadowColor = e.color;
                ctx.shadowBlur  = 8 + e.energy * 24;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowBlur  = e.isAmbient ? 4 : 0;
                ctx.shadowColor = e.color;
            }

            ctx.font      = `${e.isAmbient ? 'italic ' : ''}bold ${fontSize}px sans-serif`;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, 0, 0);
            ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;

        // Sound-wave at the bottom when speaking
        if (speechInput.isSpeaking || this.beatEnergy > 0.05) {
            this._drawSoundWave(system);
        }

        ctx.restore();
    }

    _drawSoundWave(system) {
        const ctx   = system.ctx;
        const w     = system.width;
        const baseY = system.height - 28;
        const amp   = 12 + this.beatEnergy * 28;
        const segs  = 80;
        const dx    = w / segs;
        const h     = system.hue;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth   = 1.5;
        ctx.strokeStyle = `hsla(${h}, 70%, 70%, ${0.3 + this.beatEnergy * 0.5})`;
        ctx.shadowColor = `hsl(${h}, 90%, 70%)`;
        ctx.shadowBlur  = 6;

        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
            const x = i * dx;
            const y = baseY
                + Math.sin(this.wavePhase + i * 0.35) * amp
                + Math.sin(this.wavePhase * 1.7 + i * 0.18) * amp * 0.4;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Mirrored ghost wave below
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
            const x = i * dx;
            const y = baseY
                - Math.sin(this.wavePhase + i * 0.35) * amp * 0.5
                - Math.sin(this.wavePhase * 1.7 + i * 0.18) * amp * 0.2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    _spawnWord(system, entry, now) {
        const e = this._acquire();
        if (!e) return;

        e.text      = entry.text;
        e.bornAt    = now;
        e.isAmbient = false;
        e.energy    = entry.energy ?? 1.0;
        e.pulse     = 0;
        e.opacity   = 0;

        // Spawn in the lower-center region, scattered by word count
        const cx = system.width * 0.5;
        const cy = system.height * 0.6;
        e.x = cx + (system.rng() - 0.5) * system.width * 0.55;
        e.y = cy + (system.rng() - 0.5) * system.height * 0.3;

        // Initial velocity: upward drift, slight sideways
        e.vx = (system.rng() - 0.5) * 1.6;
        e.vy = -(0.3 + system.rng() * 0.9);

        // Size scales with word length and energy
        e.fontSize = 16 + Math.min(entry.text.length, 10) * 2.2 + e.energy * 10;
        e.scale    = 0.8 + system.rng() * 0.6;
        e.rotation = (system.rng() - 0.5) * 0.3;
        e.color    = this._sentimentColor(system);

        return e;
    }

    _spawnAmbient(system, scattered) {
        const e = this._acquire();
        if (!e) return;

        e.text      = AMBIENT_WORDS[Math.floor(system.rng() * AMBIENT_WORDS.length)];
        e.bornAt    = performance.now() - (scattered ? system.rng() * LIFETIME_MS * 0.8 : 0);
        e.isAmbient = true;
        e.energy    = 0.1;
        e.pulse     = 0;
        e.x         = system.rng() * system.width;
        e.y         = scattered
            ? system.rng() * system.height
            : (system.rng() > 0.5 ? -40 : system.height + 40);
        e.vx       = (system.rng() - 0.5) * 0.4;
        e.vy       = (system.rng() - 0.5) * 0.25 - 0.08;
        e.fontSize = 14 + system.rng() * 18;
        e.scale    = 0.7 + system.rng() * 0.5;
        e.rotation = (system.rng() - 0.5) * 0.2;
        e.opacity  = scattered ? system.rng() * 0.4 : 0;
        e.color    = `hsla(${system.hue}, 30%, 70%, 1)`;

        return e;
    }

    _sentimentColor(system) {
        const s = speechInput.sentiment;
        if (s === 'neutral') return `hsl(${system.hue}, 20%, 90%)`;

        // Use pre-computed palette hues from init()
        let baseH;
        if (s === 'positive') {
            baseH = this.palette.positive ?? SENTIMENT_HUE.positive.base;
        } else {
            baseH = this.palette.negative ?? SENTIMENT_HUE.negative.base;
        }
        const spread = SENTIMENT_HUE[s]?.range ?? 40;
        const h      = (baseH + (system.rng() - 0.5) * spread + 360) % 360;
        return `hsl(${h}, ${75 + system.rng() * 20}%, ${65 + system.rng() * 20}%)`;
    }

    _acquire() {
        if (this.pool.length === 0) return null;
        const e = this.pool.pop();
        e.active = true;
        this.entities.push(e);
        return e;
    }

    _release(index) {
        const e = this.entities[index];
        e.active = false;
        this.pool.push(e);
        this.entities.splice(index, 1);
    }
}
