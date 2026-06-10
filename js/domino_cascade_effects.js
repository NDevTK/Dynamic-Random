/**
 * @file domino_cascade_effects.js
 * @description Interactive effect: domino runs. Seeded chains of dominoes
 * snake across the screen — meanders, spirals, or zigzags — and topple in
 * satisfying waves: each falling tile knocks the next, the wave races along
 * the path, and after a rest the tiles quietly stand themselves back up,
 * ready to go again. Occasionally one falls on its own (the room is
 * haunted).
 *
 * Seed-driven variation: 1-3 chains; path style (meander / spiral / zigzag);
 * tile spacing, size, and per-chain hue (solid or gradient along the path);
 * topple speed; haunt frequency; re-stand patience.
 *
 * Interaction: click near a chain to topple it outward in both directions
 * from that tile; sweeping the cursor quickly through a chain knocks it
 * over at the crossing point.
 */

const TAU = Math.PI * 2;

// states: 0 standing · 1 falling · 2 down · 3 rising
const STANDING = 0;
const FALLING = 1;
const DOWN = 2;
const RISING = 3;

export class DominoCascade {
    constructor() {
        this._chains = [];
        this._tick = 0;
        this._fallSpeed = 0.08;
        this._restTicks = 300;
        this._hauntEvery = 900;
        this._prevMx = 0;
        this._prevMy = 0;
        this._wasClicking = false;
        this._lcg = 1;
    }

    _rand() {
        this._lcg = (Math.imul(this._lcg, 1664525) + 1013904223) >>> 0;
        return this._lcg / 4294967296;
    }

    configure(rng, palette) {
        this._tick = 0;
        this._wasClicking = false;
        this._lcg = ((rng() * 4294967296) >>> 0) || 1;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const margin = 60;

        this._fallSpeed = 0.06 + rng() * 0.06;
        this._restTicks = 220 + Math.floor(rng() * 260);
        this._hauntEvery = 700 + Math.floor(rng() * 900);

        const baseHue = palette && palette.length > 0 ? palette[0].h : rng() * 360;
        const gradientPaint = rng() < 0.45;

        const chainCount = 1 + Math.floor(rng() * 3);
        this._chains = [];
        for (let c = 0; c < chainCount; c++) {
            const spacing = 17 + rng() * 8;
            const tileW = spacing * 0.52;
            const tileH = spacing * (1.5 + rng() * 0.6);
            const count = 36 + Math.floor(rng() * 36);
            const style = Math.floor(rng() * 3);
            const pts = this._buildPath(rng, style, count, spacing, w, h, margin);
            const hue = (baseHue + c * (40 + rng() * 80)) % 360;

            const tiles = pts.map((p, i) => ({
                x: p.x,
                y: p.y,
                tang: p.tang,
                state: STANDING,
                progress: 0,
                fallDir: 1,
                restAt: 0,
                hue: gradientPaint ? (hue + (i / count) * 90) % 360 : hue,
            }));
            this._chains.push({ tiles, tileW, tileH, spacing });
        }
    }

