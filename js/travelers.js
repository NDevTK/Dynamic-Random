/**
 * @file travelers.js
 * @description The multiverse is inhabited. Every few minutes a traveler from
 * a sibling universe drifts in: an invisible wanderer marked only by a faint
 * cursor-ring and their own familiar — a different species, colored by their
 * home seed, at their own growth stage. They roam, stop to watch the same
 * points of interest your familiar visits, come over to greet your cursor
 * (their familiar startles in a little wave), and eventually fade back out.
 *
 * Each traveler has a name and a real home seed ("Ilbra · VOID-MAW-2121-III")
 * shown in the HUD while they visit — type it into ?seed= to see where they
 * live. Everything is procedural and client-side; no network, no servers,
 * and traveler familiars never touch your familiar's memory.
 */

import { CursorFamiliar } from './cursor_familiar.js';
import { generateName } from './familiar_memory.js';
import { pointsOfInterest } from './points_of_interest.js';
import { generateRandomSeed, mulberry32, stringToSeed } from './utils.js';

const GEN_SUFFIX = ['', '', '-II', '-III', '-IV', '-V']; // most travelers are gen I-III

class Travelers {
    constructor() {
        this._travelers = [];
        this._tick = 0;
        this._nextArrivalAt = Infinity;
        this._maxConcurrent = 1;
        this._lcg = 1;
        /** @type {{ name: string, homeSeed: string } | null} current visitor for the HUD */
        this.current = null;
    }

    _rand() {
        this._lcg = (Math.imul(this._lcg, 1664525) + 1013904223) >>> 0;
        return this._lcg / 4294967296;
    }

    configure(rng, hues, blueprintName) {
        this._tick = 0;
        this._travelers.length = 0;
        this.current = null;
        this._lcg = ((rng() * 4294967296) >>> 0) || 1;
        this._blueprintName = blueprintName || '';
        this._hues = hues && hues.length ? hues : [{ h: 200, s: 70, l: 60 }];
        // Sociable universes get visitors sooner; hermit universes rarely
        this._maxConcurrent = rng() < 0.12 ? 2 : 1;
        // First arrival 2-5 minutes in, then every 4-9 minutes
        this._nextArrivalAt = 7200 + Math.floor(rng() * 10800);
        this._betweenVisits = [14400, 32400];
    }

    _spawn() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const r = () => this._rand();

        // A home seed from elsewhere in the multiverse, sometimes a descendant
        const homeRng = mulberry32((r() * 4294967296) >>> 0);
        const homeSeed = generateRandomSeed(homeRng) + GEN_SUFFIX[Math.floor(r() * GEN_SUFFIX.length)];
        const name = generateName(stringToSeed(homeSeed) >>> 0);

        // Their familiar is seeded by their HOME, not by this universe — a
        // different species and palette stepping out of a different world
        const famRng = mulberry32(stringToSeed(homeSeed) >>> 0);
        const familiar = new CursorFamiliar(false);
        const homeHue = famRng() * 360;
        familiar.configure(famRng, [
            { h: homeHue, s: 75, l: 62 },
            { h: (homeHue + 140) % 360, s: 85, l: 68 },
        ], this._blueprintName);

        // Enter from a random edge
        const edge = Math.floor(r() * 4);
        const x = edge === 0 ? -40 : edge === 1 ? w + 40 : r() * w;
        const y = edge === 2 ? -40 : edge === 3 ? h + 40 : r() * h;

        const t = {
            name,
            homeSeed,
            familiar,
            x, y,                    // their invisible cursor
            tx: w * (0.2 + r() * 0.6),
            ty: h * (0.2 + r() * 0.6),
            vx: 0, vy: 0,
            alpha: 0,
            state: 'visiting',       // 'visiting' | 'leaving'
            leaveAt: this._tick + 3600 + Math.floor(r() * 5400), // 60-150s stay
            retargetAt: 0,
            dwellUntil: 0,
            clickFrames: 0,
            greeted: false,
        };
        this._travelers.push(t);
        this.current = { name, homeSeed };
    }

    update(mx, my, isClicking) {
        this._tick++;

        if (this._tick >= this._nextArrivalAt && this._travelers.length < this._maxConcurrent) {
            this._spawn();
            const [lo, hi] = this._betweenVisits;
            this._nextArrivalAt = this._tick + lo + Math.floor(this._rand() * (hi - lo));
        }

        const w = window.innerWidth;
        const h = window.innerHeight;

        for (let i = this._travelers.length - 1; i >= 0; i--) {
            const t = this._travelers[i];

            // Fade in while visiting, out while leaving
            if (t.state === 'visiting') {
                t.alpha = Math.min(1, t.alpha + 0.01);
                if (this._tick >= t.leaveAt) {
                    t.state = 'leaving';
                    // Head off the nearest edge
                    t.tx = t.x < w / 2 ? -80 : w + 80;
                    t.ty = t.y;
                }
            } else {
                t.alpha = Math.max(0, t.alpha - 0.008);
                if (t.alpha <= 0) {
                    this._travelers.splice(i, 1);
                    if (this.current && this.current.name === t.name) this.current = null;
                    continue;
                }
            }

            // Choose where to wander next
            if (t.state === 'visiting' && this._tick >= t.retargetAt && this._tick >= t.dwellUntil) {
                const roll = this._rand();
                const poi = roll < 0.45 ? pointsOfInterest.pick(() => this._rand()) : null;
                const pdx = mx - t.x;
                const pdy = my - t.y;
                if (!t.greeted && pdx * pdx + pdy * pdy < 360 * 360 && roll >= 0.45 && roll < 0.7) {
                    // Come say hello: approach the player's cursor once
                    t.tx = mx + (this._rand() - 0.5) * 90;
                    t.ty = my + (this._rand() - 0.5) * 90;
                    t.greeted = true;
                    t.clickFrames = 2; // their familiar startles — a little wave
                } else if (poi) {
                    t.tx = poi.x + (this._rand() - 0.5) * 50;
                    t.ty = poi.y + (this._rand() - 0.5) * 50;
                } else {
                    t.tx = w * (0.1 + this._rand() * 0.8);
                    t.ty = h * (0.1 + this._rand() * 0.8);
                }
                t.retargetAt = this._tick + 240 + Math.floor(this._rand() * 360);
            }

            // Smooth cursor-like motion toward the target, then dwell
            const dx = t.tx - t.x;
            const dy = t.ty - t.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 8) {
                t.vx = (t.vx + (dx / dist) * 0.22) * 0.93;
                t.vy = (t.vy + (dy / dist) * 0.22) * 0.93;
            } else {
                t.vx *= 0.9;
                t.vy *= 0.9;
                if (t.dwellUntil < this._tick) t.dwellUntil = this._tick + 120 + Math.floor(this._rand() * 240);
            }
            t.x += t.vx * 4;
            t.y += t.vy * 4;

            const clicking = t.clickFrames > 0;
            if (t.clickFrames > 0) t.clickFrames--;
            t.familiar.update(t.x, t.y, clicking);
        }
    }

    draw(ctx, system) {
        for (const t of this._travelers) {
            if (t.alpha <= 0.01) continue;
            ctx.save();
            ctx.globalAlpha = t.alpha;
            // A faint ring marks the wanderer themself
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
            ctx.stroke();
            t.familiar.draw(ctx, system);
            ctx.restore();
        }
    }

    get count() {
        return this._travelers.length;
    }
}

export const travelers = new Travelers();
