/**
 * @file rune_sigil_effects.js
 * @description Interactive effect: procedurally-generated runic alphabet floats
 * across the screen. Each seed produces a completely different glyph set (see
 * rune_sigil_alphabet.js), layout, motion personality, and cursor interaction.
 *
 * Seed-driven variation:
 *  - 4 layout modes: scattered, orbital-rings, grid, galactic-spiral
 *  - 3 interaction modes: attract (runes chase cursor), repel (scatter away),
 *    orbit (swirl around at fixed radius)
 *  - 4 glyph render styles (solid, dashed, wide-glow, double-stroke)
 *  - 3 linking modes: none, proximity-threads, nearest-neighbor-web
 *  - seed-specific alphabet (6-12 unique glyphs)
 *  - rune count, size, rotation speed, color drift all parameterized
 *
 * Cursor interaction: runes within influence radius react per mode.
 * Click triggers a "sigil cast" - nearby runes burst outward leaving spiraling
 * stroke trails as they fly away and respawn.
 */

import { generateRuneAlphabet, drawGlyph } from './rune_sigil_alphabet.js';

const TAU = Math.PI * 2;

export class RuneSigils {
    constructor() {
        this._runes = [];
        this._alphabet = null;
        this._layoutMode = 0;
        this._interactionMode = 0;
        this._linkMode = 0;
        this._baseHue = 200;
        this._hueDrift = 0;
        this._influenceRadius = 200;
        this._linkRadius = 150;
        this._tick = 0;
        this._casts = [];
        this._castPool = [];
        this._maxCasts = 60;
        this._wasClicking = false;
        this._centerX = 0;
        this._centerY = 0;
        this._rotationSense = 1;
        this._runeCountTarget = 18;
        this._rngState = 1;
    }

    // Local deterministic PRNG for click-time randomness (mulberry32).
    _rand() {
        this._rngState = (this._rngState + 0x6D2B79F5) | 0;
        let t = this._rngState;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
    }

    configure(rng, palette) {
        this._tick = 0;
        this._rngState = (rng() * 0xFFFFFFFF) | 0;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this._centerX = w * 0.5;
        this._centerY = h * 0.5;

        const glyphCount = 6 + Math.floor(rng() * 7); // 6-12 unique glyphs
        this._alphabet = generateRuneAlphabet(rng, glyphCount);

        this._layoutMode = Math.floor(rng() * 4);
        this._interactionMode = Math.floor(rng() * 3);
        this._linkMode = Math.floor(rng() * 3);
        this._rotationSense = rng() < 0.5 ? -1 : 1;

        this._runeCountTarget = 14 + Math.floor(rng() * 18); // 14-31
        this._influenceRadius = 150 + rng() * 180;
        this._linkRadius = 110 + rng() * 120;
        this._hueDrift = (rng() - 0.5) * 0.4;

        this._baseHue = palette && palette.length > 0
            ? palette[Math.floor(rng() * palette.length)].h
            : rng() * 360;

        // Create runes
        this._runes = [];
        for (let i = 0; i < this._runeCountTarget; i++) {
            this._runes.push(this._makeRune(rng, i, this._runeCountTarget, w, h));
        }
    }

    _makeRune(rng, i, total, w, h) {
        const t = i / total;
        let x, y;
        switch (this._layoutMode) {
            case 0: // scattered
                x = rng() * w;
                y = rng() * h;
                break;
            case 1: { // orbital rings - 2-3 rings
                const rings = 3;
                const ring = i % rings;
                const radius = (ring + 1) * Math.min(w, h) * 0.15;
                const ang = t * TAU * 3 + ring * 0.7;
                x = this._centerX + Math.cos(ang) * radius;
                y = this._centerY + Math.sin(ang) * radius;
                break;
            }
            case 2: { // grid
                const cols = Math.ceil(Math.sqrt(total));
                const rows = Math.ceil(total / cols);
                const cx = i % cols;
                const cy = Math.floor(i / cols);
                const cellW = w / (cols + 1);
                const cellH = h / (rows + 1);
                x = cellW * (cx + 1) + (rng() - 0.5) * cellW * 0.3;
                y = cellH * (cy + 1) + (rng() - 0.5) * cellH * 0.3;
                break;
            }
            case 3: { // galactic spiral
                const spiralT = t * 4;
                const r = spiralT * Math.min(w, h) * 0.08;
                const ang = spiralT * TAU * 0.6;
                x = this._centerX + Math.cos(ang) * r;
                y = this._centerY + Math.sin(ang) * r;
                break;
            }
        }

        const size = 20 + rng() * 30;
        return {
            x, y,
            baseX: x, baseY: y,
            vx: (rng() - 0.5) * 0.4,
            vy: (rng() - 0.5) * 0.4,
            size,
            rot: rng() * TAU,
            rotSpeed: (rng() - 0.5) * 0.008 * this._rotationSense,
            glyphIdx: Math.floor(rng() * this._alphabet.glyphs.length),
            phase: rng() * TAU,
            hueOffset: (rng() - 0.5) * 60,
            alpha: 0,
            targetAlpha: 0.5 + rng() * 0.4,
            bobAmp: 4 + rng() * 8,
            bobFreq: 0.01 + rng() * 0.02,
            pulseScale: 0,
        };
    }

