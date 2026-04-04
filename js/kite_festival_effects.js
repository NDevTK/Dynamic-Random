/**
 * @file kite_festival_effects.js
 * @description Interactive effect: a procedurally-designed fleet of kites flies
 * across the screen, each tethered to an anchor point by a spring-simulated string.
 * Kites dance in a seed-specific wind field and react to the cursor, which acts
 * as a wandering wind source. Clicking triggers a burst of wind that sends kites
 * diving, looping, and shedding color trails from their streamer tails.
 *
 * Seed-driven variation:
 *  - 2-4 kite archetypes chosen per seed from 7 possible (diamond, delta, box,
 *    hex, bowtie, chevron, star)
 *  - 6-14 kites per seed, with randomized sizes, tail lengths, colors, string
 *    lengths, and anchor placement modes
 *  - 4 anchor layouts: bottom-line, grounded-arc, scattered-drift, shared-post
 *  - 3 wind personalities: breezy (smooth noise), gusty (sharp turbulence),
 *    whirlwind (rotational field around center)
 *  - 3 tail styles: ribbon (connected segments), bowknots (periodic nodes),
 *    streamer (fading trail)
 *  - Wind direction, intensity, tail-hue drift, string-stiffness, kite-tumble-rate
 *    all parameterized per seed
 *
 * Interaction: cursor acts as a local wind boost; kites within the influence
 * radius feel pushed in the cursor's motion direction. Clicking creates a
 * radial gust impulse centered on the click.
 */

import { generateKiteFleet, drawKiteShape } from './kite_shapes.js';

const TAU = Math.PI * 2;

export class KiteFestival {
    constructor() {
        this._kites = [];
        this._shapes = [];
        this._tick = 0;
        this._baseHue = 200;
        this._windMode = 0;      // 0=breezy, 1=gusty, 2=whirlwind
        this._anchorMode = 0;    // 0=bottom-line, 1=grounded-arc, 2=scattered, 3=shared-post
        this._tailStyle = 0;     // 0=ribbon, 1=bowknots, 2=streamer
        this._windDirX = 0.3;
        this._windDirY = -0.2;
        this._windStrength = 0.5;
        this._stringStiffness = 0.004;
        this._tumbleRate = 0.02;
        this._tailHueDrift = 0;
        this._influenceRadius = 220;
        this._influenceRadiusSq = 220 * 220;
        this._gusts = [];
        this._gustPool = [];
        this._wasClicking = false;
        this._cursorInited = false;
        this._prevMx = 0;
        this._prevMy = 0;
        this._cursorVx = 0;
        this._cursorVy = 0;
        this._noiseT = 0;
    }

