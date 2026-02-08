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
        this.chromaticFrames = 0;
        this.scanCorruption = [];
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
                alpha: system.rng() * 0.3 + 0.2,
                isVertical: system.rng() > 0.8
            });
        }
        this.chromaticFrames = 0;
        this.scanCorruption = [];
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;

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

            // Random horizontal jumps (more frequent)
            if (system.rng() < 0.02) {
                b.x = system.rng() * system.width;
            }

            // Gravity well response: blocks scatter chaotically
            if (system.isGravityWell) {
                const dx = b.x + b.w / 2 - mx;
                const dy = b.y + b.h / 2 - my;
                const distSq = dx * dx + dy * dy;
                if (distSq < 90000) { // 300px radius
                    b.x = system.rng() * system.width;
                    b.y = system.rng() * system.height;
                    b.vx = (system.rng() - 0.5) * 12;
                }
            }

            // Shockwave response: blocks jump to random positions briefly
            if (system.shockwaves) {
                system.shockwaves.forEach(sw => {
                    const sdx = b.x + b.w / 2 - sw.x;
                    const sdy = b.y + b.h / 2 - sw.y;
                    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
                    if (Math.abs(sDist - sw.radius) < 80) {
                        b.x = system.rng() * system.width;
                        b.y = system.rng() * system.height;
                    }
                });
            }
        });

        this.glitchTimer--;
        if (this.glitchTimer <= 0) {
            // More frequent glitch bursts (shorter cooldown)
            this.glitchTimer = Math.floor(system.rng() * 30) + 10;

            // Trigger chromatic aberration for 3 frames
            this.chromaticFrames = 3;

            // Generate scan corruption strips
            this.scanCorruption = [];
            const stripCount = Math.floor(system.rng() * 5) + 2;
            for (let i = 0; i < stripCount; i++) {
                this.scanCorruption.push({
                    y: system.rng() * system.height,
                    h: system.rng() * 8 + 2,
                    offset: (system.rng() - 0.5) * 30,
                    life: Math.floor(system.rng() * 4) + 2
                });
            }
        }

        // Decay chromatic frames
        if (this.chromaticFrames > 0) {
            this.chromaticFrames--;
        }

        // Decay scan corruption
        for (let i = this.scanCorruption.length - 1; i >= 0; i--) {
            this.scanCorruption[i].life--;
            if (this.scanCorruption[i].life <= 0) {
                this.scanCorruption.splice(i, 1);
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;

        ctx.save();

        this.blocks.forEach(b => {
            const isGlitched = this.glitchTimer < 8 && system.rng() < 0.5;

            if (isGlitched) {
                ctx.fillStyle = system.rng() > 0.5 ? '#fff' : `hsla(${b.hue}, 100%, 70%, 0.9)`;
                ctx.fillRect(
                    b.x + (system.rng() - 0.5) * 80,
                    b.y + (system.rng() - 0.5) * 80,
                    b.w * (system.rng() + 0.5) * 1.5,
                    b.h * (system.rng() + 0.3)
                );
            } else {
                ctx.fillStyle = `hsla(${b.hue}, 80%, 50%, ${b.alpha})`;

                // Reaction to mouse: block displacement up to 60px
                const dx = b.x + b.w / 2 - mx;
                const dy = b.y + b.h / 2 - my;
                const distSq = dx * dx + dy * dy;
                const offset = distSq < 40000 ? (1 - Math.sqrt(distSq) / 200) * 60 : 0;

                if (b.isVertical) {
                    ctx.fillRect(b.x, b.y + offset, b.h, b.w);
                } else {
                    ctx.fillRect(b.x + offset, b.y, b.w, b.h);
                }
            }
        });

        // "Digital Rain" elements (8-12 lines per burst)
        if (tick % 6 === 0) {
            const rainCount = Math.floor(system.rng() * 5) + 8; // 8-12
            ctx.fillStyle = `hsla(${system.hue}, 100%, 80%, 0.3)`;
            for (let i = 0; i < rainCount; i++) {
                ctx.fillRect(
                    system.rng() * system.width,
                    system.rng() * system.height,
                    1,
                    system.rng() * 120 + 50
                );
            }
        }

        // Chromatic Aberration flash (3 frames, wider 4px offset)
        if (this.chromaticFrames > 0) {
            ctx.globalCompositeOperation = 'screen';
            const intensity = 0.08 + this.chromaticFrames * 0.04;
            ctx.fillStyle = `rgba(255, 0, 0, ${intensity})`;
            ctx.fillRect(4, 0, system.width, system.height);
            ctx.fillStyle = `rgba(0, 255, 0, ${intensity * 0.5})`;
            ctx.fillRect(0, 2, system.width, system.height);
            ctx.fillStyle = `rgba(0, 0, 255, ${intensity})`;
            ctx.fillRect(-4, 0, system.width, system.height);
            ctx.globalCompositeOperation = 'source-over';
        }

        // Scan corruption effect: horizontal strips shift
        if (this.scanCorruption.length > 0) {
            this.scanCorruption.forEach(strip => {
                try {
                    const sy = Math.max(0, Math.min(Math.floor(strip.y), system.height - Math.ceil(strip.h) - 1));
                    const sh = Math.max(1, Math.ceil(strip.h));
                    if (sy + sh <= system.height && system.width > 0 && sh > 0) {
                        const imgData = ctx.getImageData(0, sy, system.width, sh);
                        ctx.putImageData(imgData, Math.floor(strip.offset), sy);
                    }
                } catch(e) {
                    // Fallback: draw a glitchy colored strip instead
                    ctx.fillStyle = `hsla(${system.hue}, 100%, 50%, 0.15)`;
                    ctx.fillRect(strip.offset, strip.y, system.width, strip.h);
                }
            });
        }

        ctx.restore();
    }
}
