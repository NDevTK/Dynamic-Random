/**
 * @file sacred_geometry_architecture.js
 * @description Background architecture rendering mathematical sacred geometry patterns.
 * Five modes: Flower of Life, Fibonacci+Vogel, Penrose Tiling, Metatron's Cube,
 * Superformula morphing. Mystical, hypnotic, seed-varied.
 */

import { Architecture } from './background_architectures.js';
import { fibonacciSpiral, vogelSpiral, superformula, penroseTiling, seededPalette, waveSuperposition } from './math_patterns.js';
import { mouse } from './state.js';

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2;

export class SacredGeometryArchitecture extends Architecture {
    constructor() {
        super();
        this.mode = 0; this.palette = []; this.wave = null;
        this.rotation = 0; this.rotSpeed = 0;
        this.breathScale = 1; this.breathSpeed = 0; this.breathOffset = 0;
        this.circles = []; this.fibPoints = []; this.vogelPoints = [];
        this.tiles = []; this.metaVerts = []; this.metaEdges = [];
        this.sfParams = null; this.sfTarget = null; this.sfInterp = 0; this.sfMorphSpeed = 0;
        this.angularVelocities = []; this.elementPhases = [];
        this.cx = 0; this.cy = 0; this.baseRadius = 0;
    }

    init(system) {
        this.mode = Math.floor(system.rng() * 5);
        this.palette = seededPalette(system.rng);
        this.wave = waveSuperposition(system.rng);
        this.rotation = system.rng() * TAU;
        this.rotSpeed = (system.rng() - 0.5) * 0.0005;
        this.breathSpeed = 0.014 + system.rng() * 0.012;
        this.breathOffset = system.rng() * TAU;
        this.sfMorphSpeed = 0.002 + system.rng() * 0.003;
        this.cx = system.width / 2;
        this.cy = system.height / 2;
        this.baseRadius = Math.min(system.width, system.height) * 0.38;

        if (this.mode === 0) this._initFlowerOfLife(system);
        else if (this.mode === 1) this._initFibonacci(system);
        else if (this.mode === 2) this._initPenrose(system);
        else if (this.mode === 3) this._initMetatron(system);
        else this._initSuperformula(system);
    }

    _initFlowerOfLife(system) {
        const r = this.baseRadius * 0.22;
        this.circles = [{ x: 0, y: 0, r, phase: system.rng() * TAU }];
        for (let ring = 1; ring <= 3; ring++) {
            for (let i = 0; i < 6 * ring; i++) {
                const seg = Math.floor(i / ring), step = i - seg * ring;
                const a0 = (seg / 6) * TAU - Math.PI / 6;
                const a1 = ((seg + 1) / 6) * TAU - Math.PI / 6;
                this.circles.push({
                    x: Math.cos(a0) * ring * r + (Math.cos(a1) - Math.cos(a0)) * step * r,
                    y: Math.sin(a0) * ring * r + (Math.sin(a1) - Math.sin(a0)) * step * r,
                    r, phase: system.rng() * TAU
                });
            }
        }
        this.angularVelocities = this.circles.map(() => (system.rng() - 0.5) * 0.0008);
        this.elementPhases = this.circles.map(() => system.rng() * TAU);
    }

    _initFibonacci(system) {
        this.fibPoints = fibonacciSpiral(200, this.baseRadius, system.rng);
        this.vogelPoints = vogelSpiral(200, this.baseRadius * 0.9, system.rng);
        this.angularVelocities = this.fibPoints.map(() => (system.rng() - 0.5) * 0.0005);
        this.elementPhases = this.fibPoints.map(() => system.rng() * TAU);
    }

    _initPenrose(system) {
        this.tiles = penroseTiling(this.cx, this.cy, this.baseRadius, 4 + Math.floor(system.rng() * 2), system.rng);
        this.elementPhases = this.tiles.map(() => system.rng() * TAU);
        this.angularVelocities = [(system.rng() - 0.5) * 0.0003];
    }

