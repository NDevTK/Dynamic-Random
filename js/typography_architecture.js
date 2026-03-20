/**
 * @file typography_architecture.js
 * @description Living Typography background architecture. Cascading words and glyphs
 * form, drift, and dissolve across the canvas. Seed selects word sets, formation
 * patterns, font sizes, and fall speeds. Features object pooling, batch text
 * rendering, mouse interaction, gravity well vortex, and shockwave explosions.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';
import { createNoise2D } from './simplex_noise.js';

const WORD_SETS = [
    ['function', 'const', 'return', 'async', 'import', 'export', 'class', 'await', 'yield', 'let'],
    ['dream', 'whisper', 'starlight', 'eternal', 'silence', 'shimmer', 'aurora', 'cascade', 'echo', 'drift'],
    ['\u221E', '\u03C0', '\u03A3', '\u0394', '\u222B', '\u221A', '\u2248', '\u2202', '\u2207', '\u2261'],
    ['\u2669', '\u266A', '\u266B', '\u266C', '\u266D', '\u266F', '\u{1D11E}', '\u{1D122}', '\u2740', '\u2742'],
    ['\u03C8', '\u03A9', '\u03C6', '\u03BB', '\u03B8', '\u03BE', '\u03B1', '\u03B2', '\u03B3', '\u03B4'],
    ['\u2726', '\u25C6', '\u25CB', '\u25C7', '\u25B3', '\u25BD', '\u2605', '\u2606', '\u25CF', '\u25A0']
];

const FORMATION_RAIN = 0;
const FORMATION_SPIRAL = 1;
const FORMATION_WAVE = 2;
const FORMATION_EXPLOSION = 3;

const MAX_PARTICLES = 120;
const MIN_PARTICLES = 80;

export class TypographyArchitecture extends Architecture {
    constructor() {
        super();
        this.pool = [];
        this.active = [];
        this.wordSet = [];
        this.secondarySet = [];
        this.formation = 0;
        this.minSize = 12;
        this.maxSize = 36;
        this.baseFallSpeed = 1;
        this.noise2D = null;
        this.phraseTimer = 0;
        this.phraseParticles = [];
    }

    init(system) {
        this.noise2D = createNoise2D(system.rng);

        // Seed selects primary and secondary word sets
        const setIndex = Math.floor(system.rng() * WORD_SETS.length);
        const secondIndex = (setIndex + 1 + Math.floor(system.rng() * (WORD_SETS.length - 1))) % WORD_SETS.length;
        this.wordSet = WORD_SETS[setIndex];
        this.secondarySet = WORD_SETS[secondIndex];

        // Seed determines formation pattern
        this.formation = Math.floor(system.rng() * 4);

        // Seed determines font size range
        const sizeVariant = Math.floor(system.rng() * 3);
        if (sizeVariant === 0) {
            this.minSize = 10;
            this.maxSize = 28;
        } else if (sizeVariant === 1) {
            this.minSize = 16;
            this.maxSize = 48;
        } else {
            this.minSize = 8;
            this.maxSize = 64;
        }

        // Seed determines base fall speed
        this.baseFallSpeed = 0.5 + system.rng() * 2.0;

        // Pre-allocate the object pool
        this.pool = [];
        this.active = [];
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.pool.push(this._createBlankParticle());
        }

        // Spawn initial particles scattered across the screen
        const initialCount = MIN_PARTICLES + Math.floor(system.rng() * (MAX_PARTICLES - MIN_PARTICLES));
        for (let i = 0; i < initialCount; i++) {
            const p = this._acquireParticle();
            if (!p) break;
            this._initParticle(p, system, true);
        }

        this.phraseTimer = 0;
        this.phraseParticles = [];
    }

    _createBlankParticle() {
        return {
            x: 0, y: 0, vx: 0, vy: 0,
            char: '', size: 14, alpha: 1,
            life: 0, maxLife: 100,
            hue: 0, rotation: 0,
            active: false
        };
    }

    _acquireParticle() {
        if (this.pool.length === 0) return null;
        const p = this.pool.pop();
        p.active = true;
        this.active.push(p);
        return p;
    }

    _releaseParticle(index) {
        const p = this.active[index];
        p.active = false;
        this.pool.push(p);
        this.active.splice(index, 1);
    }

    _pickChar(rng) {
        const set = rng() > 0.3 ? this.wordSet : this.secondarySet;
        return set[Math.floor(rng() * set.length)];
    }

    _initParticle(p, system, scattered) {
        const rng = system.rng;

        p.char = this._pickChar(rng);
        p.size = this.minSize + rng() * (this.maxSize - this.minSize);
        p.hue = (system.hue + (rng() - 0.5) * 80 + 360) % 360;
        p.rotation = (rng() - 0.5) * 0.6;
        p.maxLife = 120 + rng() * 200;
        p.life = 0;
        p.alpha = 0;

        switch (this.formation) {
            case FORMATION_RAIN:
                p.x = rng() * system.width;
                p.y = scattered ? rng() * system.height : -p.size * 2;
                p.vx = (rng() - 0.5) * 0.5;
                p.vy = this.baseFallSpeed + rng() * 1.5;
                break;

            case FORMATION_SPIRAL: {
                const angle = rng() * Math.PI * 2;
                const radius = 50 + rng() * Math.min(system.width, system.height) * 0.4;
                const cx = system.width / 2;
                const cy = system.height / 2;
                p.x = scattered ? cx + Math.cos(angle) * radius : cx;
                p.y = scattered ? cy + Math.sin(angle) * radius : cy;
                p.vx = Math.cos(angle + Math.PI / 2) * this.baseFallSpeed;
                p.vy = Math.sin(angle + Math.PI / 2) * this.baseFallSpeed;
                break;
            }

            case FORMATION_WAVE:
                p.x = scattered ? rng() * system.width : -p.size * 2;
                p.y = system.height * 0.3 + rng() * system.height * 0.4;
                p.vx = this.baseFallSpeed + rng() * 1.0;
                p.vy = (rng() - 0.5) * 0.3;
                break;

            case FORMATION_EXPLOSION: {
                const cx = system.width / 2;
                const cy = system.height / 2;
                if (scattered) {
                    const a = rng() * Math.PI * 2;
                    const r = rng() * Math.min(system.width, system.height) * 0.45;
                    p.x = cx + Math.cos(a) * r;
                    p.y = cy + Math.sin(a) * r;
                } else {
                    p.x = cx + (rng() - 0.5) * 40;
                    p.y = cy + (rng() - 0.5) * 40;
                }
                const a = Math.atan2(p.y - cy, p.x - cx);
                const speed = this.baseFallSpeed * (0.5 + rng() * 1.5);
                p.vx = Math.cos(a) * speed;
                p.vy = Math.sin(a) * speed;
                break;
            }
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;
        const speed = system.speedMultiplier;

        // Device tilt drift
        const tiltX = system.deviceTilt ? system.deviceTilt.x || 0 : 0;
        const tiltY = system.deviceTilt ? system.deviceTilt.y || 0 : 0;
        const shakeAmount = system.deviceShake || 0;

        // Update active particles
        for (let i = this.active.length - 1; i >= 0; i--) {
            const p = this.active[i];

            p.life += speed;

            // Fade in/out based on life
            const lifeRatio = p.life / p.maxLife;
            if (lifeRatio < 0.1) {
                p.alpha = lifeRatio / 0.1;
            } else if (lifeRatio > 0.8) {
                p.alpha = 1 - (lifeRatio - 0.8) / 0.2;
            } else {
                p.alpha = 1;
            }

            // Formation-specific movement updates
            if (this.formation === FORMATION_SPIRAL) {
                const cx = system.width / 2;
                const cy = system.height / 2;
                const dx = p.x - cx;
                const dy = p.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                // Tangential + slight outward push
                p.vx += (-dy / dist) * 0.02 + dx / dist * 0.005;
                p.vy += (dx / dist) * 0.02 + dy / dist * 0.005;
            } else if (this.formation === FORMATION_WAVE) {
                const noiseVal = this.noise2D(p.x * 0.003, tick * 0.005);
                p.vy += noiseVal * 0.15;
            }

            // Device tilt shifts drift direction
            p.vx += tiltX * 0.02;
            p.vy += tiltY * 0.02;

            // Device shake adds jitter
            if (shakeAmount > 0.1) {
                p.vx += (Math.random() - 0.5) * shakeAmount * 0.5;
                p.vy += (Math.random() - 0.5) * shakeAmount * 0.5;
            }

            // Mouse proximity: push away gently and boost brightness
            const mdx = p.x - mx;
            const mdy = p.y - my;
            const mDistSq = mdx * mdx + mdy * mdy;

            if (system.isGravityWell) {
                // Text vortex: spiral inward toward mouse
                const mDist = Math.sqrt(mDistSq) || 1;
                if (mDist < 350) {
                    const pull = (350 - mDist) / 350;
                    // Tangential component for spiral
                    p.vx += (-mdy / mDist) * pull * 2.5;
                    p.vy += (mdx / mDist) * pull * 2.5;
                    // Inward pull
                    p.vx -= (mdx / mDist) * pull * 1.2;
                    p.vy -= (mdy / mDist) * pull * 1.2;
                    p.rotation += pull * 0.05;
                }
            } else if (mDistSq < 30000) {
                // Characters grow brighter and larger near mouse
                const mDist = Math.sqrt(mDistSq);
                const proximity = 1 - mDist / Math.sqrt(30000);
                p.size *= 1 + proximity * 0.3;
                p.alpha = Math.min(1, p.alpha + proximity * 0.4);
                // Gentle repulsion
                if (mDist > 1) {
                    const push = proximity * 0.8;
                    p.vx += (mdx / mDist) * push;
                    p.vy += (mdy / mDist) * push;
                }
            }

            // Shockwave: text explosion outward
            for (let s = 0; s < system.shockwaves.length; s++) {
                const sw = system.shockwaves[s];
                const sdx = p.x - sw.x;
                const sdy = p.y - sw.y;
                const sDistSq = sdx * sdx + sdy * sdy;
                const sDist = Math.sqrt(sDistSq) || 1;
                if (Math.abs(sDist - sw.radius) < 80) {
                    const impact = (1 - Math.abs(sDist - sw.radius) / 80) * sw.strength;
                    p.vx += (sdx / sDist) * impact * 12;
                    p.vy += (sdy / sDist) * impact * 12;
                    p.rotation += impact * 0.3;
                }
            }

            // Apply velocity
            p.x += p.vx * speed;
            p.y += p.vy * speed;

            // Damping
            p.vx *= 0.97;
            p.vy *= 0.97;

            // Reset size boost (was temporary for mouse proximity)
            // Size is re-calculated at draw time from base

            // Check if particle is dead or off-screen
            const margin = 100;
            const isDead = p.life >= p.maxLife;
            const isOffScreen = p.x < -margin || p.x > system.width + margin ||
                                p.y < -margin || p.y > system.height + margin;

            if (isDead || isOffScreen) {
                this._releaseParticle(i);
            }
        }

        // Respawn particles to maintain count
        while (this.active.length < MIN_PARTICLES && this.pool.length > 0) {
            const p = this._acquireParticle();
            if (!p) break;
            this._initParticle(p, system, false);
        }

        // Phrase formation near mouse: temporarily attract particles toward mouse
        this.phraseTimer -= speed;
        if (this.phraseTimer <= 0) {
            this.phraseTimer = 90 + Math.floor(system.rng() * 120);
            // Select a few nearby particles to form a phrase cluster
            this.phraseParticles = [];
            const phraseLen = 3 + Math.floor(system.rng() * 4);
            let count = 0;
            for (let i = 0; i < this.active.length && count < phraseLen; i++) {
                const p = this.active[i];
                const dx = p.x - mx;
                const dy = p.y - my;
                if (dx * dx + dy * dy < 90000) {
                    this.phraseParticles.push(p);
                    count++;
                }
            }
        }

        // Gently guide phrase particles into a line near mouse, then scatter
        if (this.phraseParticles.length > 0 && this.phraseTimer > 50) {
            const lineY = my - 30;
            const startX = mx - (this.phraseParticles.length * 20) / 2;
            for (let i = 0; i < this.phraseParticles.length; i++) {
                const p = this.phraseParticles[i];
                if (!p.active) continue;
                const targetX = startX + i * 20;
                p.vx += (targetX - p.x) * 0.02;
                p.vy += (lineY - p.y) * 0.02;
            }
        } else if (this.phraseParticles.length > 0 && this.phraseTimer <= 50 && this.phraseTimer > 45) {
            // Scatter the phrase
            for (let i = 0; i < this.phraseParticles.length; i++) {
                const p = this.phraseParticles[i];
                if (!p.active) continue;
                const angle = (i / this.phraseParticles.length) * Math.PI * 2;
                p.vx += Math.cos(angle) * 3;
                p.vy += Math.sin(angle) * 3;
            }
            this.phraseParticles = [];
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Batch text rendering by grouping into size/color buckets
        // Sort active particles into size groups for fewer font changes
        const small = [];    // size < 18
        const medium = [];   // 18 <= size < 36
        const large = [];    // size >= 36

        for (let i = 0; i < this.active.length; i++) {
            const p = this.active[i];
            if (p.alpha <= 0.01) continue;

            // Compute draw size with mouse proximity boost
            const mdx = p.x - mx;
            const mdy = p.y - my;
            const mDistSq = mdx * mdx + mdy * mdy;
            let drawSize = p.size;
            let brightnessBoost = 0;
            if (mDistSq < 30000) {
                const proximity = 1 - Math.sqrt(mDistSq) / Math.sqrt(30000);
                drawSize *= 1 + proximity * 0.5;
                brightnessBoost = proximity * 0.3;
            }

            const entry = { p, drawSize, brightnessBoost };
            if (drawSize < 18) small.push(entry);
            else if (drawSize < 36) medium.push(entry);
            else large.push(entry);
        }

        // Draw each size group with a single font setting
        this._drawGroup(ctx, small, 14, system);
        this._drawGroup(ctx, medium, 26, system);
        this._drawGroup(ctx, large, 48, system);

        ctx.restore();
    }

    _drawGroup(ctx, group, fontSize, system) {
        if (group.length === 0) return;

        ctx.font = `${fontSize}px monospace, serif`;

        for (let i = 0; i < group.length; i++) {
            const { p, drawSize, brightnessBoost } = group[i];
            const scale = drawSize / fontSize;

            // Color with hue and alpha
            const lightness = Math.min(90, 55 + brightnessBoost * 35);
            const alpha = Math.min(1, p.alpha * (0.6 + brightnessBoost));

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.scale(scale, scale);

            // Glow for bright/close particles
            if (brightnessBoost > 0.1) {
                const glowAlpha = brightnessBoost * 0.3 * p.alpha;
                ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, ${glowAlpha})`;
                ctx.shadowBlur = 12 + brightnessBoost * 20;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fillStyle = `hsla(${p.hue}, 80%, ${lightness}%, ${alpha})`;
            ctx.fillText(p.char, 0, 0);

            ctx.restore();
        }
    }
}