    update(mx, my, isClicking) {
        this._tick++;

        if (isClicking && !this._wasClicking) this._castSigil(mx, my);
        this._wasClicking = isClicking;

        const influenceSq = this._influenceRadius * this._influenceRadius;
        const invInfluence = 1 / this._influenceRadius;
        const baseRotSpeed = 0.003 * this._rotationSense;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const margin = 60;

        for (let i = 0; i < this._runes.length; i++) {
            const r = this._runes[i];

            if (r.alpha < r.targetAlpha) r.alpha = Math.min(r.targetAlpha, r.alpha + 0.01);

            r.phase += r.bobFreq;

            // Spring toward base position.
            r.vx += (r.baseX - r.x) * 0.002;
            r.vy += (r.baseY - r.y) * 0.002;

            const dx = mx - r.x;
            const dy = my - r.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < influenceSq && distSq > 1) {
                const dist = Math.sqrt(distSq);
                const strength = 1 - dist * invInfluence;
                const nx = dx / dist;
                const ny = dy / dist;
                switch (this._interactionMode) {
                    case 0: // attract
                        r.vx += nx * strength * 0.3;
                        r.vy += ny * strength * 0.3;
                        break;
                    case 1: // repel
                        r.vx -= nx * strength * 0.5;
                        r.vy -= ny * strength * 0.5;
                        break;
                    case 2: // orbit: perpendicular push + slight inward
                        r.vx += (-ny * 0.6 - nx * 0.1) * strength;
                        r.vy += (nx * 0.6 - ny * 0.1) * strength;
                        break;
                }
                r.pulseScale = Math.min(0.4, r.pulseScale + strength * 0.03);
                r.rotSpeed += strength * 0.001 * this._rotationSense;
            } else {
                r.pulseScale *= 0.95;
            }

            r.vx *= 0.94;
            r.vy *= 0.94;
            r.x += r.vx;
            r.y += r.vy;
            r.rot += r.rotSpeed;
            r.rotSpeed *= 0.99;
            r.rotSpeed += (baseRotSpeed - r.rotSpeed) * 0.02;

            if (r.x < -margin) { r.x = w + margin; r.baseX = r.x; }
            else if (r.x > w + margin) { r.x = -margin; r.baseX = r.x; }
            if (r.y < -margin) { r.y = h + margin; r.baseY = r.y; }
            else if (r.y > h + margin) { r.y = -margin; r.baseY = r.y; }
        }

