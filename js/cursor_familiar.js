/**
 * @file cursor_familiar.js
 * @description The cursor familiar: every universe hatches one small companion
 * creature that lives at your cursor. It spring-follows with species-specific
 * locomotion, gets visibly excited when you move fast, dozes off (dims, slows,
 * settles) when you go idle, and startles when you click.
 *
 * This replaces the old generic inline effects (click ripples, mouse-trail
 * ribbon, gravity field lines, heat map, echo ghosts, constellation links)
 * with one cohesive, characterful system. Trails and glows already have
 * dedicated layers (cursor_trails.js / cursor_effects.js); the familiar is a
 * creature, not a trail.
 *
 * Seed-driven variation: species (6, weighted toward the active blueprint),
 * size, palette hues, follow lag and offset, doze threshold, plus all
 * species-internal anatomy (moth count, serpent length, shard shells...).
 */

import { FAMILIAR_SPECIES, selectSpecies } from './familiar_species.js';
import { familiarMemory } from './familiar_memory.js';

const TAU = Math.PI * 2;

const MAX_TRAIL = 70;

class CursorFamiliar {
    constructor() {
        this.species = FAMILIAR_SPECIES[0];
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.heading = 0;
        this.speed = 0;
        this.excitement = 0;
        this.mode = 'follow';
        this.startleT = 0;
        this.dozeT = 0;
        this.size = 6;
        this.stage = 0;
        this.hue = 200;
        this.hue2 = 60;
        this.tick = 0;
        this.aux = null;

        this._idleTicks = 0;
        this._dozeAfter = 360;
        this._followK = 0.05;
        this._damping = 0.82;
        this._offsetAng = 0;
        this._offsetR = 0;
        this._wasClicking = false;
        this._prevMx = 0;
        this._prevMy = 0;
        this._inited = false;
        this._lcg = 1;
        this.rand = () => {
            this._lcg = (Math.imul(this._lcg, 1664525) + 1013904223) >>> 0;
            return this._lcg / 4294967296;
        };

        // Pooled trail particles, styled per species (ember/petal/spark/ink/ring)
        this._trail = [];
        this._trailPool = [];
        this.emit = (style, x, y, vx, vy, life, size) => {
            if (this._trail.length >= MAX_TRAIL) return;
            const p = this._trailPool.length > 0 ? this._trailPool.pop() : {};
            p.style = style;
            p.x = x; p.y = y; p.vx = vx; p.vy = vy;
            p.life = life; p.maxLife = life; p.size = size;
            this._trail.push(p);
        };
    }

    configure(rng, hues, blueprintName) {
        this.species = selectSpecies(rng, blueprintName || '');
        // Familiars grow with cumulative play time across visits (familiar_memory.js)
        const stage = familiarMemory.loaded ? familiarMemory.stage : 0;
        this.stage = stage;
        this.size = (4.5 + rng() * 4) * (0.85 + stage * 0.12);
        this.hue = hues && hues.length > 0 ? hues[0].h : rng() * 360;
        this.hue2 = hues && hues.length > 1 ? hues[1].h : (this.hue + 150) % 360;
        this._followK = 0.035 + rng() * 0.04;
        this._damping = 0.78 + rng() * 0.08;
        this._dozeAfter = 300 + Math.floor(rng() * 360);
        // Familiars hover beside the cursor, not on top of it
        this._offsetAng = rng() * TAU;
        this._offsetR = 26 + rng() * 22;
        this._lcg = ((rng() * 4294967296) >>> 0) || 1;

        this.tick = 0;
        this.mode = 'follow';
        this.startleT = 0;
        this.dozeT = 0;
        this.excitement = 0;
        this._idleTicks = 0;
        this._inited = false;
        this._trail.length = 0;

        this.species.init(this, rng);
    }

