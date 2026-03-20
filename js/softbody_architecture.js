/**
 * @file softbody_architecture.js
 * @description Background architecture: pressure-inflated soft body blobs via wasmPhysics.
 * Features gravity, mouse repulsion, wall bounce, inter-body collision, bezier curves,
 * gradient fills, specular highlights, and expressive wandering eyes on the largest blob.
 */

import { Architecture } from './background_architectures.js';
import { wasmPhysics } from './wasm_physics.js';
import { mouse } from './state.js';

function centroid(pts) {
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
    return { x: cx / pts.length, y: cy / pts.length };
}
function avgRadius(pts, cen) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
        const dx = pts[i].x - cen.x, dy = pts[i].y - cen.y;
        s += Math.sqrt(dx * dx + dy * dy);
    }
    return s / pts.length;
}

export class SoftbodyArchitecture extends Architecture {
    constructor() {
        super();
        this.bodies = [];
        this.time = 0;
        this.largestIndex = 0;
        this.eyePhase = 0;
    }

    init(system) {
        wasmPhysics.init();
        this.time = 0; this.eyePhase = 0; this.bodies = [];

        const count = 3 + Math.floor(system.rng() * 3); // 3..5
        const configs = [
            { r: 110, n: 16, pressure: 0.35 },
            { r: 75,  n: 12, pressure: 0.30 },
            { r: 55,  n: 10, pressure: 0.28 },
            { r: 90,  n: 14, pressure: 0.32 },
            { r: 45,  n: 9,  pressure: 0.25 },
        ];
        const positions = [
            { x: system.width * 0.25, y: system.height * 0.35 },
            { x: system.width * 0.70, y: system.height * 0.30 },
            { x: system.width * 0.50, y: system.height * 0.65 },
            { x: system.width * 0.20, y: system.height * 0.70 },
            { x: system.width * 0.80, y: system.height * 0.60 },
        ];

        let largestR = 0;
        for (let i = 0; i < count; i++) {
            const cfg = configs[i], pos = positions[i];
            const hue = (system.hue + i * 47 + system.rng() * 20) % 360;
            const { points, constraints } = wasmPhysics.createSoftBody(pos.x, pos.y, cfg.r, cfg.n);
            this.bodies.push({ points, constraints, hue, pressure: cfg.pressure });
            if (cfg.r > largestR) { largestR = cfg.r; this.largestIndex = i; }
        }
    }

    update(system) {
        const dt = system.speedMultiplier;
        this.time += 0.016 * dt;
        this.eyePhase += 0.04 * dt;

        const gravity = 0.12 * dt, damping = 0.988;
        const W = system.width, H = system.height;
        const mouseR = 130, mouseR2 = mouseR * mouseR;

        for (const body of this.bodies) {
            const { points, constraints } = body;

            // Mouse repulsion
            for (const p of points) {
                const dx = p.x - mouse.x, dy = p.y - mouse.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < mouseR2 && d2 > 1) {
                    const d = Math.sqrt(d2), f = (1 - d / mouseR) * 3.5 * dt;
                    p.oldX -= (dx / d) * f; p.oldY -= (dy / d) * f;
                }
            }

            wasmPhysics.stepSoftBody(points, constraints, body.pressure * dt, gravity, damping, 5);

            // Wall bounce
            const m = 4;
            for (const p of points) {
                if (p.x < m)     { p.oldX = p.x + (p.x - p.oldX) * 0.4; p.x = m; }
                if (p.x > W - m) { p.oldX = p.x + (p.x - p.oldX) * 0.4; p.x = W - m; }
                if (p.y < m)     { p.oldY = p.y + (p.y - p.oldY) * 0.4; p.y = m; }
                if (p.y > H - m) { p.oldY = p.y + (p.y - p.oldY) * 0.4; p.y = H - m; }
            }
        }