    /** Lay a path of evenly spaced points with tangents. */
    _buildPath(rng, style, count, spacing, w, h, margin) {
        const pts = [];
        if (style === 1) {
            // Spiral out from a seeded center
            const cx = w * (0.3 + rng() * 0.4);
            const cy = h * (0.3 + rng() * 0.4);
            let ang = rng() * TAU;
            let r = 26;
            const dir = rng() < 0.5 ? 1 : -1;
            for (let i = 0; i < count; i++) {
                pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, tang: ang + dir * Math.PI / 2 });
                const step = spacing / r; // constant arc length
                ang += step * dir;
                r += spacing * 0.16;
                if (r > Math.min(w, h) * 0.46) break;
            }
        } else {
            // Meander (gentle wandering curvature) or zigzag (straights + turns)
            let x = w * (0.15 + rng() * 0.2);
            let y = h * (0.2 + rng() * 0.6);
            let ang = rng() * 0.6 - 0.3;
            let curve = 0;
            let straightLeft = 0;
            for (let i = 0; i < count; i++) {
                pts.push({ x, y, tang: ang });
                if (style === 0) {
                    if (i % 6 === 0) curve = (rng() - 0.5) * 0.14;
                    ang += curve;
                } else {
                    if (straightLeft-- <= 0) {
                        straightLeft = 6 + Math.floor(rng() * 8);
                        ang += (rng() < 0.5 ? 1 : -1) * (Math.PI / 4 + rng() * Math.PI / 4);
                    }
                }
                x += Math.cos(ang) * spacing;
                y += Math.sin(ang) * spacing;
                // Reflect off the walls
                if (x < margin || x > w - margin) { ang = Math.PI - ang; x = Math.max(margin, Math.min(w - margin, x)); }
                if (y < margin || y > h - margin) { ang = -ang; y = Math.max(margin, Math.min(h - margin, y)); }
            }
        }
        return pts;
    }

    _topple(chain, idx, dir) {
        const t = chain.tiles[idx];
        if (!t || t.state !== STANDING) return;
        t.state = FALLING;
        t.progress = 0;
        t.fallDir = dir;
    }

    update(mx, my, isClicking) {
        this._tick++;

        const cdx = mx - this._prevMx;
        const cdy = my - this._prevMy;
        const cursorSpeed = Math.hypot(cdx, cdy);
        this._prevMx = mx;
        this._prevMy = my;

        // Click: knock the nearest standing tile outward in both directions
        if (isClicking && !this._wasClicking) {
            let best = null;
            let bestD = 80 * 80;
            for (const chain of this._chains) {
                for (let i = 0; i < chain.tiles.length; i++) {
                    const t = chain.tiles[i];
                    if (t.state !== STANDING) continue;
                    const dx = t.x - mx;
                    const dy = t.y - my;
                    const d = dx * dx + dy * dy;
                    if (d < bestD) { bestD = d; best = { chain, i }; }
                }
            }
            if (best) {
                this._topple(best.chain, best.i, 1);
                this._topple(best.chain, best.i - 1, -1);
            }
        }
        this._wasClicking = isClicking;

        // The haunt: an end tile falls on its own every so often
        if (this._tick % this._hauntEvery === 0 && this._chains.length > 0) {
            const chain = this._chains[Math.floor(this._rand() * this._chains.length)];
            const fromEnd = this._rand() < 0.5;
            this._topple(chain, fromEnd ? chain.tiles.length - 1 : 0, fromEnd ? -1 : 1);
        }

        for (const chain of this._chains) {
            const tiles = chain.tiles;
            for (let i = 0; i < tiles.length; i++) {
                const t = tiles[i];
                if (t.state === STANDING) {
                    // A fast cursor sweep knocks tiles at the crossing point
                    if (cursorSpeed > 16) {
                        const dx = t.x - mx;
                        const dy = t.y - my;
                        if (dx * dx + dy * dy < 250) {
                            const along = Math.cos(t.tang) * cdx + Math.sin(t.tang) * cdy;
                            this._topple(chain, i, along >= 0 ? 1 : -1);
                        }
                    }
                } else if (t.state === FALLING) {
                    const before = t.progress;
                    t.progress = Math.min(1, t.progress + this._fallSpeed);
                    // Halfway down, the tile strikes its neighbor
                    if (before < 0.45 && t.progress >= 0.45) {
                        this._topple(chain, i + t.fallDir, t.fallDir);
                    }
                    if (t.progress >= 1) {
                        t.state = DOWN;
                        t.restAt = this._tick + this._restTicks + i * 2;
                    }
                } else if (t.state === DOWN) {
                    if (this._tick >= t.restAt) t.state = RISING;
                } else if (t.state === RISING) {
                    t.progress = Math.max(0, t.progress - this._fallSpeed * 0.45);
                    if (t.progress <= 0) t.state = STANDING;
                }
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        for (const chain of this._chains) {
            const halfW = chain.tileW / 2;
            const hgt = chain.tileH;
            for (const t of chain.tiles) {
                // Lean angle 0 (standing) → ~88° (flat), hinged at the base edge
                const lean = t.progress * 1.53;
                const sinL = Math.sin(lean);
                const cosL = Math.cos(lean);
                const tx = Math.cos(t.tang) * t.fallDir;
                const ty = Math.sin(t.tang) * t.fallDir;
                // Base edge runs perpendicular to the path
                const px = -Math.sin(t.tang) * halfW;
                const py = Math.cos(t.tang) * halfW;
                // Top corners: lean along the path + lose height as it falls
                const topX = tx * sinL * hgt;
                const topY = ty * sinL * hgt - cosL * hgt;

                const l = 50 + cosL * 16; // faces dim as they fall
                ctx.fillStyle = `hsla(${t.hue}, 65%, ${l}%, 0.92)`;
                ctx.strokeStyle = `hsla(${t.hue}, 70%, ${l - 28}%, 0.9)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(t.x - px, t.y - py);
                ctx.lineTo(t.x + px, t.y + py);
                ctx.lineTo(t.x + px + topX, t.y + py + topY);
                ctx.lineTo(t.x - px + topX, t.y - py + topY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Pip on the face, visible once mostly fallen
                if (t.progress > 0.7) {
                    ctx.fillStyle = `hsla(${t.hue}, 30%, 92%, ${(t.progress - 0.7) * 2.5})`;
                    ctx.beginPath();
                    ctx.arc(t.x + topX * 0.5, t.y + topY * 0.5, 1.6, 0, TAU);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }
}
