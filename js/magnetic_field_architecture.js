/**
 * @file magnetic_field_architecture.js
 * @description Visualizes magnetic field lines between poles, resembling iron filings
 * on a magnet. Features include field-aligned spark particles with trails, aurora-like
 * glow bands near poles, mouse as interactive pole, inter-pole arcing, gravity well
 * polarity reversal, shockwave scattering, dynamic filing drift, and multiple draw modes
 * including combined filings+lines and glowing heatmap. Uses object pooling for sparks
 * and caps particle counts for performance.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

// --- Spark particle pool ---
const MAX_SPARKS = 300;
const MAX_ARC_SPARKS = 120;
const SPARK_TRAIL_LENGTH = 6;

function createSpark() {
    return {
        alive: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        age: 0, maxAge: 0,
        hue: 0, size: 0,
        trail: [], // [{x,y}, ...]
        fromPoleIdx: -1
    };
}

function createArcSpark() {
    return {
        alive: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        age: 0, maxAge: 0,
        hue: 0, size: 0
    };
}

export class MagneticFieldArchitecture extends Architecture {
    constructor() {
        super();
        this.poles = [];
        this.fieldLines = [];
        this.filings = [];
        this.hueBase = 0;
        this.drawMode = 0;
        this.fieldStrength = 1;
        this.lineCount = 0;
        this.animPhase = 0;

        // Spark particles (field-aligned, object pool)
        this.sparkPool = [];
        this.activeSparkCount = 0;

        // Arc sparks between close poles
        this.arcSparkPool = [];
        this.activeArcCount = 0;

        // Aurora glow band cache
        this.auroraBands = [];

        // Gravity well polarity state
        this.polarityFlipped = false;
        this.polarityTransition = 0; // 0 = normal, 1 = fully flipped

        // Shockwave scatter velocity accumulators on filings
        this.filingScatterVx = null;
        this.filingScatterVy = null;

        // Mouse pole strength multiplier
        this.mousePoleStrength = 4.0;
    }

    init(system) {
        const rng = system.rng;
        this.hueBase = system.hue || rng() * 360;
        // 0=lines, 1=filings, 2=flow, 3=gradient, 4=filings+lines combined, 5=heatmap glow
        this.drawMode = Math.floor(rng() * 6);
        this.fieldStrength = 0.5 + rng() * 1.5;

        // Generate magnetic poles
        const poleCount = 2 + Math.floor(rng() * 5);
        this.poles = [];
        for (let i = 0; i < poleCount; i++) {
            this.poles.push({
                x: system.width * (0.15 + rng() * 0.7),
                y: system.height * (0.15 + rng() * 0.7),
                charge: (i % 2 === 0 ? 1 : -1) * (0.5 + rng() * 1.5),
                baseCharge: (i % 2 === 0 ? 1 : -1) * (0.5 + rng() * 1.5),
                baseX: system.width * (0.15 + rng() * 0.7),
                baseY: system.height * (0.15 + rng() * 0.7),
                driftSpeed: 0.002 + rng() * 0.005,
                driftPhase: rng() * Math.PI * 2,
                driftRadius: 30 + rng() * 100,
                color: `hsl(${(this.hueBase + i * 60) % 360}, 80%, 60%)`,
                hue: (this.hueBase + i * 60) % 360
            });
        }

        // Generate iron filings with drift velocity
        this.filings = [];
        const filingCount = 800 + Math.floor(rng() * 600);
        this.filingScatterVx = new Float32Array(filingCount);
        this.filingScatterVy = new Float32Array(filingCount);
        for (let i = 0; i < filingCount; i++) {
            this.filings.push({
                x: rng() * system.width,
                y: rng() * system.height,
                length: 3 + rng() * 8,
                angle: 0,
                alpha: 0.2 + rng() * 0.5,
                hueShift: rng() * 40,
                driftSpeed: 0.15 + rng() * 0.35
            });
            this.filingScatterVx[i] = 0;
            this.filingScatterVy[i] = 0;
        }

        this.lineCount = 30 + Math.floor(rng() * 40);

        // Initialize spark pool
        this.sparkPool = [];
        for (let i = 0; i < MAX_SPARKS; i++) {
            this.sparkPool.push(createSpark());
        }
        this.activeSparkCount = 0;

        // Initialize arc spark pool
        this.arcSparkPool = [];
        for (let i = 0; i < MAX_ARC_SPARKS; i++) {
            this.arcSparkPool.push(createArcSpark());
        }
        this.activeArcCount = 0;

        // Pre-calculate aurora band offsets per pole
        this.auroraBands = [];
        for (let i = 0; i < poleCount; i++) {
            this.auroraBands.push({
                bandCount: 2 + Math.floor(rng() * 3),
                phaseOffset: rng() * Math.PI * 2,
                radiusBase: 40 + rng() * 60,
                hue: (this.hueBase + i * 60 + 30) % 360
            });
        }
    }

    /**
     * Returns the effective charge of a pole, accounting for gravity-well polarity flip.
     */
    _effectiveCharge(pole) {
        const t = this.polarityTransition;
        return pole.baseCharge * (1 - 2 * t); // lerp from +c to -c as t goes 0->1
    }

    getField(x, y, tick) {
        let fx = 0, fy = 0;
        for (const pole of this.poles) {
            const dx = x - pole.x;
            const dy = y - pole.y;
            const distSq = dx * dx + dy * dy + 100;
            const dist = Math.sqrt(distSq);
            const charge = this._effectiveCharge(pole);
            const force = charge * this.fieldStrength / distSq;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
        }

        // Mouse as a stronger dynamic pole
        const mdx = x - mouse.x;
        const mdy = y - mouse.y;
        const mDistSq = mdx * mdx + mdy * mdy + 100;
        const mDist = Math.sqrt(mDistSq);
        const mouseCharge = this.mousePoleStrength * (this.polarityTransition > 0.5 ? -1 : 1);
        const mForce = mouseCharge / mDistSq;
        fx += (mdx / mDist) * mForce;
        fy += (mdy / mDist) * mForce;

        return { fx, fy };
    }

    /**
     * Returns field magnitude at a point (cheaper, no direction needed for heatmap).
     */
    getFieldMagnitude(x, y) {
        let mag = 0;
        for (const pole of this.poles) {
            const dx = x - pole.x;
            const dy = y - pole.y;
            const distSq = dx * dx + dy * dy + 100;
            const charge = this._effectiveCharge(pole);
            mag += Math.abs(charge) * this.fieldStrength / distSq;
        }
        // Mouse pole contribution
        const mdx = x - mouse.x;
        const mdy = y - mouse.y;
        const mDistSq = mdx * mdx + mdy * mdy + 100;
        mag += this.mousePoleStrength / mDistSq;
        return mag;
    }

    _allocateSpark() {
        if (this.activeSparkCount >= MAX_SPARKS) return null;
        for (let i = 0; i < this.sparkPool.length; i++) {
            if (!this.sparkPool[i].alive) {
                this.sparkPool[i].alive = true;
                this.sparkPool[i].trail.length = 0;
                this.activeSparkCount++;
                return this.sparkPool[i];
            }
        }
        return null;
    }

    _freeSpark(spark) {
        spark.alive = false;
        this.activeSparkCount--;
    }

    _allocateArcSpark() {
        if (this.activeArcCount >= MAX_ARC_SPARKS) return null;
        for (let i = 0; i < this.arcSparkPool.length; i++) {
            if (!this.arcSparkPool[i].alive) {
                this.arcSparkPool[i].alive = true;
                this.activeArcCount++;
                return this.arcSparkPool[i];
            }
        }
        return null;
    }

    _freeArcSpark(spark) {
        spark.alive = false;
        this.activeArcCount--;
    }

    _spawnFieldSparks(system, tick) {
        const rng = system.rng;
        // Spawn sparks near positive poles (effective charge > 0)
        for (let pi = 0; pi < this.poles.length; pi++) {
            const pole = this.poles[pi];
            const eCharge = this._effectiveCharge(pole);
            if (eCharge <= 0) continue;

            // Spawn rate proportional to charge
            const spawnChance = 0.15 * Math.abs(eCharge);
            if (rng() > spawnChance) continue;

            const spark = this._allocateSpark();
            if (!spark) break;

            const angle = rng() * Math.PI * 2;
            const r = 12 + rng() * 10;
            spark.x = pole.x + Math.cos(angle) * r;
            spark.y = pole.y + Math.sin(angle) * r;
            spark.vx = 0;
            spark.vy = 0;
            spark.age = 0;
            spark.maxAge = 80 + Math.floor(rng() * 120);
            spark.hue = pole.hue;
            spark.size = 1 + rng() * 2;
            spark.fromPoleIdx = pi;
        }
    }

    _spawnArcSparks(system) {
        const rng = system.rng;
        // Check each pair of poles for proximity
        for (let i = 0; i < this.poles.length; i++) {
            for (let j = i + 1; j < this.poles.length; j++) {
                const a = this.poles[i];
                const b = this.poles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;
                const arcThreshold = 160; // distance below which arcs appear
                if (distSq > arcThreshold * arcThreshold) continue;

                const dist = Math.sqrt(distSq);
                // More sparks when closer
                const intensity = 1 - dist / arcThreshold;
                if (rng() > intensity * 0.4) continue;

                const arc = this._allocateArcSpark();
                if (!arc) return;

                const t = rng();
                const midX = a.x + (b.x - a.x) * t;
                const midY = a.y + (b.y - a.y) * t;
                // Perpendicular scatter
                const nx = -(b.y - a.y) / (dist || 1);
                const ny = (b.x - a.x) / (dist || 1);
                const scatter = (rng() - 0.5) * dist * 0.4;

                arc.x = midX + nx * scatter;
                arc.y = midY + ny * scatter;
                arc.vx = (rng() - 0.5) * 2;
                arc.vy = (rng() - 0.5) * 2;
                arc.age = 0;
                arc.maxAge = 10 + Math.floor(rng() * 20);
                arc.hue = (a.hue + b.hue) / 2;
                arc.size = 1 + rng() * 2;
            }
        }

        // Also arc between mouse and nearby poles
        for (const pole of this.poles) {
            const dx = mouse.x - pole.x;
            const dy = mouse.y - pole.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 120 * 120) continue;
            const dist = Math.sqrt(distSq);
            const intensity = 1 - dist / 120;
            if (rng() > intensity * 0.3) continue;

            const arc = this._allocateArcSpark();
            if (!arc) return;

            const t = rng();
            arc.x = pole.x + dx * t + (rng() - 0.5) * dist * 0.3;
            arc.y = pole.y + dy * t + (rng() - 0.5) * dist * 0.3;
            arc.vx = (rng() - 0.5) * 3;
            arc.vy = (rng() - 0.5) * 3;
            arc.age = 0;
            arc.maxAge = 8 + Math.floor(rng() * 15);
            arc.hue = pole.hue;
            arc.size = 1.5 + rng() * 1.5;
        }
    }

    update(system) {
        const tick = system.tick;
        this.animPhase += 0.02;

        // --- Gravity well polarity flip ---
        if (system.isGravityWell) {
            this.polarityTransition = Math.min(1, this.polarityTransition + 0.04);
        } else {
            this.polarityTransition = Math.max(0, this.polarityTransition - 0.02);
        }

        // Update effective charges on poles
        for (const pole of this.poles) {
            pole.charge = this._effectiveCharge(pole);
        }

        // Drift poles
        for (const pole of this.poles) {
            pole.x = pole.baseX + Math.cos(tick * pole.driftSpeed + pole.driftPhase) * pole.driftRadius;
            pole.y = pole.baseY + Math.sin(tick * pole.driftSpeed * 1.3 + pole.driftPhase) * pole.driftRadius * 0.7;
        }

        // --- Shockwave scatter on filings ---
        if (system.shockwaves) {
            for (let fi = 0; fi < this.filings.length; fi++) {
                const f = this.filings[fi];
                for (const sw of system.shockwaves) {
                    const sdx = f.x - sw.x;
                    const sdy = f.y - sw.y;
                    const sDistSq = sdx * sdx + sdy * sdy;
                    const sDist = Math.sqrt(sDistSq);
                    if (sDist > 1 && Math.abs(sDist - sw.radius) < 60) {
                        const push = (1 - Math.abs(sDist - sw.radius) / 60) * sw.strength;
                        this.filingScatterVx[fi] += (sdx / sDist) * push * 6;
                        this.filingScatterVy[fi] += (sdy / sDist) * push * 6;
                    }
                }
            }
        }

        // --- Shockwave scatter on sparks ---
        if (system.shockwaves) {
            for (const spark of this.sparkPool) {
                if (!spark.alive) continue;
                for (const sw of system.shockwaves) {
                    const sdx = spark.x - sw.x;
                    const sdy = spark.y - sw.y;
                    const sDistSq = sdx * sdx + sdy * sdy;
                    const sDist = Math.sqrt(sDistSq);
                    if (sDist > 1 && Math.abs(sDist - sw.radius) < 60) {
                        const push = (1 - Math.abs(sDist - sw.radius) / 60) * sw.strength;
                        spark.vx += (sdx / sDist) * push * 8;
                        spark.vy += (sdy / sDist) * push * 8;
                    }
                }
            }
        }

        // Update filing orientations AND drift along field lines
        const speedMul = system.speedMultiplier || 1;
        for (let fi = 0; fi < this.filings.length; fi++) {
            const f = this.filings[fi];
            const field = this.getField(f.x, f.y, tick);
            const mag = Math.sqrt(field.fx * field.fx + field.fy * field.fy);
            const targetAngle = Math.atan2(field.fy, field.fx);

            // Smoothly rotate toward field direction
            let diff = targetAngle - f.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            f.angle += diff * 0.15;

            // Drift along field lines
            if (mag > 0.00001) {
                const driftX = (field.fx / mag) * f.driftSpeed * speedMul;
                const driftY = (field.fy / mag) * f.driftSpeed * speedMul;
                f.x += driftX + this.filingScatterVx[fi];
                f.y += driftY + this.filingScatterVy[fi];
            } else {
                f.x += this.filingScatterVx[fi];
                f.y += this.filingScatterVy[fi];
            }

            // Dampen scatter velocity
            this.filingScatterVx[fi] *= 0.92;
            this.filingScatterVy[fi] *= 0.92;

            // Wrap around edges
            if (f.x < -20) f.x += system.width + 40;
            else if (f.x > system.width + 20) f.x -= system.width + 40;
            if (f.y < -20) f.y += system.height + 40;
            else if (f.y > system.height + 20) f.y -= system.height + 40;
        }

        // --- Spawn and update field-aligned spark particles ---
        this._spawnFieldSparks(system, tick);
        this._spawnArcSparks(system);

        // Update sparks: follow field lines
        for (const spark of this.sparkPool) {
            if (!spark.alive) continue;

            spark.age++;
            if (spark.age >= spark.maxAge) {
                this._freeSpark(spark);
                continue;
            }

            // Record trail
            spark.trail.push({ x: spark.x, y: spark.y });
            if (spark.trail.length > SPARK_TRAIL_LENGTH) {
                spark.trail.shift();
            }

            // Follow field direction
            const field = this.getField(spark.x, spark.y, tick);
            const fMag = Math.sqrt(field.fx * field.fx + field.fy * field.fy);
            if (fMag > 0.00001) {
                const speed = 2.5 + fMag * 200;
                spark.vx = (field.fx / fMag) * speed;
                spark.vy = (field.fy / fMag) * speed;
            }

            spark.x += spark.vx * speedMul;
            spark.y += spark.vy * speedMul;

            // Kill if out of bounds or near negative pole
            if (spark.x < -50 || spark.x > system.width + 50 ||
                spark.y < -50 || spark.y > system.height + 50) {
                this._freeSpark(spark);
                continue;
            }

            // Check if arrived near a negative pole
            for (const pole of this.poles) {
                if (this._effectiveCharge(pole) >= 0) continue;
                const dx = spark.x - pole.x;
                const dy = spark.y - pole.y;
                if (dx * dx + dy * dy < 400) {
                    this._freeSpark(spark);
                    break;
                }
            }
        }

        // Update arc sparks
        for (const arc of this.arcSparkPool) {
            if (!arc.alive) continue;
            arc.age++;
            if (arc.age >= arc.maxAge) {
                this._freeArcSpark(arc);
                continue;
            }
            arc.x += arc.vx * speedMul;
            arc.y += arc.vy * speedMul;
            arc.vx *= 0.95;
            arc.vy *= 0.95;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const w = system.width;
        const h = system.height;

        ctx.save();

        // --- Draw based on mode ---
        // 0=lines, 1=filings, 2=flow (lines with animated dots), 3=gradient+filings
        // 4=combined filings+lines, 5=heatmap glow
        if (this.drawMode === 0 || this.drawMode === 2 || this.drawMode === 4) {
            this._drawFieldLines(ctx, w, h, tick);
        }

        if (this.drawMode === 1 || this.drawMode === 3 || this.drawMode === 4) {
            this._drawFilings(ctx, tick);
        }

        if (this.drawMode === 3) {
            this._drawFieldGradient(ctx, w, h, tick);
        }

        if (this.drawMode === 5) {
            this._drawHeatmap(ctx, w, h, tick);
            this._drawFilings(ctx, tick); // overlay filings on heatmap
        }

        // --- Aurora glow bands near poles ---
        this._drawAuroraBands(ctx, tick);

        // --- Draw spark particles with trails ---
        this._drawSparks(ctx, tick);

        // --- Draw arc sparks ---
        this._drawArcSparks(ctx, tick);

        // --- Draw poles ---
        ctx.globalCompositeOperation = 'lighter';
        for (const pole of this.poles) {
            const eCharge = this._effectiveCharge(pole);
            const isPositive = eCharge > 0;
            const radius = 8 + Math.abs(eCharge) * 4;
            const pulse = 1 + 0.2 * Math.sin(tick * 0.05);
            const poleHue = isPositive ? this.hueBase : (this.hueBase + 180) % 360;

            // Polarity flip visual feedback: glow pulses during transition
            const transGlow = this.polarityTransition > 0.01 && this.polarityTransition < 0.99
                ? 1.5 + Math.sin(tick * 0.3) * 0.5 : 1;

            const glowR = radius * 3 * pulse * transGlow;
            const g = ctx.createRadialGradient(pole.x, pole.y, 0, pole.x, pole.y, glowR);
            g.addColorStop(0, `hsla(${poleHue}, 100%, 80%, 0.8)`);
            g.addColorStop(0.5, `hsla(${poleHue}, 80%, 50%, 0.3)`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(pole.x, pole.y, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pole.x, pole.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // Charge indicator: + or -
            ctx.fillStyle = `hsla(${poleHue}, 100%, 95%, 0.9)`;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isPositive ? '+' : '-', pole.x, pole.y - radius * 1.8);
        }

        // --- Mouse pole indicator ---
        const mPulse = 1 + 0.15 * Math.sin(tick * 0.07);
        const mHue = this.polarityTransition > 0.5 ? (this.hueBase + 180) % 360 : this.hueBase;
        const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 30 * mPulse);
        mg.addColorStop(0, `hsla(${mHue}, 100%, 85%, 0.35)`);
        mg.addColorStop(0.5, `hsla(${mHue}, 90%, 60%, 0.12)`);
        mg.addColorStop(1, 'transparent');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 30 * mPulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    _drawFieldLines(ctx, w, h, tick) {
        ctx.globalCompositeOperation = 'lighter';

        // Gather all source poles (positive effective charge) including mouse
        const sources = [];
        for (const pole of this.poles) {
            if (this._effectiveCharge(pole) > 0) sources.push(pole);
        }

        for (const pole of sources) {
            const eCharge = Math.abs(this._effectiveCharge(pole));
            const lineCount = Math.floor(this.lineCount * eCharge);

            for (let i = 0; i < lineCount; i++) {
                const startAngle = (Math.PI * 2 / lineCount) * i;
                const startR = 15;
                let x = pole.x + Math.cos(startAngle) * startR;
                let y = pole.y + Math.sin(startAngle) * startR;

                ctx.beginPath();
                ctx.moveTo(x, y);

                const stepSize = 4;
                const maxSteps = 200;

                for (let s = 0; s < maxSteps; s++) {
                    const field = this.getField(x, y, tick);
                    const mag = Math.sqrt(field.fx * field.fx + field.fy * field.fy);
                    if (mag < 0.00001) break;

                    x += (field.fx / mag) * stepSize;
                    y += (field.fy / mag) * stepSize;

                    // Stop if near a negative pole
                    let hitPole = false;
                    for (const p of this.poles) {
                        if (this._effectiveCharge(p) < 0) {
                            const dx = x - p.x;
                            const dy = y - p.y;
                            if (dx * dx + dy * dy < 200) { hitPole = true; break; }
                        }
                    }
                    // Also check mouse proximity
                    const mDx = x - mouse.x;
                    const mDy = y - mouse.y;
                    if (mDx * mDx + mDy * mDy < 200) hitPole = true;

                    if (hitPole || x < -50 || x > w + 50 || y < -50 || y > h + 50) break;

                    ctx.lineTo(x, y);
                }

                const alpha = 0.15 + 0.1 * Math.sin(tick * 0.05 + i);
                const hue = (this.hueBase + i * 3 + Math.sin(tick * 0.01) * 20) % 360;
                ctx.strokeStyle = `hsla(${hue}, 70%, 55%, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Glow
                ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${alpha * 0.3})`;
                ctx.lineWidth = 4;
                ctx.stroke();
            }
        }

        // Flow dots along lines (draw mode 2)
        if (this.drawMode === 2) {
            this._drawFlowDots(ctx, w, h, tick, sources);
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _drawFlowDots(ctx, w, h, tick, sources) {
        const dotInterval = 30;
        for (const pole of sources) {
            const eCharge = Math.abs(this._effectiveCharge(pole));
            const lineCount = Math.max(4, Math.floor(this.lineCount * eCharge * 0.5));

            for (let i = 0; i < lineCount; i++) {
                const startAngle = (Math.PI * 2 / lineCount) * i;
                let x = pole.x + Math.cos(startAngle) * 15;
                let y = pole.y + Math.sin(startAngle) * 15;

                const stepSize = 4;
                let steps = 0;
                for (let s = 0; s < 200; s++) {
                    const field = this.getField(x, y, tick);
                    const mag = Math.sqrt(field.fx * field.fx + field.fy * field.fy);
                    if (mag < 0.00001) break;
                    x += (field.fx / mag) * stepSize;
                    y += (field.fy / mag) * stepSize;
                    steps++;

                    // Animated dot: appears at shifting positions
                    const phase = (tick * 0.08 + i * 1.7) % dotInterval;
                    if (Math.abs((steps % dotInterval) - phase) < 2) {
                        const dotAlpha = 0.5 + 0.3 * Math.sin(tick * 0.1 + s);
                        const hue = (this.hueBase + i * 5) % 360;
                        ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${dotAlpha})`;
                        ctx.beginPath();
                        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    if (x < -50 || x > w + 50 || y < -50 || y > h + 50) break;
                    let hitPole = false;
                    for (const p of this.poles) {
                        if (this._effectiveCharge(p) < 0) {
                            const dx = x - p.x;
                            const dy = y - p.y;
                            if (dx * dx + dy * dy < 200) { hitPole = true; break; }
                        }
                    }
                    if (hitPole) break;
                }
            }
        }
    }

    _drawFilings(ctx, tick) {
        ctx.globalCompositeOperation = 'lighter';

        for (const f of this.filings) {
            const hue = (this.hueBase + f.hueShift + Math.sin(tick * 0.01) * 10) % 360;
            ctx.strokeStyle = `hsla(${hue}, 60%, 50%, ${f.alpha})`;
            ctx.lineWidth = 1.2;
            const dx = Math.cos(f.angle) * f.length;
            const dy = Math.sin(f.angle) * f.length;
            ctx.beginPath();
            ctx.moveTo(f.x - dx, f.y - dy);
            ctx.lineTo(f.x + dx, f.y + dy);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _drawFieldGradient(ctx, w, h, tick) {
        const step = 20;
        ctx.globalCompositeOperation = 'lighter';

        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
                const field = this.getField(x, y, tick);
                const mag = Math.sqrt(field.fx * field.fx + field.fy * field.fy);
                const intensity = Math.min(1, mag * 800);
                if (intensity < 0.05) continue;

                const hue = (this.hueBase + intensity * 60) % 360;
                ctx.fillStyle = `hsla(${hue}, 70%, 40%, ${intensity * 0.08})`;
                ctx.fillRect(x, y, step, step);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Draw mode 5: glowing field intensity heatmap with smooth color ramp.
     */
    _drawHeatmap(ctx, w, h, tick) {
        const step = 16;
        ctx.globalCompositeOperation = 'lighter';

        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
                const mag = this.getFieldMagnitude(x + step * 0.5, y + step * 0.5);
                const intensity = Math.min(1, mag * 1200);
                if (intensity < 0.02) continue;

                // Color ramp: blue (low) -> cyan -> green -> yellow -> red/white (high)
                let hue, sat, light;
                if (intensity < 0.25) {
                    hue = 240; // blue
                    sat = 80;
                    light = 20 + intensity * 80;
                } else if (intensity < 0.5) {
                    hue = 240 - (intensity - 0.25) * 4 * 60; // blue -> cyan -> green
                    sat = 80;
                    light = 40;
                } else if (intensity < 0.75) {
                    hue = 120 - (intensity - 0.5) * 4 * 60; // green -> yellow
                    sat = 90;
                    light = 45;
                } else {
                    hue = 60 - (intensity - 0.75) * 4 * 60; // yellow -> red
                    sat = 100;
                    light = 50 + (intensity - 0.75) * 4 * 30;
                }

                // Pulse glow near high intensity
                const pulse = intensity > 0.5 ? Math.sin(tick * 0.06 + x * 0.01 + y * 0.01) * 0.1 : 0;
                const alpha = Math.min(0.35, intensity * 0.3 + pulse);

                ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
                ctx.fillRect(x, y, step, step);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Aurora-like glow bands perpendicular to field lines near poles.
     */
    _drawAuroraBands(ctx, tick) {
        ctx.globalCompositeOperation = 'lighter';

        for (let pi = 0; pi < this.poles.length; pi++) {
            const pole = this.poles[pi];
            const ab = this.auroraBands[pi];
            if (!ab) continue;

            const eCharge = this._effectiveCharge(pole);
            const intensity = Math.min(1, Math.abs(eCharge));

            for (let b = 0; b < ab.bandCount; b++) {
                const bandRadius = ab.radiusBase + b * 30;
                const segments = 24;
                const angleStep = (Math.PI * 2) / segments;

                ctx.beginPath();
                for (let s = 0; s <= segments; s++) {
                    const angle = s * angleStep;
                    // Wobble the radius
                    const wobble = Math.sin(angle * 3 + tick * 0.03 + ab.phaseOffset + b * 2) * 12;
                    const r = bandRadius + wobble;
                    const px = pole.x + Math.cos(angle) * r;
                    const py = pole.y + Math.sin(angle) * r;
                    if (s === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();

                const bandAlpha = intensity * 0.06 * (1 - b * 0.2);
                const bandHue = (ab.hue + b * 25 + tick * 0.2) % 360;
                ctx.strokeStyle = `hsla(${bandHue}, 90%, 65%, ${bandAlpha})`;
                ctx.lineWidth = 8 + Math.sin(tick * 0.04 + b) * 3;
                ctx.stroke();

                // Softer wider glow
                ctx.strokeStyle = `hsla(${bandHue}, 80%, 55%, ${bandAlpha * 0.3})`;
                ctx.lineWidth = 20 + Math.sin(tick * 0.04 + b) * 5;
                ctx.stroke();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Draw field-aligned spark particles with glowing trails.
     */
    _drawSparks(ctx, tick) {
        ctx.globalCompositeOperation = 'lighter';

        for (const spark of this.sparkPool) {
            if (!spark.alive) continue;

            const lifeRatio = 1 - spark.age / spark.maxAge;
            const alpha = lifeRatio * 0.8;

            // Draw trail
            if (spark.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(spark.trail[0].x, spark.trail[0].y);
                for (let t = 1; t < spark.trail.length; t++) {
                    ctx.lineTo(spark.trail[t].x, spark.trail[t].y);
                }
                ctx.lineTo(spark.x, spark.y);
                const trailAlpha = alpha * 0.4;
                ctx.strokeStyle = `hsla(${spark.hue}, 90%, 70%, ${trailAlpha})`;
                ctx.lineWidth = spark.size * 0.8;
                ctx.stroke();
            }

            // Draw spark head glow
            const glowR = spark.size * 3 * lifeRatio;
            const g = ctx.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, glowR);
            g.addColorStop(0, `hsla(${spark.hue}, 100%, 90%, ${alpha})`);
            g.addColorStop(0.4, `hsla(${spark.hue}, 100%, 70%, ${alpha * 0.4})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Core dot
            ctx.fillStyle = `hsla(${spark.hue}, 100%, 95%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Draw arc sparks between close poles.
     */
    _drawArcSparks(ctx, tick) {
        ctx.globalCompositeOperation = 'lighter';

        for (const arc of this.arcSparkPool) {
            if (!arc.alive) continue;

            const lifeRatio = 1 - arc.age / arc.maxAge;
            const alpha = lifeRatio * 0.9;
            const size = arc.size * lifeRatio;

            // Bright core
            ctx.fillStyle = `hsla(${arc.hue}, 100%, 95%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(arc.x, arc.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            const g = ctx.createRadialGradient(arc.x, arc.y, 0, arc.x, arc.y, size * 4);
            g.addColorStop(0, `hsla(${arc.hue}, 100%, 80%, ${alpha * 0.5})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(arc.x, arc.y, size * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