    _initMetatron(system) {
        this.metaVerts = [{ x: 0, y: 0 }];
        this.metaEdges = [];
        const r1 = this.baseRadius * 0.38, r2 = this.baseRadius * 0.72;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            this.metaVerts.push({ x: Math.cos(a) * r1, y: Math.sin(a) * r1 });
            this.metaVerts.push({ x: Math.cos(a) * r2, y: Math.sin(a) * r2 });
        }
        for (let i = 0; i < this.metaVerts.length; i++)
            for (let j = i + 1; j < this.metaVerts.length; j++)
                this.metaEdges.push([i, j]);
        this.angularVelocities = this.metaVerts.map(() => (system.rng() - 0.5) * 0.0006);
        this.elementPhases = this.metaVerts.map(() => system.rng() * TAU);
    }

    _initSuperformula(system) {
        this.sfParams = superformula(240, system.rng);
        this.sfTarget = superformula(240, system.rng);
        this.sfInterp = 0;
        this.elementPhases = [system.rng() * TAU];
    }

    update(system) {
        const t = system.tick;
        this.rotation += this.rotSpeed * system.speedMultiplier;
        this.breathScale = 1 + Math.sin(t * this.breathSpeed + this.breathOffset) * 0.04;
        for (let i = 0; i < this.angularVelocities.length; i++) {
            this.angularVelocities[i] += this.wave(i * 0.13, i * 0.07, t * 0.008) * 0.00003;
            this.angularVelocities[i] *= 0.999;
        }
        if (this.mode === 4) {
            this.sfInterp += this.sfMorphSpeed * system.speedMultiplier;
            if (this.sfInterp >= 1) {
                this.sfParams = this.sfTarget;
                this.sfTarget = superformula(240, system.rng);
                this.sfInterp = 0;
            }
        }
    }

    draw(system) {
        const ctx = system.ctx, t = system.tick * 0.016;
        const cx = this.cx, cy = this.cy;
        // Radial symmetry lines (all modes)
        const symCount = this.mode === 4 ? Math.max(3, (this.sfParams?.m % 12) || 6) : 6;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `hsla(${this._hue(0)}, 60%, 50%, 0.028)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < symCount; i++) {
            const a = (i / symCount) * TAU + this.rotation;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * this.baseRadius * 1.25, cy + Math.sin(a) * this.baseRadius * 1.25);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation);
        ctx.scale(this.breathScale, this.breathScale);
        if (this.mode === 0) this._drawFlowerOfLife(ctx, t);
        else if (this.mode === 1) this._drawFibonacci(ctx, t);
        else if (this.mode === 2) this._drawPenrose(ctx, t);
        else if (this.mode === 3) this._drawMetatron(ctx, t);
        else this._drawSuperformula(ctx, t);
        ctx.restore();
    }

    _hue(index) {
        const m = this.palette[index % this.palette.length]?.match(/hsl\((\d+\.?\d*)/);
        return m ? parseFloat(m[1]) : index * 60;
    }

    _mouseProximity(wx, wy, radius = 120) {
        const mdx = mouse.x - this.cx, mdy = mouse.y - this.cy;
        const cos = Math.cos(-this.rotation), sin = Math.sin(-this.rotation);
        const lx = (mdx * cos - mdy * sin) / this.breathScale;
        const ly = (mdx * sin + mdy * cos) / this.breathScale;
        return Math.max(0, 1 - Math.sqrt((lx - wx) ** 2 + (ly - wy) ** 2) / radius);
    }

    // ── Mode 0: Flower of Life ────────────────────────────────────────────────

    _drawFlowerOfLife(ctx, t) {
        ctx.globalCompositeOperation = 'source-over';
        this.circles.forEach((c, i) => {
            const wv = this.wave(c.x * 0.01, c.y * 0.01, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(c.x, c.y, c.r * 3.5);
            const hue = this._hue(i % 3);
            ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${0.09 + wv * 0.07 + glow * 0.16})`;
            ctx.lineWidth = 0.7 + glow * 1.2;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, TAU);
            ctx.stroke();
        });

        // Intersection-point node dots at 6 circle-circumference positions per circle
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.circles.forEach((c, i) => {
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * TAU + c.phase;
                const nx = c.x + Math.cos(a) * c.r;
                const ny = c.y + Math.sin(a) * c.r;
                const pulse = 0.5 + Math.sin(t * 1.1 + this.elementPhases[i] + k * 1.05) * 0.5;
                const glow = this._mouseProximity(nx, ny, 80);
                const nodR = 1.5 + pulse * 2 + glow * 3.5;
                const hue = this._hue(i);
                const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nodR * 3);
                grad.addColorStop(0, `hsla(${hue}, 90%, 88%, ${0.5 * pulse + glow * 0.4})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(nx, ny, nodR * 3, 0, TAU);
                ctx.fill();
            }
        });
        ctx.restore();
    }

    // ── Mode 1: Fibonacci + Vogel ─────────────────────────────────────────────

    _drawFibonacci(ctx, t) {
        const pts = this.fibPoints;
        const vpts = this.vogelPoints;
        const hue0 = this._hue(0), hue1 = this._hue(1), hue2 = this._hue(2);
        const goldenStep = Math.max(1, Math.floor(pts.length / PHI / PHI));

        // Golden-ratio connecting lines
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < pts.length - goldenStep; i += 4) {
            const p = pts[i], q = pts[i + goldenStep];
            const wv = this.wave(p.x * 0.005, p.y * 0.005, t) * 0.5 + 0.5;
            ctx.strokeStyle = `hsla(${hue2}, 60%, 70%, ${0.055 + wv * 0.05})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
        }
        ctx.restore();

        // Fibonacci spiral as dotted curve
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < pts.length - 1; i += 2) {
            const p = pts[i];
            const wv = this.wave(p.x * 0.008, p.y * 0.008, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(p.x, p.y, 80);
            ctx.fillStyle = `hsla(${hue0}, 80%, 75%, ${0.28 + wv * 0.3 + glow * 0.3})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1 + wv * 1.5 + glow * 2.5, 0, TAU);
            ctx.fill();
        }
        ctx.restore();

        // Vogel sunflower as sized glowing circles
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < vpts.length; i++) {
            const v = vpts[i];
            const wv = this.wave(v.x * 0.006, v.y * 0.006, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(v.x, v.y, 100);
            const r = (2 + v.t * 5.5 + glow * 4.5) * (0.65 + wv * 0.6);
            const alpha = 0.14 + wv * 0.2 + glow * 0.4;
            const grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r);
            grad.addColorStop(0, `hsla(${hue1}, 85%, 82%, ${alpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(v.x, v.y, r, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    // ── Mode 2: Penrose Tiling ────────────────────────────────────────────────

    _drawPenrose(ctx, t) {
        if (!this.tiles.length) return;
        const hue0 = this._hue(0), hue1 = this._hue(2);

        // Undo parent translate — Penrose tiles are in absolute canvas coords
        ctx.save();
        ctx.translate(-this.cx, -this.cy);
        ctx.rotate(-this.rotation);
        ctx.scale(1 / this.breathScale, 1 / this.breathScale);

        // Re-apply just the Penrose slow drift
        ctx.translate(this.cx, this.cy);
        ctx.rotate(this.rotation + this.angularVelocities[0] * t * 20);
        ctx.scale(this.breathScale, this.breathScale);
        ctx.translate(-this.cx, -this.cy);

        ctx.globalCompositeOperation = 'source-over';
        this.tiles.forEach((tri, i) => {
            const mx = (tri.A.x + tri.B.x + tri.C.x) / 3;
            const my = (tri.A.y + tri.B.y + tri.C.y) / 3;
            const wv = this.wave(mx * 0.004, my * 0.004, t) * 0.5 + 0.5;
            const glow = Math.max(0, 1 - Math.hypot(mouse.x - mx, mouse.y - my) / 140);
            const phase = this.elementPhases[i % this.elementPhases.length];
            const pulse = 0.5 + Math.sin(t * 0.85 + phase) * 0.5;
            const hue = tri.type === 0 ? hue0 : hue1;
            const fillA = 0.04 + wv * 0.055 + glow * 0.1 + pulse * 0.018;

            ctx.beginPath();
            ctx.moveTo(tri.A.x, tri.A.y);
            ctx.lineTo(tri.B.x, tri.B.y);
            ctx.lineTo(tri.C.x, tri.C.y);
            ctx.closePath();

            ctx.fillStyle = `hsla(${hue}, 65%, 55%, ${fillA})`;
            ctx.fill();
            ctx.strokeStyle = `hsla(${hue}, 70%, 75%, ${0.08 + glow * 0.22 + pulse * 0.04})`;
            ctx.lineWidth = 0.6 + glow * 0.8;
            ctx.stroke();
        });

        // Glow pass using lighter composite on mouse-near tiles
        ctx.globalCompositeOperation = 'lighter';
        this.tiles.forEach((tri, i) => {
            const mx = (tri.A.x + tri.B.x + tri.C.x) / 3;
            const my = (tri.A.y + tri.B.y + tri.C.y) / 3;
            const glow = Math.max(0, 1 - Math.hypot(mouse.x - mx, mouse.y - my) / 100);
            if (glow < 0.05) return;
            const hue = tri.type === 0 ? hue0 : hue1;
            ctx.beginPath();
            ctx.moveTo(tri.A.x, tri.A.y);
            ctx.lineTo(tri.B.x, tri.B.y);
            ctx.lineTo(tri.C.x, tri.C.y);
            ctx.closePath();
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${glow * 0.14})`;
            ctx.fill();
        });

        ctx.restore();
    }

    // ── Mode 3: Metatron's Cube ───────────────────────────────────────────────

    _drawMetatron(ctx, t) {
        const verts = this.metaVerts;
        const hue0 = this._hue(0), hue1 = this._hue(1), hue2 = this._hue(2);

        // Edges — thin lines, lighter composite for ethereal glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.metaEdges.forEach(([a, b]) => {
            const va = verts[a], vb = verts[b];
            const midX = (va.x + vb.x) / 2, midY = (va.y + vb.y) / 2;
            const wv = this.wave(midX * 0.007, midY * 0.007, t) * 0.5 + 0.5;
            const alpha = 0.04 + wv * 0.06;
            ctx.strokeStyle = `hsla(${hue0}, 70%, 65%, ${alpha})`;
            ctx.lineWidth = 0.45;
            ctx.beginPath();
            ctx.moveTo(va.x, va.y);
            ctx.lineTo(vb.x, vb.y);
            ctx.stroke();
        });
        ctx.restore();

        // Nested platonic projections: tetrahedron (3), cube (4), octahedron (8), hexagon (6)
        const shapes = [
            { sides: 3, r: this.baseRadius * 0.28, rot: 0, hue: hue0 },
            { sides: 4, r: this.baseRadius * 0.42, rot: Math.PI / 4, hue: hue1 },
            { sides: 3, r: this.baseRadius * 0.56, rot: Math.PI / 3, hue: hue2 },
            { sides: 6, r: this.baseRadius * 0.72, rot: 0, hue: hue0 },
            { sides: 8, r: this.baseRadius * 0.88, rot: Math.PI / 8, hue: hue1 },
        ];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        shapes.forEach(({ sides, r, rot, hue }, si) => {
            const pulse = 0.5 + Math.sin(t * 0.7 + r * 0.01 + si) * 0.5;
            ctx.strokeStyle = `hsla(${hue}, 75%, 70%, ${0.06 + pulse * 0.07})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            for (let i = 0; i <= sides; i++) {
                const a = (i / sides) * TAU + rot + this.rotation * 0.3;
                i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                        : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.stroke();
        });
        ctx.restore();

        // Vertex glow dots — slow drift via angular velocities
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        verts.forEach((v, i) => {
            // Drift each vertex slightly around its origin
            const driftA = this.angularVelocities[i] * t * 30;
            const vr = Math.sqrt(v.x * v.x + v.y * v.y);
            const baseA = Math.atan2(v.y, v.x);
            const dx = Math.cos(baseA + driftA) * vr;
            const dy = Math.sin(baseA + driftA) * vr;

            const wv = this.wave(dx * 0.01, dy * 0.01, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(dx, dy, 90);
            const pulse = 0.35 + Math.sin(t * 1.0 + this.elementPhases[i]) * 0.65;
            const r = (3 + wv * 4 + glow * 6) * Math.max(0.1, pulse);
            const hue = this._hue(i % 3);
            const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
            grad.addColorStop(0, `hsla(${hue}, 95%, 92%, ${0.55 + glow * 0.4})`);
            grad.addColorStop(0.4, `hsla(${hue}, 80%, 60%, ${0.18 + glow * 0.2})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(dx, dy, r, 0, TAU);
            ctx.fill();
        });
        ctx.restore();
    }

    // ── Mode 4: Superformula Morphing ─────────────────────────────────────────

    _drawSuperformula(ctx, t) {
        if (!this.sfParams || !this.sfTarget) return;
        const pA = this.sfParams.points;
        const pB = this.sfTarget.points;
        const lerp = this.sfInterp;
        // Ease-in-out lerp
        const ease = lerp < 0.5 ? 2 * lerp * lerp : 1 - Math.pow(-2 * lerp + 2, 2) / 2;
        const R = this.baseRadius;
        const hue0 = this._hue(0), hue1 = this._hue(1);

        // Build interpolated path
        const pts = pA.map((a, i) => {
            const b = pB[i] || a;
            return {
                x: (a.x * (1 - ease) + b.x * ease) * R,
                y: (a.y * (1 - ease) + b.y * ease) * R
            };
        });

        // Radial fill gradient
        const pulse = 0.5 + Math.sin(t * 0.8 + this.elementPhases[0]) * 0.5;
        const maxR = R * 1.15;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
        grad.addColorStop(0, `hsla(${hue0}, 70%, 40%, ${0.06 + pulse * 0.05})`);
        grad.addColorStop(0.5, `hsla(${hue1}, 65%, 30%, 0.03)`);
        grad.addColorStop(1, 'transparent');

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // Gradient outline stroke — 'lighter' for glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length];
            const wv = this.wave(p.x * 0.005, p.y * 0.005, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(p.x, p.y, 100);
            const alpha = 0.10 + wv * 0.16 + glow * 0.32;
            ctx.strokeStyle = `hsla(${hue0 + wv * 30}, 80%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
        }

        // Mouse proximity glow burst
        const mdx = mouse.x - this.cx;
        const mdy = mouse.y - this.cy;
        // Transform to local space
        const cos = Math.cos(-this.rotation), sin = Math.sin(-this.rotation);
        const lx = (mdx * cos - mdy * sin) / this.breathScale;
        const ly = (mdx * sin + mdy * cos) / this.breathScale;
        const mDist = Math.sqrt(lx * lx + ly * ly);
        if (mDist < R * 1.3) {
            const intensity = 1 - mDist / (R * 1.3);
            const mGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 65);
            mGrad.addColorStop(0, `hsla(${hue1}, 90%, 82%, ${intensity * 0.28})`);
            mGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = mGrad;
            ctx.beginPath();
            ctx.arc(lx, ly, 65, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }
}
