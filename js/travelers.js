/**
 * @file travelers.js
 * @description The multiverse is inhabited — and its visitors evolve. Every
 * few minutes a traveler from a sibling universe drifts in: an invisible
 * wanderer marked by a faint cursor-ring and their own familiar (species,
 * palette, and growth stage seeded by THEIR home seed, not yours).
 *
 * Each traveler is steered by a tiny neural network (neural_brain.js): it
 * senses your cursor, the nearest point of interest, the walls, its own
 * motion and an internal rhythm, and outputs urges — steer, dwell,
 * sociability (a high social urge near your cursor makes its familiar
 * startle in a little wave). When a visitor departs, the visit is scored by
 * how it actually went — time spent near you, points of interest watched,
 * staying on screen, moving like a living thing — and good minds enter a
 * localStorage gene pool (traveler_minds.js). Most future travelers are
 * mutated offspring of past well-received visitors, so across your sessions
 * the population evolves toward personalities you engage with; occasional
 * fresh "immigrant" minds keep it diverse.
 *
 * The HUD introduces each visitor — "✦ Ilbra is visiting · a curious mind,
 * gen 3 · home: VOID-MAW-2121-III" — and the home seed is a real, shareable
 * seed. Fully procedural and client-side; no network, no servers, and
 * traveler familiars never touch your familiar's memory.
 */

import { CursorFamiliar } from './cursor_familiar.js';
import { generateName } from './familiar_memory.js';
import { pointsOfInterest } from './points_of_interest.js';
import { generateRandomSeed, mulberry32, stringToSeed } from './utils.js';
import { TinyBrain } from './neural_brain.js';
import { travelerMinds } from './traveler_minds.js';

const GEN_SUFFIX = ['', '', '-II', '-III', '-IV', '-V']; // most travelers are gen I-III

// Brain layout: senses → urges
const BRAIN_IN = 10;   // cursor dx/dy, poi dx/dy, vx/vy, wall x/y, rhythm, visit progress
const BRAIN_HID = 8;
const BRAIN_OUT = 4;   // steerX, steerY, dwell, social

class Travelers {
    constructor() {
        this._travelers = [];
        this._tick = 0;
        this._nextArrivalAt = Infinity;
        this._maxConcurrent = 1;
        this._lcg = 1;
        this._inputs = new Float32Array(BRAIN_IN);
        /** @type {{ name: string, homeSeed: string, mind: string } | null} for the HUD */
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

        // The mind: usually a mutated descendant of a past well-received
        // visitor, otherwise a fresh immigrant
        const genomeLen = TinyBrain.genomeSize(BRAIN_IN, BRAIN_HID, BRAIN_OUT);
        const parent = r() < 0.7 ? travelerMinds.sample(r, genomeLen) : null;
        const genome = parent
            ? TinyBrain.mutate(parent.g, r)
            : TinyBrain.randomGenome(r, BRAIN_IN, BRAIN_HID, BRAIN_OUT);
        const mindGen = parent ? parent.gen + 1 : 0;

        // Enter from a random edge
        const edge = Math.floor(r() * 4);
        const x = edge === 0 ? -40 : edge === 1 ? w + 40 : r() * w;
        const y = edge === 2 ? -40 : edge === 3 ? h + 40 : r() * h;

        const stay = 3600 + Math.floor(r() * 5400); // 60-150s
        const t = {
            name,
            homeSeed,
            familiar,
            brain: new TinyBrain(BRAIN_IN, BRAIN_HID, BRAIN_OUT, genome),
            mindGen,
            rhythmPhase: r() * Math.PI * 2,
            rhythmRate: 0.012 + r() * 0.02,
            x, y,
            vx: 0, vy: 0,
            alpha: 0,
            state: 'visiting',       // 'visiting' | 'leaving'
            bornAt: this._tick,
            leaveAt: this._tick + stay,
            stay,
            waveCooldown: 0,
            clickFrames: 0,
            // Fitness accumulators — how the visit actually goes
            statTicks: 0,
            nearTicks: 0,
            poiTicks: 0,
            onscreenTicks: 0,
            speedSum: 0,
            mindLabel: 'a new mind',
        };
        this._travelers.push(t);
        this._refreshCurrent(t);
    }

    _refreshCurrent(t) {
        const genText = t.mindGen > 0 ? `, gen ${t.mindGen}` : '';
        this.current = {
            name: t.name,
            homeSeed: t.homeSeed,
            mind: `${t.mindLabel}${genText}`,
        };
    }

    /** Read the visit so far as a personality, e.g. "an affectionate mind". */
    _classify(t) {
        if (t.statTicks < 600) return 'a new mind';
        const near = t.nearTicks / t.statTicks;
        const poi = t.poiTicks / t.statTicks;
        const avgSpeed = t.speedSum / t.statTicks;
        if (near > 0.35) return 'an affectionate mind';
        if (poi > 0.35) return 'a curious mind';
        if (avgSpeed > 2.4) return 'a restless mind';
        if (avgSpeed < 0.7) return 'a patient mind';
        return 'a wandering mind';
    }

