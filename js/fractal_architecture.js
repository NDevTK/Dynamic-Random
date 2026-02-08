/**
 * @file fractal_architecture.js
 * @description Defines the Fractal architecture with animated recursive branching,
 * depth-based color coding, tip particles, mouse bending, and shockwave response.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FractalArchitecture extends Architecture {
    constructor() {
        super();
        this.maxDepth = 6;
        this.baseScale = 0.68;
        this.roots = [];
        this.particles = [];
        this.particlePool = [];
        this.maxParticles = 300;
        this.shockwavePulse = 0;
        this.chaosAmount = 0;
    }

    init(system) {
        this.roots = [];
        this.particles = [];
        this.particlePool = [];

        // 8-12 roots based on seed for visual density
        const count = 8 + Math.floor(system.rng() * 5);

        for (let i = 0; i < count; i++) {
            // Decide pattern: radial vs directional based on seed
            const patternSeed = system.rng();
            let baseAngle;
            if (patternSeed < 0.5) {
                // Radial: evenly spaced angles with slight randomization
                baseAngle = (i / count) * Math.PI * 2 + (system.rng() - 0.5) * 0.4;
            } else {
                // Directional: clustered angles with more variation
                baseAngle = system.rng() * Math.PI * 2;
            }

            this.roots.push({
                x: system.width * (0.15 + system.rng() * 0.7),
                y: system.height * (0.15 + system.rng() * 0.7),
                baseAngle: baseAngle,
                angle: baseAngle,
                length: system.rng() * 80 + 60,
                hue: (system.hue + (system.rng() - 0.5) * 80 + 360) % 360,
                phaseOffset: system.rng() * Math.PI * 2,
                growthSpeed: 0.008 + system.rng() * 0.012,
                branchSpread: (Math.PI / 5) + system.rng() * (Math.PI / 6),
                bendVx: 0,
                bendVy: 0
            });
        }
    }

    update(system) {
        const tick = system.tick;

        // Shockwave pulse response: branches temporarily grow when hit
        this.shockwavePulse *= 0.95;
        if (system.shockwaves) {
            for (let i = 0; i < system.shockwaves.length; i++) {
                const sw = system.shockwaves[i];
                if (sw.strength > 0.5) {
                    this.shockwavePulse = Math.min(this.shockwavePulse + sw.strength * 0.4, 2.0);
                }
            }
        }

        // Gravity well: ramp chaos
        if (system.isGravityWell) {
            this.chaosAmount = Math.min(this.chaosAmount + 0.03, 1.0);
        } else {
            this.chaosAmount *= 0.97;
        }

        // Update roots: mouse bending and animation
        for (let i = 0; i < this.roots.length; i++) {
            const root = this.roots[i];

            // Sine-wave pulsing on the base angle
            const pulse = Math.sin(tick * root.growthSpeed + root.phaseOffset);
            root.angle = root.baseAngle + pulse * 0.15;

            // Mouse bending: branches bend toward/away from cursor
            const dx = mouse.x - root.x;
            const dy = mouse.y - root.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1 && dist < 400) {
                const influence = (400 - dist) / 400;
                const mouseAngle = Math.atan2(dy, dx);

                if (system.isGravityWell) {
                    // Gravity well: bend away chaotically
                    root.bendVx += Math.cos(mouseAngle + Math.PI) * influence * 0.08;
                    root.bendVy += Math.sin(mouseAngle + Math.PI) * influence * 0.08;
                } else {
                    // Normal: gently bend toward cursor
                    root.bendVx += Math.cos(mouseAngle) * influence * 0.03;
                    root.bendVy += Math.sin(mouseAngle) * influence * 0.03;
                }
            }

            // Dampen bend velocity
            root.bendVx *= 0.92;
            root.bendVy *= 0.92;

            // Chaos: add random jitter when gravity well is active
            if (this.chaosAmount > 0.01) {
                root.angle += (Math.random() - 0.5) * this.chaosAmount * 1.5;
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * system.speedMultiplier;
            p.y += p.vy * system.speedMultiplier;
            p.life -= 1 * system.speedMultiplier;
            p.alpha = Math.max(0, (p.life / p.maxLife) * p.baseAlpha);
            p.size *= 0.995;

            if (p.life <= 0) {
                this.particlePool.push(this.particles.splice(i, 1)[0]);
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw each root tree
        for (let i = 0; i < this.roots.length; i++) {
            const root = this.roots[i];
            this._drawTree(
                ctx, system, root,
                root.x, root.y,
                root.length, root.angle,
                this.maxDepth, tick, root.hue,
                root.bendVx, root.bendVy
            );
        }

        // Draw tip particles with glow
        this._drawParticles(ctx, system);
    }

    /**
     * Recursively draws a branching tree with depth-based coloring,
     * animated growth, width falloff, and mouse bending.
     */
    _drawTree(ctx, system, root, x, y, length, angle, depth, tick, baseHue, bendVx, bendVy) {
        if (depth <= 0) return;

        const maxDepth = this.maxDepth;
        const depthRatio = depth / maxDepth; // 1.0 at trunk, ~0.17 at tips

        // Animated branch growth: sine wave pulsing on length
        const growthPulse = 1.0 + Math.sin(tick * root.growthSpeed * 2 + root.phaseOffset + depth * 0.5) * 0.15;
        const shockGrowth = 1.0 + this.shockwavePulse * 0.3 * (1 - depthRatio);
        const animatedLength = length * growthPulse * shockGrowth;

        // Chaos: random angle perturbation at deeper levels
        let chaosAngle = 0;
        if (this.chaosAmount > 0.01) {
            chaosAngle = (Math.random() - 0.5) * this.chaosAmount * 2.0 * (1 - depthRatio);
        }

        // Mouse bending influence: deeper branches bend more
        const bendInfluence = (1 - depthRatio) * 0.8;
        const bendAngle = Math.atan2(bendVy, bendVx) * bendInfluence;
        const bendMag = Math.sqrt(bendVx * bendVx + bendVy * bendVy);

        // Per-branch mouse proximity bending
        const dx = mouse.x - x;
        const dy = mouse.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let localBend = 0;
        if (dist > 1 && dist < 300) {
            const influence = (300 - dist) / 300;
            const toMouse = Math.atan2(dy, dx);
            const angleDiff = toMouse - angle;
            // Normalize angle difference
            const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            if (system.isGravityWell) {
                localBend = -normalizedDiff * influence * 0.4;
            } else {
                localBend = normalizedDiff * influence * 0.2;
            }
        }

        const finalAngle = angle + chaosAngle + bendAngle * bendMag * 0.5 + localBend;

        const x2 = x + Math.cos(finalAngle) * animatedLength;
        const y2 = y + Math.sin(finalAngle) * animatedLength;

        // Color by depth: hue shifts as we go deeper
        const hueShift = (maxDepth - depth) * 25;
        const branchHue = (baseHue + hueShift) % 360;
        const saturation = 65 + (1 - depthRatio) * 20;
        const lightness = 45 + (1 - depthRatio) * 25;

        // Alpha: thicker trunks slightly more transparent, tips more vivid
        const branchAlpha = 0.3 + (1 - depthRatio) * 0.3;

        // Width decreases with depth: thick trunks, thin tips
        const branchWidth = Math.max(0.5, depthRatio * 4.5 + 0.5);

        // Draw branch
        ctx.strokeStyle = `hsla(${branchHue}, ${saturation}%, ${lightness}%, ${branchAlpha})`;
        ctx.lineWidth = branchWidth;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // At tips: add glow and emit particles
        if (depth <= 2) {
            // Tip glow
            const glowAlpha = 0.4 + Math.sin(tick * 0.05 + root.phaseOffset + x2 * 0.01) * 0.15;
            const glowSize = 3 + (2 - depth) * 2 + this.shockwavePulse * 3;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const gradient = ctx.createRadialGradient(x2, y2, 0, x2, y2, glowSize);
            gradient.addColorStop(0, `hsla(${branchHue}, 90%, 75%, ${glowAlpha})`);
            gradient.addColorStop(1, `hsla(${branchHue}, 90%, 75%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x2, y2, glowSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Emit particles at leaf tips (depth 1)
            if (depth === 1 && this.particles.length < this.maxParticles) {
                // Probabilistic emission
                const emitChance = 0.06 + this.shockwavePulse * 0.15 + this.chaosAmount * 0.1;
                if (Math.random() < emitChance) {
                    this._emitParticle(x2, y2, branchHue, finalAngle);
                }
            }
        }

        // Recurse into child branches
        const nextLength = animatedLength * this.baseScale;
        const spread = root.branchSpread + this.chaosAmount * 0.8;

        // Shockwave response: slightly wider spread
        const shockSpread = spread * (1 + this.shockwavePulse * 0.15);

        this._drawTree(ctx, system, root, x2, y2, nextLength, finalAngle - shockSpread, depth - 1, tick, baseHue, bendVx, bendVy);
        this._drawTree(ctx, system, root, x2, y2, nextLength, finalAngle + shockSpread, depth - 1, tick, baseHue, bendVx, bendVy);

        // Occasionally add a third branch for visual richness at higher depths
        if (depth >= 4 && this.chaosAmount > 0.3) {
            this._drawTree(ctx, system, root, x2, y2, nextLength * 0.7, finalAngle + (Math.random() - 0.5) * Math.PI, depth - 2, tick, baseHue, bendVx, bendVy);
        }
    }

    /**
     * Emits a glowing particle from a branch tip.
     */
    _emitParticle(x, y, hue, angle) {
        let p;
        if (this.particlePool.length > 0) {
            p = this.particlePool.pop();
        } else {
            p = {};
        }

        const speed = 0.3 + Math.random() * 0.8;
        const drift = angle + (Math.random() - 0.5) * 1.5;

        p.x = x;
        p.y = y;
        p.vx = Math.cos(drift) * speed + (Math.random() - 0.5) * 0.3;
        p.vy = Math.sin(drift) * speed + (Math.random() - 0.5) * 0.3 - 0.2; // slight upward drift
        p.life = 40 + Math.random() * 40;
        p.maxLife = p.life;
        p.size = 1.5 + Math.random() * 2.5;
        p.baseAlpha = 0.4 + Math.random() * 0.3;
        p.alpha = p.baseAlpha;
        p.hue = (hue + (Math.random() - 0.5) * 30 + 360) % 360;

        this.particles.push(p);
    }

    /**
     * Draws all active tip particles with lighter composite for glow.
     */
    _drawParticles(ctx, system) {
        if (this.particles.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.alpha <= 0.01) continue;

            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `hsla(${p.hue}, 85%, 70%, ${p.alpha})`);
            gradient.addColorStop(1, `hsla(${p.hue}, 85%, 70%, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
