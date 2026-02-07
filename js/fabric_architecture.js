/**
 * @file fabric_architecture.js
 * @description Defines the Fabric architecture with a reactive, connecting mesh.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FabricArchitecture extends Architecture {
    constructor() {
        super();
        this.nodes = [];
        this.rows = 20;
        this.cols = 20;
        this.elasticity = 0.05;
        this.damping = 0.9;
    }

    init(system) {
        this.nodes = [];
        const spacingX = system.width / (this.cols - 1);
        const spacingY = system.height / (this.rows - 1);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = c * spacingX;
                const y = r * spacingY;
                this.nodes.push({
                    baseX: x,
                    baseY: y,
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    row: r,
                    col: c
                });
            }
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const interactionRadius = 200;

        this.nodes.forEach(n => {
            // Elastic force to base position
            const ex = (n.baseX - n.x) * this.elasticity;
            const ey = (n.baseY - n.y) * this.elasticity;
            n.vx += ex;
            n.vy += ey;

            // Mouse interaction
            const dx = n.x - mx;
            const dy = n.y - my;
            const distSq = dx * dx + dy * dy;

            if (distSq < interactionRadius * interactionRadius) {
                const dist = Math.sqrt(distSq) || 1;
                const force = (interactionRadius - dist) / interactionRadius;
                const push = force * 5 * system.speedMultiplier;
                n.vx += (dx / dist) * push;
                n.vy += (dy / dist) * push;
            }

            // Apply movement and damping
            n.x += n.vx * system.speedMultiplier;
            n.y += n.vy * system.speedMultiplier;
            n.vx *= this.damping;
            n.vy *= this.damping;
        });
    }

    draw(system) {
        const ctx = system.ctx;
        const path = new Path2D();

        ctx.strokeStyle = `hsla(${system.hue}, 50%, 50%, 0.2)`;
        ctx.lineWidth = 1;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const i = r * this.cols + c;
                const n = this.nodes[i];

                // Connect to right neighbor
                if (c < this.cols - 1) {
                    const next = this.nodes[i + 1];
                    path.moveTo(n.x, n.y);
                    path.lineTo(next.x, next.y);
                }

                // Connect to bottom neighbor
                if (r < this.rows - 1) {
                    const next = this.nodes[i + this.cols];
                    path.moveTo(n.x, n.y);
                    path.lineTo(next.x, next.y);
                }
            }
        }

        ctx.stroke(path);

        // Draw small nodes
        ctx.fillStyle = `hsla(${system.hue}, 50%, 50%, 0.4)`;
        this.nodes.forEach(n => {
            if (Math.abs(n.x - n.baseX) > 1 || Math.abs(n.y - n.baseY) > 1) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}
