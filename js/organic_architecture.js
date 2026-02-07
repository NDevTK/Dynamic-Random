/**
 * @file organic_architecture.js
 * @description Defines the Organic architecture with pulsing tendrils and cells.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class OrganicArchitecture extends Architecture {
    constructor() {
        super();
        this.nodes = [];
        this.cells = [];
    }

    init(system) {
        this.nodes = [];
        const nodeCount = 25;
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                radius: system.rng() * 40 + 20,
                pulseOffset: system.rng() * Math.PI * 2,
                hue: system.hue + (system.rng() - 0.5) * 60
            });
        }

        this.cells = [];
        const cellCount = 40;
        for (let i = 0; i < cellCount; i++) {
            this.cells.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                vx: (system.rng() - 0.5) * 2,
                vy: (system.rng() - 0.5) * 2,
                radius: system.rng() * 12 + 6,
                hue: system.hue + (system.rng() - 0.5) * 40,
                noiseOffset: system.rng() * 1000
            });
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;

        this.cells.forEach(c => {
            // Brown-ish motion
            c.vx += (system.rng() - 0.5) * 0.2;
            c.vy += (system.rng() - 0.5) * 0.2;

            c.x += c.vx * system.speedMultiplier;
            c.y += c.vy * system.speedMultiplier;

            // Wrap
            if (c.x < -c.radius) c.x = system.width + c.radius;
            else if (c.x > system.width + c.radius) c.x = -c.radius;
            if (c.y < -c.radius) c.y = system.height + c.radius;
            else if (c.y > system.height + c.radius) c.y = -c.radius;

            // Mouse reaction
            const dx = c.x - mx;
            const dy = c.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < 22500) { // 150px
                const dist = Math.sqrt(distSq);
                const force = (150 - dist) / 150;
                c.vx += (dx / dist) * force * 0.5;
                c.vy += (dy / dist) * force * 0.5;
            }

            c.vx *= 0.95;
            c.vy *= 0.95;
        });

        // Nodes movement
        this.nodes.forEach(n => {
             n.x += Math.sin(system.tick * 0.005 + n.pulseOffset) * 0.2 * system.speedMultiplier;
             n.y += Math.cos(system.tick * 0.005 + n.pulseOffset) * 0.2 * system.speedMultiplier;
        });
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Tendrils
        ctx.strokeStyle = `hsla(${system.hue}, 50%, 30%, 0.15)`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const tendrilPath = new Path2D();
        for (let i = 0; i < this.nodes.length; i++) {
            const n1 = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n2 = this.nodes[j];
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                if (dx * dx + dy * dy < 62500) { // 250px
                    const midX = (n1.x + n2.x) / 2 + Math.sin(tick * 0.01 + i) * 30;
                    const midY = (n1.y + n2.y) / 2 + Math.cos(tick * 0.01 + j) * 30;
                    tendrilPath.moveTo(n1.x, n1.y);
                    tendrilPath.quadraticCurveTo(midX, midY, n2.x, n2.y);
                }
            }
        }
        ctx.stroke(tendrilPath);

        // Nodes (Bioluminescent organs)
        this.nodes.forEach(n => {
            const pulse = 1 + Math.sin(tick * 0.03 + n.pulseOffset) * 0.15;
            const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * pulse);
            grad.addColorStop(0, `hsla(${n.hue}, 60%, 40%, 0.2)`);
            grad.addColorStop(0.5, `hsla(${n.hue}, 60%, 40%, 0.1)`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius * pulse, 0, Math.PI * 2);
            ctx.fill();
        });

        // Cells
        this.cells.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(Math.atan2(c.vy, c.vx));

            // Cell Body
            ctx.fillStyle = `hsla(${c.hue}, 60%, 50%, 0.3)`;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.radius, c.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Nucleus
            ctx.fillStyle = `hsla(${c.hue}, 80%, 30%, 0.5)`;
            ctx.beginPath();
            const nX = Math.sin(tick * 0.05 + c.noiseOffset) * (c.radius * 0.2);
            ctx.arc(nX, 0, c.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }
}