    update(mx, my, isClicking) {
        this.tick++;

        if (!this._inited) {
            this._inited = true;
            this.x = mx;
            this.y = my;
            this._prevMx = mx;
            this._prevMy = my;
        }

        // Cursor activity → excitement + idle tracking
        const mdx = mx - this._prevMx;
        const mdy = my - this._prevMy;
        const mouseSpeed = Math.hypot(mdx, mdy);
        this._prevMx = mx;
        this._prevMy = my;
        this.excitement += (Math.min(1, mouseSpeed / 18) - this.excitement) * 0.06;
        if (mouseSpeed > 1.5 || isClicking) this._idleTicks = 0;
        else this._idleTicks++;

        // Time genuinely spent together feeds long-term growth
        if (this.excitement > 0.05) familiarMemory.recordActivity();

        // Startle on click edge
        if (isClicking && !this._wasClicking) {
            this.startleT = 1;
            this.mode = 'follow';
            this._idleTicks = 0;
        }
        this._wasClicking = isClicking;
        if (this.startleT > 0) this.startleT = Math.max(0, this.startleT - 0.025);

        // Doze state eases in and out
        const dozing = this._idleTicks > this._dozeAfter;
        this.mode = this.startleT > 0.5 ? 'startle' : dozing ? 'doze' : 'follow';
        this.dozeT += ((dozing ? 1 : 0) - this.dozeT) * 0.02;

        // Spring-follow a perch point near the cursor; the offset drifts so the
        // familiar circles you while you work
        this._offsetAng += 0.004 + this.excitement * 0.01;
        const perchR = this._offsetR * (1 - this.dozeT * 0.4) * (1 - this.excitement * 0.5);
        const tx = mx + Math.cos(this._offsetAng) * perchR;
        const ty = my + Math.sin(this._offsetAng) * perchR * 0.7;
        const k = this._followK * (this.mode === 'startle' ? 2.2 : 1) * (1 - this.dozeT * 0.7);
        this.vx = (this.vx + (tx - this.x) * k) * this._damping;
        this.vy = (this.vy + (ty - this.y) * k) * this._damping;
        this.x += this.vx;
        this.y += this.vy;

        this.speed = Math.hypot(this.vx, this.vy);
        if (this.speed > 0.3) {
            const targetHeading = Math.atan2(this.vy, this.vx);
            let d = (targetHeading - this.heading) % TAU;
            if (d > Math.PI) d -= TAU;
            if (d < -Math.PI) d += TAU;
            this.heading += d * 0.2;
        }

        this.species.update(this);

        // Trail particles
        for (let i = this._trail.length - 1; i >= 0; i--) {
            const p = this._trail[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.life--;
            if (p.life <= 0) {
                this._trailPool.push(p);
                this._trail[i] = this._trail[this._trail.length - 1];
                this._trail.pop();
            }
        }
    }

    draw(ctx, system) {
        // Trail behind the body so the creature reads on top
        if (this._trail.length > 0) this._drawTrail(ctx);

        // Venerable+ familiars carry a faint breathing aura
        if (this.stage >= 3) {
            const auraR = this.size * (2.6 + Math.sin(this.tick * 0.04) * 0.4) * (1 - this.dozeT * 0.3);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `hsla(${this.hue2}, 80%, 75%, ${this.stage >= 4 ? 0.22 : 0.12})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, auraR, 0, TAU);
            ctx.stroke();
            ctx.restore();
        }

        this.species.draw(ctx, this);

        // Doze tell: drifting 'z' sparkles
        if (this.dozeT > 0.6 && this.tick % 90 < 2) {
            this.emit('spark', this.x + 8, this.y - 10, 0.15, -0.35, 70, 1.4);
        }
    }

    _drawTrail(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this._trail) {
            const t = p.life / p.maxLife;
            switch (p.style) {
                case 'ember':
                    ctx.fillStyle = `hsla(${this.hue}, 95%, ${55 + t * 30}%, ${t * 0.7})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * t, 0, TAU);
                    ctx.fill();
                    break;
                case 'petal':
                    ctx.fillStyle = `hsla(${this.hue2}, 70%, 78%, ${t * 0.5})`;
                    ctx.fillRect(p.x - p.size, p.y - p.size * 0.4, p.size * 2, p.size * 0.8);
                    break;
                case 'ink':
                    ctx.fillStyle = `hsla(${this.hue}, 60%, 25%, ${t * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, TAU);
                    ctx.fill();
                    break;
                case 'ring': {
                    const r = p.size * (1.4 - t) * 3;
                    ctx.strokeStyle = `hsla(${this.hue2}, 90%, 70%, ${t * 0.6})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, TAU);
                    ctx.stroke();
                    break;
                }
                default: // spark
                    ctx.fillStyle = `hsla(${this.hue2}, 90%, 85%, ${t * 0.8})`;
                    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        }
        ctx.restore();
    }
}

export const cursorFamiliar = new CursorFamiliar();
