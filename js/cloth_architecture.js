/**
 * @file cloth_architecture.js
 * @description Background architecture: a hanging cloth simulated with position-based
 * Verlet dynamics via the wasmPhysics engine. Features wind, mouse interaction, device
 * tilt, and shading from a simulated directional light.
 */

import { Architecture } from './background_architectures.js';
import { wasmPhysics } from './wasm_physics.js';
import { mouse } from './state.js';

export class ClothArchitecture extends Architecture {
    constructor() {
        super();
        this.points = [];
        this.constraints = [];
        this.cols = 0;
        this.rows = 0;
        this.hue = 0;
        this.time = 0;
        this.windPhase = 0;
        this.windStrength = 0;
        this.windTarget = 0;
        this.windTimer = 0;
    }

    init(system) {
        wasmPhysics.init();

        this.cols = (system.qualityScale || 1) < 0.75 ? 20 : 30;
        this.rows = (system.qualityScale || 1) < 0.75 ? 14 : 20;
        const spacing = Math.min(system.width / (this.cols - 1), system.height / (this.rows - 1) * 1.2);
        const startX = (system.width - spacing * (this.cols - 1)) * 0.5;
        const startY = spacing * 0.5;

        const { points, constraints } = wasmPhysics.createClothGrid(
            this.cols, this.rows, spacing, startX, startY
        );

        // Pin every other point on the top row for a draped look
        for (let c = 0; c < this.cols; c++) {
            points[c].pinned = (c % 2 === 0);
        }

        this.points = points;
        this.constraints = constraints;
        this.hue = system.hue;
        this.time = 0;
        this.windPhase = system.rng() * Math.PI * 2;
        this.windStrength = 0.3 + system.rng() * 0.4;
        this.windTarget = this.windStrength;
        this.windTimer = 0;
    }

    update(system) {
        const dt = system.speedMultiplier;
        this.time += 0.016 * dt;
        this.windTimer -= 0.016 * dt;

        // Slowly vary wind strength
        if (this.windTimer <= 0) {
            this.windTarget = 0.2 + system.rng() * 0.8;
            this.windTimer = 3 + system.rng() * 5;
        }
        this.windStrength += (this.windTarget - this.windStrength) * 0.01;
        this.windPhase += 0.008 * dt;

        // Compute gravity + tilt
        let gx = 0;
        let gy = 0.4 * dt;
        if (system.deviceTilt) {
            gx += system.deviceTilt.gamma * 0.02;
            gy += system.deviceTilt.beta  * 0.005;
        }

        // Wind: sinusoidal horizontal force injected via applyForceAt sweeps,
        // applied as oldX nudge to every non-pinned point
        const windX = Math.sin(this.windPhase) * this.windStrength * 0.6 * dt;
        const windY = Math.cos(this.windPhase * 0.7) * this.windStrength * 0.15 * dt;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (p.pinned) continue;
            // Per-point phase offset makes the cloth billow organically
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            const phase = col * 0.3 + row * 0.15 + this.time * 1.2;
            p.oldX -= windX * (0.6 + 0.4 * Math.sin(phase));
            p.oldY -= windY * (0.5 + 0.5 * Math.cos(phase * 0.8));
        }

        // Mouse push / pull
        wasmPhysics.applyForceAt(
            this.points,
            (mouse.x - (this.points[0] ? this.points[0].x : 0)) * 0.0,  // direction computed inside
            0,
            mouse.x, mouse.y, 100
        );
        // Radial push outward from mouse
        const pushR = 100;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (p.pinned) continue;
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < pushR * pushR && d2 > 1) {
                const d = Math.sqrt(d2);
                const f = (1 - d / pushR) * 2.5 * dt;
                p.oldX -= (dx / d) * f;
                p.oldY -= (dy / d) * f;
            }
        }

        // Step cloth physics
        wasmPhysics.stepCloth(this.points, this.constraints, gy + gx * 0.1, 0.985, 4);
    }

    draw(system) {
        const ctx = system.ctx;
        const cols = this.cols;
        const rows = this.rows;
        const pts = this.points;

        // Light direction (top-left)
        const lx = -0.6, ly = -0.8;

        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const i00 = r * cols + c;
                const i10 = r * cols + (c + 1);
                const i01 = (r + 1) * cols + c;
                const i11 = (r + 1) * cols + (c + 1);

                const p00 = pts[i00];
                const p10 = pts[i10];
                const p01 = pts[i01];
                const p11 = pts[i11];

                // Draw two triangles per quad
                this._drawTriangle(ctx, p00, p10, p11, lx, ly, system.hue);
                this._drawTriangle(ctx, p00, p11, p01, lx, ly, system.hue);
            }
        }

        // Draw constraint lines with opacity based on stretch
        ctx.lineWidth = 0.6;
        for (let ci = 0; ci < this.constraints.length; ci++) {
            const con = this.constraints[ci];
            // Only draw structural (non-diagonal) constraints for clarity
            if (con.restLength > this.constraints[0].restLength * 1.3) continue;
            const p1 = pts[con.p1Index];
            const p2 = pts[con.p2Index];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const stretch = Math.sqrt(dx * dx + dy * dy) / con.restLength;
            const alpha = Math.min(0.08 + (stretch - 1) * 0.3, 0.45);
            ctx.strokeStyle = `hsla(${system.hue}, 60%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        // Draw pin points
        for (let c = 0; c < cols; c++) {
            const p = pts[c];
            if (!p.pinned) continue;
            ctx.fillStyle = `hsla(${system.hue}, 40%, 80%, 0.6)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawTriangle(ctx, a, b, c, lx, ly) {
        // Compute face normal (2D cross-product gives z; x/y components come from edge deltas)
        const ax = b.x - a.x, ay = b.y - a.y;
        const bx = c.x - a.x, by = c.y - a.y;
        // 3D normal assuming z=0 plane: N = (0,0,1) cross-product approximation
        // Use the signed area to get a brightness value
        const cross = ax * by - ay * bx; // positive = front-facing
        const area = Math.abs(cross) * 0.5;
        if (area < 0.5) return; // skip degenerate triangles

        // Approximate surface normal from edge direction
        const nx = -(ay + by) * 0.5;
        const ny =  (ax + bx) * 0.5;
        const nLen = Math.sqrt(nx * nx + ny * ny) || 1;
        const dot = Math.max(0, (nx / nLen) * lx + (ny / nLen) * ly);
        const brightness = 25 + dot * 45;
        const alpha = 0.18 + dot * 0.22;

        ctx.fillStyle = `hsla(${this.hue}, 55%, ${brightness}%, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.closePath();
        ctx.fill();
    }
}