        this._resolveBodyCollisions(dt);
    }

    _resolveBodyCollisions(dt) {
        for (let ai = 0; ai < this.bodies.length - 1; ai++) {
            const a = this.bodies[ai];
            const cenA = centroid(a.points), rA = avgRadius(a.points, cenA);
            for (let bi = ai + 1; bi < this.bodies.length; bi++) {
                const b = this.bodies[bi];
                const cenB = centroid(b.points), rB = avgRadius(b.points, cenB);
                const dx = cenB.x - cenA.x, dy = cenB.y - cenA.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                if (dist < rA + rB) {
                    const overlap = (rA + rB - dist) / dist;
                    const px = dx * overlap * 0.15 * dt, py = dy * overlap * 0.15 * dt;
                    for (const p of a.points) { p.oldX += px; p.oldY += py; }
                    for (const p of b.points) { p.oldX -= px; p.oldY -= py; }
                }
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        for (let bi = 0; bi < this.bodies.length; bi++) {
            const body = this.bodies[bi];
            const cen = centroid(body.points);
            const r = avgRadius(body.points, cen);
            this._drawBlob(ctx, body.points, cen, r, body.hue, bi === this.largestIndex);
        }
    }

    _drawBlob(ctx, pts, cen, r, hue, isLargest) {
        const n = pts.length;
        if (n < 3) return;

        ctx.save();
        ctx.shadowColor = `hsla(${hue}, 60%, 20%, 0.35)`;
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 10;

        // Smooth closed bezier (Catmull-Rom control points)
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const curr = pts[i], next = pts[(i + 1) % n];
            const prev = pts[(i - 1 + n) % n], nn = pts[(i + 2) % n];
            if (i === 0) ctx.moveTo(curr.x, curr.y);
            ctx.bezierCurveTo(
                curr.x + (next.x - prev.x) * 0.18,
                curr.y + (next.y - prev.y) * 0.18,
                next.x - (nn.x - curr.x) * 0.18,
                next.y - (nn.y - curr.y) * 0.18,
                next.x, next.y
            );
        }
        ctx.closePath();

        // Radial gradient fill
        const gx = cen.x - r * 0.25, gy = cen.y - r * 0.3;
        const grad = ctx.createRadialGradient(gx, gy, r * 0.1, cen.x, cen.y, r * 1.15);
        grad.addColorStop(0,   `hsla(${hue}, 70%, 72%, 0.88)`);
        grad.addColorStop(0.6, `hsla(${hue}, 65%, 48%, 0.82)`);
        grad.addColorStop(1,   `hsla(${hue}, 55%, 28%, 0.75)`);
        ctx.fillStyle = grad; ctx.fill();

        // Rim
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = `hsla(${hue}, 50%, 80%, 0.30)`;
        ctx.lineWidth = 1.5; ctx.stroke();

        // Specular highlight
        const hl = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.55);
        hl.addColorStop(0, `hsla(${hue}, 80%, 95%, 0.45)`);
        hl.addColorStop(1, `hsla(${hue}, 80%, 95%, 0.00)`);
        ctx.fillStyle = hl; ctx.fill();
        ctx.restore();

        if (isLargest) this._drawEyes(ctx, cen, r, hue);
    }

    _drawEyes(ctx, cen, r, hue) {
        const eyeOff = r * 0.28, eyeR = r * 0.13, pupR = eyeR * 0.55;
        const eyeY = cen.y - r * 0.15;
        const wx = Math.sin(this.eyePhase * 0.7) * eyeR * 0.3;
        const wy = Math.sin(this.eyePhase * 0.5) * eyeR * 0.25;

        for (const side of [-1, 1]) {
            const ex = cen.x + side * eyeOff;
            // Sclera
            ctx.save();
            ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            ctx.shadowColor = `hsla(${hue}, 40%, 10%, 0.4)`; ctx.shadowBlur = 6;
            ctx.fill(); ctx.restore();
            // Pupil
            ctx.beginPath(); ctx.arc(ex + wx, eyeY + wy, pupR, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 30%, 10%, 0.9)`; ctx.fill();
            // Catchlight
            ctx.beginPath();
            ctx.arc(ex + wx + pupR * 0.3, eyeY + wy - pupR * 0.35, pupR * 0.28, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
        }
    }
}
