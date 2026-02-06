/**
 * @file glitch_architecture.js
 * @description Defines the Glitch architecture with digital artifacts and shifting blocks.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class GlitchArchitecture extends Architecture {
    constructor() {
        super();
        this.blocks = [];
        this.scanlines = [];
        this.glitchTimer = 0;
    }

    init(system) {
        this.blocks = [];
        const count = 40;
        for (let i = 0; i < count; i++) {
            this.blocks.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                w: system.rng() * 150 + 50,
                h: system.rng() * 30 + 5,
                vx: (system.rng() - 0.5) * 4,
                hue: (system.hue + (system.rng() - 0.5) * 60 + 360) % 360,
                alpha: system.rng() * 0.3 + 0.1,
                isVertical: system.rng() > 0.8
            });
        }
    }

    update(system) {
        this.blocks.forEach(b => {
            if (b.isVertical) {
                b.y += b.vx * system.speedMultiplier;
                if (b.y < -b.h) b.y = system.height;
                else if (b.y > system.height) b.y = -b.h;
            } else {
                b.x += b.vx * system.speedMultiplier;
                if (b.x < -b.w) b.x = system.width;
                else if (b.x > system.width) b.x = -b.w;
            }

            // Random horizontal jumps
            if (system.rng() < 0.01) {
                b.x = system.rng() * system.width;
            }
        });

        this.glitchTimer--;
        if (this.glitchTimer <= 0) {
            this.glitchTimer = Math.floor(system.rng() * 60) + 20;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;

        ctx.save();

        this.blocks.forEach(b => {
            const isGlitched = this.glitchTimer < 5 && system.rng() < 0.3;

            if (isGlitched) {
                ctx.fillStyle = system.rng() > 0.5 ? '#fff' : `hsla(${b.hue}, 100%, 70%, 0.8)`;
                ctx.fillRect(b.x + (system.rng()-0.5)*50, b.y + (system.rng()-0.5)*50, b.w * 1.5, b.h * 0.5);
            } else {
                ctx.fillStyle = `hsla(${b.hue}, 80%, 50%, ${b.alpha})`;

                // Reaction to mouse: block shifts towards mouse
                const dx = b.x + b.w/2 - mx;
                const dy = b.y + b.h/2 - my;
                const distSq = dx*dx + dy*dy;
                const offset = distSq < 40000 ? (1 - Math.sqrt(distSq)/200) * 20 : 0;

                if (b.isVertical) {
                    ctx.fillRect(b.x, b.y + offset, b.h, b.w);
                } else {
                    ctx.fillRect(b.x + offset, b.y, b.w, b.h);
                }
            }
        });

        // "Digital Rain" elements
        if (tick % 10 === 0) {
            ctx.fillStyle = `hsla(${system.hue}, 100%, 80%, 0.2)`;
            for(let i=0; i<3; i++) {
                ctx.fillRect(system.rng() * system.width, system.rng() * system.height, 1, system.rng() * 100 + 50);
            }
        }

        // Chromatic Aberration flash
        if (this.glitchTimer === 1) {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.fillRect(2, 0, system.width, system.height);
            ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
            ctx.fillRect(-2, 0, system.width, system.height);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }
}
