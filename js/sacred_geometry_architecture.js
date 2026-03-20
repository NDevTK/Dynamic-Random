/**
 * @file sacred_geometry_architecture.js
 * @description Background architecture rendering mathematical sacred geometry patterns.
 * Five modes: Flower of Life, Fibonacci+Vogel, Penrose Tiling,
 * Metatron's Cube, and Superformula morphing.
 */

import { Architecture } from './background_architectures.js';
import { fibonacciSpiral, vogelSpiral, superformula, penroseTiling, seededPalette, waveSuperposition } from './math_patterns.js';
import { mouse } from './state.js';

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2;

export class SacredGeometryArchitecture extends Architecture {
    constructor() {
        super();
        this.mode = 0;
        this.palette = [];
        this.wave = null;
        this.rotation = 0;
        this.breathScale = 1;
        // Per-mode geometry
        this.circles = [];       // mode 0
        this.fibPoints = [];     // mode 1
        this.vogelPoints = [];   // mode 1
        this.tiles = [];         // mode 2
        this.metaVerts = [];     // mode 3
        this.metaEdges = [];     // mode 3
        this.sfParams = null;    // mode 4
        this.sfTarget = null;    // mode 4
        this.sfInterp = 0;
        this.angularVelocities = [];
        this.elementPhases = [];
        this.cx = 0;
        this.cy = 0;
        this.baseRadius = 0;
    }

    init(system) {
        this.mode = Math.floor(system.rng() * 5);
        this.palette = seededPalette(system.rng);
        this.wave = waveSuperposition(system.rng);
        this.rotation = system.rng() * TAU;
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
        // Central + 6 rings of hexagonal circles
        this.circles = [];
        const r = this.baseRadius * 0.22;
        const rings = 3;
        this.circles.push({ x: 0, y: 0, r, phase: system.rng() * TAU });
        for (let ring = 1; ring <= rings; ring++) {
            for (let i = 0; i < 6 * ring; i++) {
                const seg = Math.floor(i / ring);
                const step = i - seg * ring;
                const a0 = (seg / 6) * TAU - Math.PI / 6;
                const a1 = ((seg + 1) / 6) * TAU - Math.PI / 6;
                const x = Math.cos(a0) * ring * r + Math.cos(a1) * step * r - Math.cos(a0) * step * r;
                const y = Math.sin(a0) * ring * r + Math.sin(a1) * step * r - Math.sin(a0) * step * r;
                this.circles.push({ x, y, r, phase: system.rng() * TAU });
            }
        }
        this.angularVelocities = this.circles.map(() => (system.rng() - 0.5) * 0.0008);
        this.elementPhases = this.circles.map(() => system.rng() * TAU);
    }

    _initFibonacci(system) {
        const count = 180;
        this.fibPoints = fibonacciSpiral(count, this.baseRadius, system.rng);
        this.vogelPoints = vogelSpiral(count, this.baseRadius * 0.9, system.rng);
        this.angularVelocities = this.fibPoints.map(() => (system.rng() - 0.5) * 0.0005);
        this.elementPhases = this.fibPoints.map(() => system.rng() * TAU);
    }

    _initPenrose(system) {
        const depth = 4 + Math.floor(system.rng() * 2);
        this.tiles = penroseTiling(this.cx, this.cy, this.baseRadius, depth, system.rng);
        this.elementPhases = this.tiles.map(() => system.rng() * TAU);
    }