    configure(rng, palette) {
        this._tick = 0;
        const w = window.innerWidth;
        const h = window.innerHeight;

        const fleetSize = 6 + Math.floor(rng() * 9); // 6-14
        this._shapes = generateKiteFleet(rng, fleetSize);

        this._windMode = Math.floor(rng() * 3);
        this._anchorMode = Math.floor(rng() * 4);
        this._tailStyle = Math.floor(rng() * 3);

        // Wind baseline
        const windAng = rng() * TAU;
        this._windStrength = 0.3 + rng() * 0.5;
        this._windDirX = Math.cos(windAng) * this._windStrength;
        this._windDirY = Math.sin(windAng) * this._windStrength * 0.4 - 0.3; // slight upward bias
        this._stringStiffness = 0.002 + rng() * 0.005;
        this._tumbleRate = 0.01 + rng() * 0.03;
        this._tailHueDrift = (rng() - 0.5) * 0.4;
        this._influenceRadius = 180 + rng() * 140;
        this._influenceRadiusSq = this._influenceRadius * this._influenceRadius;

        this._baseHue = palette && palette.length > 0
            ? palette[Math.floor(rng() * palette.length)].h
            : rng() * 360;

        // Gusts state reset
        this._gusts.length = 0;
        this._wasClicking = false;
        this._noiseT = rng() * 1000;
        // Avoid first-frame cursor-velocity kick
        this._cursorInited = false;
        this._cursorVx = 0;
        this._cursorVy = 0;

        // Initialize anchors and kites
        this._kites = [];
        const sharedPost = {
            x: w * (0.3 + rng() * 0.4),
            y: h * (0.7 + rng() * 0.25),
        };
        const arcCenterX = w * 0.5;
        const arcCenterY = h * 1.2;
        const arcRadius = Math.max(w, h) * 0.7;

        for (let i = 0; i < fleetSize; i++) {
            const t = i / Math.max(1, fleetSize - 1);
            let anchorX, anchorY;
            switch (this._anchorMode) {
                case 0: // bottom-line
                    anchorX = w * (0.1 + t * 0.8);
                    anchorY = h * (0.88 + rng() * 0.08);
                    break;
                case 1: { // grounded-arc
                    const ang = -Math.PI + t * Math.PI * 0.6 + Math.PI * 0.2;
                    anchorX = arcCenterX + Math.cos(ang) * arcRadius;
                    anchorY = arcCenterY + Math.sin(ang) * arcRadius;
                    break;
                }
                case 2: // scattered
                    anchorX = w * (0.1 + rng() * 0.8);
                    anchorY = h * (0.6 + rng() * 0.35);
                    break;
                case 3: // shared-post
                default:
                    anchorX = sharedPost.x + (rng() - 0.5) * 40;
                    anchorY = sharedPost.y + (rng() - 0.5) * 20;
                    break;
            }

            const stringLen = 180 + rng() * 260;
            const kiteSize = 26 + rng() * 36;
            // Place kite above anchor at its string length with some drift
            const initAng = -Math.PI / 2 + (rng() - 0.5) * 0.8;
            const kx = anchorX + Math.cos(initAng) * stringLen;
            const ky = anchorY + Math.sin(initAng) * stringLen;

            const tailLen = 4 + Math.floor(rng() * 10); // 4-13 segments
            const tail = new Array(tailLen * 2);
            for (let k = 0; k < tail.length; k += 2) {
                tail[k] = kx;
                tail[k + 1] = ky;
            }

            this._kites.push({
                x: kx, y: ky,
                vx: 0, vy: 0,
                anchorX, anchorY,
                stringLen,
                size: kiteSize,
                shapeIdx: i % this._shapes.length,
                rot: 0,
                rotV: 0,
                hueOffset: (rng() - 0.5) * 80,
                tail,
                tailWriteIdx: 0,
                tailLen,
                pulse: 0,
            });
        }
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._noiseT += 0.008;

        // Cursor velocity for wind influence (skip first frame to avoid huge kick)
        if (this._cursorInited) {
            const rawDx = mx - this._prevMx;
            const rawDy = my - this._prevMy;
            this._cursorVx = this._cursorVx * 0.7 + rawDx * 0.3;
            this._cursorVy = this._cursorVy * 0.7 + rawDy * 0.3;
        } else {
            this._cursorInited = true;
        }
        this._prevMx = mx;
        this._prevMy = my;

        if (isClicking && !this._wasClicking) this._spawnGust(mx, my);
        this._wasClicking = isClicking;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const centerX = w * 0.5;
        const centerY = h * 0.5;
        const noiseT = this._noiseT;
        const baseWindX = this._windDirX;
        const baseWindY = this._windDirY;
        const windMode = this._windMode;
        const stringK = this._stringStiffness;
        const tumbleK = this._tumbleRate;
        const influenceSq = this._influenceRadiusSq;
        const invInfluence = 1 / this._influenceRadius;

        // Update gusts
        for (let i = this._gusts.length - 1; i >= 0; i--) {
            const g = this._gusts[i];
            g.life--;
            g.radius += g.speed;
            g.strength *= 0.95;
            if (g.life <= 0) {
                this._gustPool.push(g);
                this._gusts[i] = this._gusts[this._gusts.length - 1];
                this._gusts.pop();
            }
        }

        for (let i = 0; i < this._kites.length; i++) {
            const k = this._kites[i];

            // --- Wind force ---
            let wx = baseWindX;
            let wy = baseWindY;
            if (windMode === 0) {
                // breezy: smooth sinusoidal noise drift
                wx += Math.sin(noiseT + k.x * 0.005) * 0.4;
                wy += Math.cos(noiseT * 0.7 + k.y * 0.005) * 0.25;
            } else if (windMode === 1) {
                // gusty: sharp turbulence pulses
                const pulse = Math.sin(noiseT * 2.3 + i * 1.7);
                const pulse2 = Math.cos(noiseT * 1.7 + k.x * 0.008);
                wx += pulse * 0.7 * Math.abs(pulse);
                wy += pulse2 * 0.5 * Math.abs(pulse2);
            } else {
                // whirlwind: rotational around center
                const rx = k.x - centerX;
                const ry = k.y - centerY;
                const r = Math.sqrt(rx * rx + ry * ry) + 1;
                wx += (-ry / r) * 0.7;
                wy += (rx / r) * 0.7;
            }

            k.vx += wx * 0.15;
            k.vy += wy * 0.15;

            // --- Cursor wind influence ---
            const dxM = k.x - mx;
            const dyM = k.y - my;
            const distSqM = dxM * dxM + dyM * dyM;
            if (distSqM < influenceSq) {
                const dist = Math.sqrt(distSqM);
                const strength = (1 - dist * invInfluence) * 0.6;
                k.vx += this._cursorVx * strength * 0.15;
                k.vy += this._cursorVy * strength * 0.15;
                k.pulse = Math.min(0.5, k.pulse + strength * 0.03);
            } else {
                k.pulse *= 0.94;
            }

            // --- Gust impulses ---
            for (let g = 0; g < this._gusts.length; g++) {
                const gust = this._gusts[g];
                const gdx = k.x - gust.x;
                const gdy = k.y - gust.y;
                const gdSq = gdx * gdx + gdy * gdy;
                const shellWidth = 80;
                const innerR = gust.radius - shellWidth;
                const dToCenter = Math.sqrt(gdSq);
                if (dToCenter > innerR && dToCenter < gust.radius + shellWidth) {
                    const band = 1 - Math.abs(dToCenter - gust.radius) / shellWidth;
                    if (band > 0) {
                        const inv = 1 / (dToCenter + 0.1);
                        const push = gust.strength * band * 4;
                        k.vx += gdx * inv * push;
                        k.vy += gdy * inv * push;
                        k.pulse = Math.min(1, k.pulse + band * 0.2);
                        k.rotV += (dToCenter % 7 - 3.5) * band * 0.004;
                    }
                }
            }

            // --- String spring constraint ---
            const sx = k.x - k.anchorX;
            const sy = k.y - k.anchorY;
            const sLen = Math.sqrt(sx * sx + sy * sy) + 0.01;
            const stretch = sLen - k.stringLen;
            // Only pull (string can't push)
            if (stretch > 0) {
                const pull = stretch * stringK * 10;
                k.vx -= (sx / sLen) * pull;
                k.vy -= (sy / sLen) * pull;
            } else {
                // Weak pull toward string length even when slack (keeps it from falling)
                k.vx -= sx * stringK * 0.3;
                k.vy -= sy * stringK * 0.3;
            }

            // Slight upward lift (kites want to rise)
            k.vy -= 0.04;

            // Damping
            k.vx *= 0.96;
            k.vy *= 0.96;

            // Speed cap
            const vMag2 = k.vx * k.vx + k.vy * k.vy;
            if (vMag2 > 100) {
                const s = 10 / Math.sqrt(vMag2);
                k.vx *= s;
                k.vy *= s;
            }

            k.x += k.vx;
            k.y += k.vy;

            // Rotation from velocity + tumble
            const velAng = Math.atan2(k.vy, k.vx) + Math.PI / 2;
            let rotDiff = velAng - k.rot;
            // Wrap to [-PI, PI]
            while (rotDiff > Math.PI) rotDiff -= TAU;
            while (rotDiff < -Math.PI) rotDiff += TAU;
            k.rotV += rotDiff * tumbleK;
            k.rotV *= 0.88;
            k.rot += k.rotV;

            // Wobble phase
            k.wobblePhase += k.wobbleFreq;

            // --- Update tail ring buffer ---
            // Tail anchor point in world space (kite's bottom)
            const tailAnchorLocalX = 0;
            const tailAnchorLocalY = k.size * 0.6;
            const cosR = Math.cos(k.rot);
            const sinR = Math.sin(k.rot);
            const tx = k.x + tailAnchorLocalX * cosR - tailAnchorLocalY * sinR;
            const ty = k.y + tailAnchorLocalX * sinR + tailAnchorLocalY * cosR;
            const tail = k.tail;
            const wi = k.tailWriteIdx;
            tail[wi * 2] = tx;
            tail[wi * 2 + 1] = ty;
            k.tailWriteIdx = (wi + 1) % k.tailLen;
        }
    }

