/**
 * @file fractal_architecture.js
 * @description Defines the Fractal architecture with recursive geometric patterns.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FractalArchitecture extends Architecture {
    constructor() {
        super();
        this.iterations = 5;
        this.angle = Math.PI / 4;
        this.scale = 0.7;
        this.roots = [];
    }

    init(system) {
        this.roots = [];
        const count = 5;
        for (let i = 0; i < count; i++) {
            this.roots.push({
                x: system.width * (0.2 + system.rng() * 0.6),
                y: system.height * (0.2 + system.rng() * 0.6),
                angle: system.rng() * Math.PI * 2,
                length: system.rng() * 100 + 50,
                hue: (system.hue + (system.rng() - 0.5) * 60 + 360) % 360
            });
        }
    }

    update(system) {
        const mx = mouse.x / system.width;
        this.angle = (Math.PI / 6) + (mx * Math.PI / 3) + Math.sin(system.tick * 0.01) * 0.1;
    }

    draw(system) {
        const ctx = system.ctx;
        ctx.lineCap = 'round';

        this.roots.forEach(root => {
            ctx.strokeStyle = `hsla(${root.hue}, 70%, 60%, 0.15)`;
            ctx.lineWidth = 2;
            this.drawBranch(ctx, root.x, root.y, root.length, root.angle, this.iterations);
        });
    }

    drawBranch(ctx, x, y, length, angle, iteration) {
        if (iteration === 0) return;

        const x2 = x + Math.cos(angle) * length;
        const y2 = y + Math.sin(angle) * length;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const nextLength = length * this.scale;
        this.drawBranch(ctx, x2, y2, nextLength, angle - this.angle, iteration - 1);
        this.drawBranch(ctx, x2, y2, nextLength, angle + this.angle, iteration - 1);
    }
}