    _initMetatron(system) {
        // 13 vertices: center + 6 inner + 6 outer (Star of David)
        this.metaVerts = [];
        this.metaEdges = [];
        const r1 = this.baseRadius * 0.38;
        const r2 = this.baseRadius * 0.72;
        this.metaVerts.push({ x: 0, y: 0, phase: system.rng() * TAU });
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            this.metaVerts.push({ x: Math.cos(a) * r1, y: Math.sin(a) * r1, phase: system.rng() * TAU });
            this.metaVerts.push({ x: Math.cos(a) * r2, y: Math.sin(a) * r2, phase: system.rng() * TAU });
        }
        // Connect all vertices to each other
        for (let i = 0; i < this.metaVerts.length; i++) {
            for (let j = i + 1; j < this.metaVerts.length; j++) {
                this.metaEdges.push([i, j]);
            }
        }
        this.angularVelocities = this.metaVerts.map(() => (system.rng() - 0.5) * 0.0006);
        this.elementPhases = this.metaVerts.map(() => system.rng() * TAU);
    }

    _initSuperformula(system) {
        this.sfParams = superformula(180, system.rng);
        this.sfTarget = superformula(180, system.rng);
        this.sfInterp = 0;
        this.elementPhases = this.sfParams.points.map(() => system.rng() * TAU);
    }

    update(system) {
        const t = system.tick;
        this.rotation += 0.0003 * system.speedMultiplier;
        this.breathScale = 1 + Math.sin(t * 0.018) * 0.04;

        if (this.mode === 4) {
            this.sfInterp += 0.003 * system.speedMultiplier;
            if (this.sfInterp >= 1) {
                this.sfParams = this.sfTarget;
                this.sfTarget = superformula(180, system.rng);
                this.sfInterp = 0;
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const t = system.tick * 0.016;
        const cx = this.cx, cy = this.cy;

        // Radial symmetry guide lines (all modes)
        this._drawSymmetryLines(ctx, cx, cy, t);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation);
        ctx.scale(this.breathScale, this.breathScale);

        if (this.mode === 0) this._drawFlowerOfLife(ctx, t);
        else if (this.mode === 1) this._drawFibonacci(ctx, t);
        else if (this.mode === 2) this._drawPenrose(ctx, cx, cy, t);
        else if (this.mode === 3) this._drawMetatron(ctx, t);
        else this._drawSuperformula(ctx, t);

        ctx.restore();
    }

    _drawSymmetryLines(ctx, cx, cy, t) {
        const count = this.mode === 4 ? (this.sfParams ? this.sfParams.m : 6) : 6;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `hsla(${this._hue(0)}, 60%, 50%, 0.03)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * TAU + this.rotation;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * this.baseRadius * 1.2, cy + Math.sin(a) * this.baseRadius * 1.2);
            ctx.stroke();
        }
        ctx.restore();
    }

    _hue(index) {
        const color = this.palette[index % this.palette.length];
        // Extract hue number from hsl string; fallback to index * 60
        const m = color && color.match(/hsl\((\d+\.?\d*)/);
        return m ? parseFloat(m[1]) : index * 60;
    }

    _mouseProximity(wx, wy) {
        // Returns 0..1 glow factor based on mouse distance (in world coords)
        const dx = (mouse.x - this.cx) - wx;
        const dy = (mouse.y - this.cy) - wy;
        const d = Math.sqrt(dx * dx + dy * dy);
        return Math.max(0, 1 - d / 120);
    }

    _drawFlowerOfLife(ctx, t) {
        ctx.globalCompositeOperation = 'source-over';
        // Draw circles
        this.circles.forEach((c, i) => {
            const wv = this.wave(c.x * 0.01, c.y * 0.01, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(c.x, c.y);
            const alpha = 0.08 + wv * 0.07 + glow * 0.15;
            const hue = this._hue(i % 3);

            ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${alpha})`;
            ctx.lineWidth = 0.8 + glow;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, TAU);
            ctx.stroke();
        });

        // Intersection node dots with glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.circles.forEach((c, i) => {
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * TAU + c.phase + t * 0.08;
                const nx = c.x + Math.cos(a) * c.r;
                const ny = c.y + Math.sin(a) * c.r;
                const pulse = 0.5 + Math.sin(t * 1.2 + this.elementPhases[i] + k) * 0.5;
                const glow = this._mouseProximity(nx, ny);
                const nodR = (1.5 + pulse * 1.5 + glow * 3);
                const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nodR * 3);
                const hue = this._hue(i);
                grad.addColorStop(0, `hsla(${hue}, 90%, 85%, ${0.5 * pulse + glow * 0.4})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(nx, ny, nodR * 3, 0, TAU);
                ctx.fill();
            }
        });
        ctx.restore();
    }

    _drawFibonacci(ctx, t) {
        const pts = this.fibPoints;
        const vpts = this.vogelPoints;
        const hue0 = this._hue(0), hue1 = this._hue(1), hue2 = this._hue(2);

        // Golden-ratio connecting lines
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < pts.length - 1; i += 3) {
            const p = pts[i], q = pts[i + Math.floor(pts.length / PHI / PHI) % pts.length] || pts[pts.length - 1];
            const wv = this.wave(p.x * 0.005, p.y * 0.005, t) * 0.5 + 0.5;
            ctx.strokeStyle = `hsla(${hue2}, 60%, 70%, ${0.06 + wv * 0.05})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
        }
        ctx.restore();

        // Spiral dotted curve
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < pts.length - 1; i++) {
            if (i % 3 !== 0) continue;
            const p = pts[i];
            const wv = this.wave(p.x * 0.008, p.y * 0.008, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(p.x, p.y);
            ctx.fillStyle = `hsla(${hue0}, 80%, 75%, ${0.3 + wv * 0.3 + glow * 0.3})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1 + wv * 1.5 + glow * 2, 0, TAU);
            ctx.fill();
        }
        ctx.restore();

        // Vogel sunflower points as sized circles with glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < vpts.length; i++) {
            const v = vpts[i];
            const wv = this.wave(v.x * 0.006, v.y * 0.006, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(v.x, v.y);
            const r = (2 + v.t * 5 + glow * 4) * (0.7 + wv * 0.6);
            const alpha = 0.15 + wv * 0.2 + glow * 0.4;
            const grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r);
            grad.addColorStop(0, `hsla(${hue1}, 85%, 80%, ${alpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(v.x, v.y, r, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawPenrose(ctx, wcx, wcy, t) {
        // Tiles are in world space; undo parent translate for proximity test
        ctx.save();
        ctx.translate(-this.cx, -this.cy); // back to canvas coords

        const hue0 = this._hue(0), hue1 = this._hue(2);
        this.tiles.forEach((tri, i) => {
            const mx = (tri.A.x + tri.B.x + tri.C.x) / 3;
            const my = (tri.A.y + tri.B.y + tri.C.y) / 3;
            const wv = this.wave(mx * 0.004, my * 0.004, t) * 0.5 + 0.5;
            const glow = Math.max(0, 1 - Math.hypot(mouse.x - mx, mouse.y - my) / 130);
            const phase = this.elementPhases[i % this.elementPhases.length];
            const pulse = 0.5 + Math.sin(t * 0.9 + phase) * 0.5;
            const isThick = tri.type === 0;
            const hue = isThick ? hue0 : hue1;
            const fillA = 0.04 + wv * 0.05 + glow * 0.1 + pulse * 0.02;

            ctx.beginPath();
            ctx.moveTo(tri.A.x, tri.A.y);
            ctx.lineTo(tri.B.x, tri.B.y);
            ctx.lineTo(tri.C.x, tri.C.y);
            ctx.closePath();

            ctx.fillStyle = `hsla(${hue}, 65%, 55%, ${fillA})`;
            ctx.fill();

            ctx.strokeStyle = `hsla(${hue}, 70%, 75%, ${0.08 + glow * 0.2 + pulse * 0.04})`;
            ctx.lineWidth = 0.6 + glow;
            ctx.stroke();
        });
        ctx.restore();
    }

    _drawMetatron(ctx, t) {
        const verts = this.metaVerts;
        const hue0 = this._hue(0), hue1 = this._hue(1), hue2 = this._hue(2);

        // Edges as thin glowing lines
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.metaEdges.forEach(([a, b]) => {
            const va = verts[a], vb = verts[b];
            const mx = (va.x + vb.x) / 2, my = (va.y + vb.y) / 2;
            const wv = this.wave(mx * 0.006, my * 0.006, t) * 0.5 + 0.5;
            const len = Math.hypot(vb.x - va.x, vb.y - va.y);
            const alpha = 0.04 + wv * 0.06;
            ctx.strokeStyle = `hsla(${hue0}, 70%, 65%, ${alpha})`;
            ctx.lineWidth = 0.4 + (1 - len / (this.baseRadius * 1.5)) * 0.5;
            ctx.beginPath();
            ctx.moveTo(va.x, va.y);
            ctx.lineTo(vb.x, vb.y);
            ctx.stroke();
        });
        ctx.restore();

        // Nested geometric shape outlines (tetrahedron, cube, octahedron projections)
        const shapes = [
            { sides: 3, r: this.baseRadius * 0.28, rot: 0, hue: hue0 },
            { sides: 4, r: this.baseRadius * 0.42, rot: Math.PI / 4, hue: hue1 },
            { sides: 3, r: this.baseRadius * 0.56, rot: Math.PI / 3, hue: hue2 },
            { sides: 6, r: this.baseRadius * 0.72, rot: 0, hue: hue0 },
            { sides: 8, r: this.baseRadius * 0.85, rot: Math.PI / 8, hue: hue1 },
        ];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        shapes.forEach(({ sides, r, rot, hue }) => {
            const pulse = 0.5 + Math.sin(t * 0.7 + r) * 0.5;
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

        // Vertex glow dots
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        verts.forEach((v, i) => {
            const wv = this.wave(v.x * 0.01, v.y * 0.01, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(v.x, v.y);
            const pulse = 0.4 + Math.sin(t * 1.1 + this.elementPhases[i]) * 0.6;
            const r = (3 + wv * 4 + glow * 6) * pulse;
            const hue = this._hue(i % 3);
            const grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r);
            grad.addColorStop(0, `hsla(${hue}, 95%, 90%, ${0.6 + glow * 0.4})`);
            grad.addColorStop(0.4, `hsla(${hue}, 80%, 60%, ${0.2 + glow * 0.2})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(v.x, v.y, r, 0, TAU);
            ctx.fill();
        });
        ctx.restore();
    }

    _drawSuperformula(ctx, t) {
        const pA = this.sfParams.points;
        const pB = this.sfTarget.points;
        const lerp = this.sfInterp;
        const R = this.baseRadius;
        const hue0 = this._hue(0), hue1 = this._hue(1);

        // Build interpolated path
        const pts = pA.map((a, i) => {
            const b = pB[i] || a;
            return {
                x: (a.x * (1 - lerp) + b.x * lerp) * R,
                y: (a.y * (1 - lerp) + b.y * lerp) * R
            };
        });

        // Radial fill gradient
        const maxR = R * 1.1;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
        const pulse = 0.5 + Math.sin(t * 0.8) * 0.5;
        grad.addColorStop(0, `hsla(${hue0}, 70%, 40%, ${0.06 + pulse * 0.05})`);
        grad.addColorStop(0.5, `hsla(${hue1}, 65%, 30%, 0.04)`);
        grad.addColorStop(1, 'transparent');

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // Gradient stroke (lighter composite for glow)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length];
            const wv = this.wave(p.x * 0.005, p.y * 0.005, t) * 0.5 + 0.5;
            const glow = this._mouseProximity(p.x, p.y);
            const alpha = 0.1 + wv * 0.15 + glow * 0.3;
            ctx.strokeStyle = `hsla(${hue0 + wv * 30}, 80%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
        }
        // Mouse-area glow burst
        const mdx = mouse.x - this.cx, mdy = mouse.y - this.cy;
        const mDist = Math.hypot(mdx, mdy);
        if (mDist < R * 1.2) {
            const intensity = 1 - mDist / (R * 1.2);
            const mGrad = ctx.createRadialGradient(mdx, mdy, 0, mdx, mdy, 60);
            mGrad.addColorStop(0, `hsla(${hue1}, 90%, 80%, ${intensity * 0.3})`);
            mGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = mGrad;
            ctx.beginPath();
            ctx.arc(mdx, mdy, 60, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }
}
