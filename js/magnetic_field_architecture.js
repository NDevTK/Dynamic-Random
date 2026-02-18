/**
 * @file magnetic_field_architecture.js
 * @description Visualizes magnetic field lines between poles, resembling iron filings
 * on a magnet. Poles drift, interact with cursor, and produce seed-unique configurations.
 * Uses streamline tracing through vector fields for authentic field visualization.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

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
    }

    init(system) {
        const rng = system.rng;
        this.hueBase = system.hue || rng() * 360;
        this.drawMode = Math.floor(rng() * 4); // 0=lines, 1=filings, 2=flow, 3=gradient
        this.fieldStrength = 0.5 + rng() * 1.5;

        // Generate magnetic poles
        const poleCount = 2 + Math.floor(rng() * 5);
        this.poles = [];
        for (let i = 0; i < poleCount; i++) {
            this.poles.push({
                x: system.width * (0.15 + rng() * 0.7),
                y: system.height * (0.15 + rng() * 0.7),
                charge: (i % 2 === 0 ? 1 : -1) * (0.5 + rng() * 1.5),
                baseX: system.width * (0.15 + rng() * 0.7),
                baseY: system.height * (0.15 + rng() * 0.7),
                driftSpeed: 0.002 + rng() * 0.005,
                driftPhase: rng() * Math.PI * 2,
                driftRadius: 30 + rng() * 100,
                color: `hsl(${(this.hueBase + i * 60) % 360}, 80%, 60%)`
            });
        }

        // Generate iron filings
        this.filings = [];
        const filingCount = 800 + Math.floor(rng() * 600);
        for (let i = 0; i < filingCount; i++) {
            this.filings.push({
                x: rng() * system.width,
                y: rng() * system.height,
                length: 3 + rng() * 8,
                angle: 0,
                alpha: 0.2 + rng() * 0.5,
                hueShift: rng() * 40
            });
        }

        this.lineCount = 30 + Math.floor(rng() * 40);
    }

    getField(x, y, tick) {
        let fx = 0, fy = 0;
        for (const pole of this.poles) {
            const dx = x - pole.x;
            const dy = y - pole.y;
            const distSq = dx * dx + dy * dy + 100; // +100 to avoid singularity
            const dist = Math.sqrt(distSq);
            const force = pole.charge * this.fieldStrength / distSq;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
        }

        // Mouse as a dynamic pole
        const mdx = x - mouse.x;
        const mdy = y - mouse.y;
        const mDistSq = mdx * mdx + mdy * mdy + 100;
        const mDist = Math.sqrt(mDistSq);
        const mForce = 2.0 / mDistSq;
        fx += (mdx / mDist) * mForce;
        fy += (mdy / mDist) * mForce;

        return { fx, fy };
    }

    update(system) {
        const tick = system.tick;
        this.animPhase += 0.02;

        // Drift poles
        for (const pole of this.poles) {
            pole.x = pole.baseX + Math.cos(tick * pole.driftSpeed + pole.driftPhase) * pole.driftRadius;
            pole.y = pole.baseY + Math.sin(tick * pole.driftSpeed * 1.3 + pole.driftPhase) * pole.driftRadius * 0.7;
        }

        // Update filing orientations
        for (const f of this.filings) {
            const field = this.getField(f.x, f.y, tick);
            const targetAngle = Math.atan2(field.fy, field.fx);
            // Smoothly rotate toward field direction
            let diff = targetAngle - f.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            f.angle += diff * 0.15;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const w = system.width;
        const h = system.height;

        ctx.save();

        if (this.drawMode === 0 || this.drawMode === 2) {
            this._drawFieldLines(ctx, w, h, tick);
        }

        if (this.drawMode === 1 || this.drawMode === 3) {
            this._drawFilings(ctx, tick);
        }

        if (this.drawMode === 3) {
            this._drawFieldGradient(ctx, w, h, tick);
        }

        // Draw poles
        ctx.globalCompositeOperation = 'lighter';
        for (const pole of this.poles) {
            const radius = 8 + Math.abs(pole.charge) * 4;
            const pulse = 1 + 0.2 * Math.sin(tick * 0.05);
            const g = ctx.createRadialGradient(pole.x, pole.y, 0, pole.x, pole.y, radius * 3 * pulse);
            g.addColorStop(0, pole.charge > 0 ?
                `hsla(${this.hueBase}, 100%, 80%, 0.8)` :
                `hsla(${(this.hueBase + 180) % 360}, 100%, 80%, 0.8)`);
            g.addColorStop(0.5, pole.charge > 0 ?
                `hsla(${this.hueBase}, 80%, 50%, 0.3)` :
                `hsla(${(this.hueBase + 180) % 360}, 80%, 50%, 0.3)`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(pole.x, pole.y, radius * 3 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pole.x, pole.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    _drawFieldLines(ctx, w, h, tick) {
        ctx.globalCompositeOperation = 'lighter';

        for (const pole of this.poles) {
            if (pole.charge <= 0) continue;
            const lineCount = Math.floor(this.lineCount * Math.abs(pole.charge));

            for (let i = 0; i < lineCount; i++) {
                const startAngle = (Math.PI * 2 / lineCount) * i;
                const startR = 15;
                let x = pole.x + Math.cos(startAngle) * startR;
                let y = pole.y + Math.sin(startAngle) * startR;

                ctx.beginPath();
                ctx.moveTo(x, y);

                const stepSize = 4;
                const maxSteps = 200;
                let pathLen = 0;

                for (let s = 0; s < maxSteps; s++) {
                    const field = this.getField(x, y, tick);
                    const mag = Math.sqrt(field.fx * field.fx + field.fy * field.fy);
                    if (mag < 0.00001) break;

                    x += (field.fx / mag) * stepSize;
                    y += (field.fy / mag) * stepSize;
                    pathLen += stepSize;

                    // Stop if near a negative pole
                    let hitPole = false;
                    for (const p of this.poles) {
                        if (p.charge < 0) {
                            const dx = x - p.x;
                            const dy = y - p.y;
                            if (dx * dx + dy * dy < 200) { hitPole = true; break; }
                        }
                    }
                    if (hitPole || x < -50 || x > w + 50 || y < -50 || y > h + 50) break;

                    ctx.lineTo(x, y);
                }

                // Animated flow along lines
                const flowPhase = (tick * 0.03 + i * 0.5) % 1;
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

        ctx.globalCompositeOperation = 'source-over';
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
        // Low-resolution field strength visualization
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
}