    /** Score the finished visit for the gene pool. */
    _fitness(t) {
        if (t.statTicks === 0) return 0;
        const onscreen = t.onscreenTicks / t.statTicks;
        const near = t.nearTicks / t.statTicks;
        const poi = t.poiTicks / t.statTicks;
        const avgSpeed = t.speedSum / t.statTicks;
        const alive = Math.min(1, avgSpeed / 0.6); // frozen brains score poorly
        return onscreen * alive * (1 + near * 2 + poi);
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
        const margin = 50;

        for (let i = this._travelers.length - 1; i >= 0; i--) {
            const t = this._travelers[i];

            if (t.state === 'visiting') {
                t.alpha = Math.min(1, t.alpha + 0.01);
                if (this._tick >= t.leaveAt) t.state = 'leaving';
            } else {
                t.alpha = Math.max(0, t.alpha - 0.008);
                if (t.alpha <= 0) {
                    // The mind enters the gene pool, scored by the visit
                    travelerMinds.record(t.brain.genome, this._fitness(t), t.mindGen);
                    this._travelers.splice(i, 1);
                    if (this.current && this.current.name === t.name) this.current = null;
                    continue;
                }
            }

            // ── Senses ──
            const cdx = mx - t.x;
            const cdy = my - t.y;
            const poi = pointsOfInterest.nearest(t.x, t.y, 600);
            const inp = this._inputs;
            inp[0] = Math.max(-1, Math.min(1, cdx / 500));
            inp[1] = Math.max(-1, Math.min(1, cdy / 500));
            inp[2] = poi ? Math.max(-1, Math.min(1, (poi.x - t.x) / 500)) : 0;
            inp[3] = poi ? Math.max(-1, Math.min(1, (poi.y - t.y) / 500)) : 0;
            inp[4] = Math.max(-1, Math.min(1, t.vx / 4));
            inp[5] = Math.max(-1, Math.min(1, t.vy / 4));
            inp[6] = (t.x / Math.max(1, w)) * 2 - 1; // wall sense
            inp[7] = (t.y / Math.max(1, h)) * 2 - 1;
            inp[8] = Math.sin(this._tick * t.rhythmRate + t.rhythmPhase);
            inp[9] = Math.max(-1, Math.min(1, ((this._tick - t.bornAt) / t.stay) * 2 - 1));

            // ── Urges ──
            const out = t.brain.think(inp);
            const dwell = (out[2] + 1) / 2;      // 0..1 damping
            const social = (out[3] + 1) / 2;     // 0..1 friendliness

            let steerX = out[0];
            let steerY = out[1];
            if (t.state === 'leaving') {
                // Override toward the nearest horizontal edge
                steerX = t.x < w / 2 ? -1 : 1;
                steerY = 0;
            }
            // Soft wall repulsion so degenerate brains can't park offscreen
            if (t.x < margin) steerX += 0.8;
            else if (t.x > w - margin) steerX -= 0.8;
            if (t.y < margin) steerY += 0.8;
            else if (t.y > h - margin) steerY -= 0.8;

            t.vx = (t.vx + steerX * 0.25 * (1 - dwell * 0.8)) * 0.93;
            t.vy = (t.vy + steerY * 0.25 * (1 - dwell * 0.8)) * 0.93;
            t.x += t.vx * 4;
            t.y += t.vy * 4;
            if (t.state === 'visiting') {
                // Hard clamp only while visiting; leavers may exit freely
                t.x = Math.max(-60, Math.min(w + 60, t.x));
                t.y = Math.max(-60, Math.min(h + 60, t.y));
            }

            // A friendly urge near your cursor: their familiar waves
            if (t.waveCooldown > 0) t.waveCooldown--;
            const cDistSq = cdx * cdx + cdy * cdy;
            if (social > 0.62 && cDistSq < 260 * 260 && t.waveCooldown === 0 && t.state === 'visiting') {
                t.clickFrames = 2;
                t.waveCooldown = 600;
            }

            // ── Fitness bookkeeping ──
            if (t.state === 'visiting' && t.alpha > 0.5) {
                t.statTicks++;
                if (cDistSq < 260 * 260) t.nearTicks++;
                if (poi) {
                    const pdx = poi.x - t.x;
                    const pdy = poi.y - t.y;
                    if (pdx * pdx + pdy * pdy < 140 * 140) t.poiTicks++;
                }
                if (t.x > margin && t.x < w - margin && t.y > margin && t.y < h - margin) t.onscreenTicks++;
                t.speedSum += Math.hypot(t.vx * 4, t.vy * 4);
                if (t.statTicks % 300 === 0) {
                    t.mindLabel = this._classify(t);
                    if (this.current && this.current.name === t.name) this._refreshCurrent(t);
                }
            }

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
