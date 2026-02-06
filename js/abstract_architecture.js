/**
 * @file abstract_architecture.js
 * @description Defines the Abstract architecture with morphing blobs and splatters.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class AbstractArchitecture extends Architecture {
    constructor() {
        super();
        this.blobs = [];
        this.splatters = [];
    }

    init(system) {
        this.blobs = [];
        const count = 12;
        for (let i = 0; i < count; i++) {
            this.blobs.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                radius: system.rng() * 150 + 100,
                vx: (system.rng() - 0.5) * 1.5,
                vy: (system.rng() - 0.5) * 1.5,
                points: Array.from({length: 12}, (_, j) => ({
                    angle: (j / 12) * Math.PI * 2,
                    offset: system.rng() * 0.2 + 0.9,
                    speed: system.rng() * 0.02 + 0.01,
                    phase: system.rng() * Math.PI * 2
                })),
                hue: (system.hue + (system.rng() - 0.5) * 100 + 360) % 360
            });
        }

        this.splatters = [];
        for (let i = 0; i < 20; i++) {
             this.splatters.push({
                 x: system.rng() * system.width,
                 y: system.rng() * system.height,
                 radius: system.rng() * 5 + 2,
                 alpha: system.rng() * 0.2 + 0.1,
                 hue: (system.hue + (system.rng() - 0.5) * 40 + 360) % 360
             });
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;

        this.blobs.forEach(b => {
            b.x += b.vx * system.speedMultiplier;
            b.y += b.vy * system.speedMultiplier;

            // Wrap-around with margin
            const margin = b.radius * 1.5;
            if (b.x < -margin) b.x = system.width + margin;
            else if (b.x > system.width + margin) b.x = -margin;
            if (b.y < -margin) b.y = system.height + margin;
            else if (b.y > system.height + margin) b.y = -margin;

            // Mouse repulsion
            const dx = b.x - mx;
            const dy = b.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < 90000) { // 300px radius
                 const dist = Math.sqrt(distSq) || 1;
                 const force = (300 - dist) / 300;
                 b.vx += (dx / dist) * force * 0.2;
                 b.vy += (dy / dist) * force * 0.2;
            }
            b.vx *= 0.98;
            b.vy *= 0.98;
        });

        // Occasional new splatter on click or randomly
        if (system.rng() < 0.01) {
            this.splatters.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                radius: system.rng() * 8 + 2,
                alpha: system.rng() * 0.3 + 0.1,
                hue: (system.hue + (system.rng() - 0.5) * 60 + 360) % 360
            });
            if (this.splatters.length > 50) this.splatters.shift();
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Draw static-ish splatters first
        this.splatters.forEach(s => {
            ctx.fillStyle = `hsla(${s.hue}, 50%, 40%, ${s.alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw morphing blobs
        this.blobs.forEach((b, bi) => {
            const h = (b.hue + Math.sin(tick * 0.005) * 20 + 360) % 360;
            const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
            grad.addColorStop(0, `hsla(${h}, 60%, 50%, 0.2)`);
            grad.addColorStop(1, `hsla(${h}, 60%, 50%, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();

            for (let i = 0; i < b.points.length; i++) {
                const p = b.points[i];
                const r = b.radius * (p.offset + Math.sin(tick * p.speed + p.phase) * 0.15);
                const x = b.x + Math.cos(p.angle) * r;
                const y = b.y + Math.sin(p.angle) * r;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    // Smooth curve between points
                    const prevP = b.points[i - 1];
                    const prevR = b.radius * (prevP.offset + Math.sin(tick * prevP.speed + prevP.phase) * 0.15);
                    const prevX = b.x + Math.cos(prevP.angle) * prevR;
                    const prevY = b.y + Math.sin(prevP.angle) * prevR;
                    const cpX = (prevX + x) / 2;
                    const cpY = (prevY + y) / 2;
                    ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
                }
            }

            ctx.closePath();
            ctx.fill();

            // Subtle outline
            ctx.strokeStyle = `hsla(${h}, 60%, 70%, 0.1)`;
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }
}