    _spawnGust(x, y) {
        if (this._gusts.length >= 6) return;
        const g = this._gustPool.length > 0 ? this._gustPool.pop() : {};
        g.x = x;
        g.y = y;
        g.radius = 20;
        g.speed = 8 + ((this._tick * 2654435761) >>> 0) % 6;
        g.strength = 1.2;
        g.life = 50;
        g.maxLife = 50;
        this._gusts.push(g);
    }

    draw(ctx, system) {
        if (this._kites.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const baseHue = this._baseHue;
        const hueShift = this._tick * this._tailHueDrift;
        const shapes = this._shapes;
        const tailStyle = this._tailStyle;

        // --- Draw strings first (behind kites) ---
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = `hsla(${baseHue}, 30%, 55%, 0.18)`;
        ctx.beginPath();
        for (let i = 0; i < this._kites.length; i++) {
            const k = this._kites[i];
            // Curved string via a quadratic: droop midpoint
            const midX = (k.x + k.anchorX) * 0.5;
            const midY = (k.y + k.anchorY) * 0.5 + 18;
            ctx.moveTo(k.anchorX, k.anchorY);
            ctx.quadraticCurveTo(midX, midY, k.x, k.y);
        }
        ctx.stroke();

        // --- Draw tails ---
        for (let i = 0; i < this._kites.length; i++) {
            const k = this._kites[i];
            this._drawTail(ctx, k, baseHue + k.hueOffset + hueShift, tailStyle);
        }

        // --- Draw kites ---
        for (let i = 0; i < this._kites.length; i++) {
            const k = this._kites[i];
            const hue = (baseHue + k.hueOffset + hueShift + 360) % 360;
            const alpha = 0.75;
            const drawSize = k.size * (1 + k.pulse);
            const shape = shapes[k.shapeIdx];

            ctx.save();
            ctx.translate(k.x, k.y);
            ctx.rotate(k.rot);
            ctx.scale(drawSize, drawSize);
            ctx.lineWidth = 1.8 / drawSize;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            const strokeColor = `hsla(${hue}, 80%, 65%, ${alpha})`;
            const fillColor = `hsla(${hue}, 70%, 50%, ${0.2 + k.pulse * 0.2})`;
            const strutColor = `hsla(${(hue + 40) % 360}, 90%, 75%, ${alpha * 0.6})`;
            drawKiteShape(ctx, shape, strokeColor, fillColor, 0.3, strutColor, 0.5);

            ctx.restore();
        }

        // --- Draw gust rings ---
        for (let i = 0; i < this._gusts.length; i++) {
            const g = this._gusts[i];
            const lifeF = g.life / g.maxLife;
            const alpha = lifeF * 0.4;
            ctx.strokeStyle = `hsla(${(baseHue + 60) % 360}, 80%, 70%, ${alpha})`;
            ctx.lineWidth = 2 * lifeF;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.radius, 0, TAU);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawTail(ctx, k, hue, style) {
        const tail = k.tail;
        const n = k.tailLen;
        if (n < 2) return;
        const start = k.tailWriteIdx; // oldest entry

        if (style === 0) {
            // ribbon - batch segments into 3 width/alpha bands to reduce strokes
            const hueN = (hue + 360) % 360;
            const bands = 3;
            for (let b = 0; b < bands; b++) {
                const bandLo = b / bands;
                const bandHi = (b + 1) / bands;
                const bandMid = (bandLo + bandHi) * 0.5;
                ctx.lineWidth = 1 + bandMid * 2.5;
                ctx.strokeStyle = `hsla(${hueN}, 75%, 60%, ${bandMid * 0.55})`;
                ctx.beginPath();
                for (let j = 1; j < n; j++) {
                    const t = j / n;
                    if (t < bandLo || t >= bandHi) continue;
                    const idxA = (start + j - 1) % n;
                    const idxB = (start + j) % n;
                    ctx.moveTo(tail[idxA * 2], tail[idxA * 2 + 1]);
                    ctx.lineTo(tail[idxB * 2], tail[idxB * 2 + 1]);
                }
                ctx.stroke();
            }
        } else if (style === 1) {
            // bowknots - dots at intervals with connecting threads
            ctx.strokeStyle = `hsla(${(hue + 360) % 360}, 60%, 55%, 0.3)`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let j = 1; j < n; j++) {
                const idxA = (start + j - 1) % n;
                const idxB = (start + j) % n;
                ctx.moveTo(tail[idxA * 2], tail[idxA * 2 + 1]);
                ctx.lineTo(tail[idxB * 2], tail[idxB * 2 + 1]);
            }
            ctx.stroke();
            for (let j = 0; j < n; j += 2) {
                const idx = (start + j) % n;
                const t = j / n;
                const r = 2 + t * 3;
                ctx.fillStyle = `hsla(${(hue + t * 40 + 360) % 360}, 85%, 70%, ${t * 0.6})`;
                ctx.beginPath();
                ctx.arc(tail[idx * 2], tail[idx * 2 + 1], r, 0, TAU);
                ctx.fill();
            }
        } else {
            // streamer - batch into 3 width bands
            const hueN = (hue + 360) % 360;
            ctx.strokeStyle = `hsla(${hueN}, 85%, 70%, 0.45)`;
            ctx.lineCap = 'round';
            const bands = 3;
            for (let b = 0; b < bands; b++) {
                const bandLo = b / bands;
                const bandHi = (b + 1) / bands;
                const bandMid = (bandLo + bandHi) * 0.5;
                ctx.lineWidth = (1 - bandMid * 0.8) * 4 + 0.5;
                ctx.beginPath();
                for (let j = 1; j < n; j++) {
                    const t = j / n;
                    if (t < bandLo || t >= bandHi) continue;
                    const idxA = (start + j - 1) % n;
                    const idxB = (start + j) % n;
                    ctx.moveTo(tail[idxA * 2], tail[idxA * 2 + 1]);
                    ctx.lineTo(tail[idxB * 2], tail[idxB * 2 + 1]);
                }
                ctx.stroke();
            }
        }
    }
}