        for (let i = this._casts.length - 1; i >= 0; i--) {
            const c = this._casts[i];
            c.x += c.vx;
            c.y += c.vy;
            c.vx *= 0.97;
            c.vy *= 0.97;
            c.rot += c.rotSpeed;
            c.life--;
            c.alpha = Math.max(0, c.life / c.maxLife);
            c.size *= 0.985;
            if (c.life <= 0) {
                this._castPool.push(c);
                this._casts[i] = this._casts[this._casts.length - 1];
                this._casts.pop();
            }
        }
    }

    _castSigil(mx, my) {
        if (!this._alphabet) return;
        // Find nearest 5-8 runes and burst them
        const burstRadius = 250;
        const burstRadiusSq = burstRadius * burstRadius;
        const burstables = [];
        for (const r of this._runes) {
            const dx = r.x - mx;
            const dy = r.y - my;
            const dsq = dx * dx + dy * dy;
            if (dsq < burstRadiusSq) burstables.push({ r, dsq });
        }
        burstables.sort((a, b) => a.dsq - b.dsq);
        const count = Math.min(8, burstables.length);

        for (let i = 0; i < count; i++) {
            const { r } = burstables[i];
            if (this._casts.length >= this._maxCasts) break;
            const c = this._castPool.length > 0 ? this._castPool.pop() : {};
            c.x = r.x;
            c.y = r.y;
            const ang = Math.atan2(r.y - my, r.x - mx) + (this._rand() - 0.5) * 0.6;
            const speed = 4 + this._rand() * 6;
            c.vx = Math.cos(ang) * speed;
            c.vy = Math.sin(ang) * speed;
            c.rot = r.rot;
            c.rotSpeed = (this._rand() - 0.5) * 0.2;
            c.size = r.size * (1 + this._rand() * 0.6);
            c.glyphIdx = r.glyphIdx;
            c.hueOffset = r.hueOffset;
            c.maxLife = 40 + Math.floor(this._rand() * 30);
            c.life = c.maxLife;
            c.alpha = 1;
            this._casts.push(c);

            // Respawn rune at a new base position.
            const angT = this._rand() * TAU;
            const dist = 150 + this._rand() * 300;
            r.baseX = mx + Math.cos(angT) * dist;
            r.baseY = my + Math.sin(angT) * dist;
            r.x = r.baseX;
            r.y = r.baseY;
            r.alpha = 0;
            r.vx = 0;
            r.vy = 0;
            r.pulseScale = 0.5;
        }
    }

    draw(ctx, system) {
        if (!this._alphabet || this._runes.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this._linkMode !== 0) this._drawLinks(ctx);

        const style = this._alphabet.style;
        const glyphs = this._alphabet.glyphs;
        const hueShift = this._tick * this._hueDrift;

        for (let i = 0; i < this._runes.length; i++) {
            const r = this._runes[i];
            if (r.alpha <= 0.01) continue;
            const bobX = Math.cos(r.phase) * r.bobAmp;
            const bobY = Math.sin(r.phase * 1.3) * r.bobAmp;
            const hue = (this._baseHue + r.hueOffset + hueShift + 360) % 360;
            const drawSize = r.size * (1 + r.pulseScale);
            drawGlyph(ctx, glyphs[r.glyphIdx], r.x + bobX, r.y + bobY,
                drawSize, r.rot, hue, r.alpha, style);
        }

        for (let i = 0; i < this._casts.length; i++) {
            const c = this._casts[i];
            const hue = (this._baseHue + c.hueOffset + hueShift + 40 + 360) % 360;
            drawGlyph(ctx, glyphs[c.glyphIdx], c.x, c.y, c.size, c.rot, hue, c.alpha * 0.7, style);
        }

        ctx.restore();
    }

    _drawLinks(ctx) {
        const linkRadiusSq = this._linkRadius * this._linkRadius;
        const runes = this._runes;
        const n = runes.length;
        const hue = this._baseHue;

        ctx.lineWidth = 0.8;
        ctx.beginPath();
        let linkCount = 0;
        let avgAlpha = 0;

        if (this._linkMode === 1) {
            // Proximity threads - all within radius
            for (let i = 0; i < n; i++) {
                const a = runes[i];
                if (a.alpha < 0.1) continue;
                for (let j = i + 1; j < n; j++) {
                    const b = runes[j];
                    if (b.alpha < 0.1) continue;
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dsq = dx * dx + dy * dy;
                    if (dsq < linkRadiusSq) {
                        const alpha = (1 - dsq / linkRadiusSq) * Math.min(a.alpha, b.alpha) * 0.35;
                        avgAlpha += alpha;
                        linkCount++;
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                    }
                }
            }
        } else {
            // Nearest-neighbor web - each rune links to its 2 closest
            for (let i = 0; i < n; i++) {
                const a = runes[i];
                if (a.alpha < 0.1) continue;
                let best1 = -1, best2 = -1;
                let d1 = Infinity, d2 = Infinity;
                for (let j = 0; j < n; j++) {
                    if (j === i) continue;
                    const b = runes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dsq = dx * dx + dy * dy;
                    if (dsq < d1) { d2 = d1; best2 = best1; d1 = dsq; best1 = j; }
                    else if (dsq < d2) { d2 = dsq; best2 = j; }
                }
                if (best1 >= 0 && d1 < linkRadiusSq * 4) {
                    const b = runes[best1];
                    const alpha = 0.25 * Math.min(a.alpha, b.alpha);
                    avgAlpha += alpha;
                    linkCount++;
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                }
                if (best2 >= 0 && d2 < linkRadiusSq * 4) {
                    const b = runes[best2];
                    const alpha = 0.15 * Math.min(a.alpha, b.alpha);
                    avgAlpha += alpha;
                    linkCount++;
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                }
            }
        }

        if (linkCount > 0) {
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${avgAlpha / linkCount})`;
            ctx.stroke();
        }
    }
}
