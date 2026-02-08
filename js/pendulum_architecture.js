/**
 * @file pendulum_architecture.js
 * @description Mesmerizing pendulum wave simulation. Multiple pendulums of
 * different lengths create beautiful wave-like interference patterns.
 * Seeds dramatically change: arrangement (linear, circular, spiral, grid),
 * number of pendulums, trail behavior, color scheme, and physics.
 * Mouse interaction adds energy or creates gravity distortion.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class PendulumArchitecture extends Architecture {
    constructor() {
        super();
        this.pendulums = [];
        this.trails = [];
        this.trailPool = [];
        this.arrangement = 0;
        this.colorScheme = 0;
        this.pivotX = 0;
        this.pivotY = 0;
        this.damping = 0.999;
        this.gravity = 0.4;
        this.trailLength = 200;
        this.backgroundStars = [];
        this.energyPulses = [];
    }

    init(system) {
        const rng = system.rng;

        // Arrangement type changes the entire visual dramatically
        this.arrangement = Math.floor(rng() * 5);
        // 0 = classic linear wave, 1 = circular carousel, 2 = spiral galaxy,
        // 3 = converging star, 4 = double helix

        this.colorScheme = Math.floor(rng() * 6);
        // 0 = fire gradient, 1 = ocean depths, 2 = neon spectrum, 3 = pastel dream,
        // 4 = monochrome silver, 5 = aurora borealis

        this.damping = 0.9985 + rng() * 0.001;
        this.gravity = 0.2 + rng() * 0.4;
        this.trailLength = 100 + Math.floor(rng() * 200);

        const count = 15 + Math.floor(rng() * 25);
        this.pendulums = [];
        this.trails = [];
        this.trailPool = [];
        this.energyPulses = [];

        // Pivot point varies by arrangement
        this.pivotX = system.width / 2;
        this.pivotY = system.height * 0.15;

        for (let i = 0; i < count; i++) {
            const ratio = i / (count - 1);

            // Length determines period - carefully tuned for wave patterns
            const baseLength = 100 + ratio * (system.height * 0.45);
            const length = baseLength + (rng() - 0.5) * 20;

            // Starting angle varies by arrangement
            let angle;
            switch (this.arrangement) {
                case 0: // Linear wave - all start at same angle
                    angle = Math.PI / 4 + (rng() - 0.5) * 0.1;
                    break;
                case 1: // Circular - staggered start
                    angle = (i / count) * Math.PI * 2 * 0.3;
                    break;
                case 2: // Spiral - increasing start angle
                    angle = ratio * Math.PI * 0.8;
                    break;
                case 3: // Converging star - alternating sides
                    angle = (i % 2 === 0 ? 1 : -1) * (Math.PI / 3 + rng() * 0.2);
                    break;
                case 4: // Double helix - phase shifted pairs
                    angle = Math.PI / 4 * (i % 2 === 0 ? 1 : -1);
                    break;
                default:
                    angle = Math.PI / 4;
            }

            let pivotX, pivotY;
            switch (this.arrangement) {
                case 0: // Linear - spread across top
                    pivotX = system.width * 0.1 + ratio * system.width * 0.8;
                    pivotY = system.height * 0.08;
                    break;
                case 1: // Circular carousel
                    const circleRadius = Math.min(system.width, system.height) * 0.3;
                    const circAngle = (i / count) * Math.PI * 2;
                    pivotX = system.width / 2 + Math.cos(circAngle) * circleRadius;
                    pivotY = system.height / 2 + Math.sin(circAngle) * circleRadius;
                    break;
                case 2: // Spiral
                    const spiralR = 50 + ratio * Math.min(system.width, system.height) * 0.3;
                    const spiralA = ratio * Math.PI * 4;
                    pivotX = system.width / 2 + Math.cos(spiralA) * spiralR;
                    pivotY = system.height / 2 + Math.sin(spiralA) * spiralR;
                    break;
                case 3: // Converging star - all from center top
                    pivotX = system.width / 2;
                    pivotY = system.height * 0.1;
                    break;
                case 4: // Double helix - two rows
                    pivotX = system.width * 0.15 + ratio * system.width * 0.7;
                    pivotY = system.height * 0.15 + (i % 2) * system.height * 0.15;
                    break;
                default:
                    pivotX = system.width / 2;
                    pivotY = system.height * 0.1;
            }

            this.pendulums.push({
                pivotX,
                pivotY,
                length,
                angle,
                angularVelocity: 0,
                bobX: 0,
                bobY: 0,
                index: i,
                ratio,
                mass: 1 + rng() * 2,
                trailHistory: []
            });
        }

        // Background ambient stars
        this.backgroundStars = [];
        for (let i = 0; i < 100; i++) {
            this.backgroundStars.push({
                x: rng() * system.width,
                y: rng() * system.height,
                size: rng() * 1.2 + 0.3,
                alpha: rng() * 0.3 + 0.05,
                twinkle: rng() * Math.PI * 2,
                twinkleSpeed: 0.01 + rng() * 0.03
            });
        }
    }

    getPendulumColor(pendulum, alpha) {
        const ratio = pendulum.ratio;
        switch (this.colorScheme) {
            case 0: // Fire gradient
                return `hsla(${ratio * 60}, 95%, ${50 + ratio * 20}%, ${alpha})`;
            case 1: // Ocean depths
                return `hsla(${180 + ratio * 60}, 80%, ${40 + ratio * 25}%, ${alpha})`;
            case 2: // Neon spectrum
                return `hsla(${ratio * 300}, 100%, ${55 + ratio * 15}%, ${alpha})`;
            case 3: // Pastel dream
                return `hsla(${ratio * 360}, 60%, ${70 + ratio * 15}%, ${alpha})`;
            case 4: // Monochrome silver
                return `hsla(220, ${10 + ratio * 20}%, ${50 + ratio * 35}%, ${alpha})`;
            case 5: // Aurora borealis
                return `hsla(${120 + ratio * 160}, 85%, ${40 + ratio * 30}%, ${alpha})`;
            default:
                return `hsla(${ratio * 360}, 80%, 60%, ${alpha})`;
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;

        this.pendulums.forEach(p => {
            // Simple pendulum physics: angular acceleration = -(g/L) * sin(theta)
            let gravityAccel = -(this.gravity / p.length) * Math.sin(p.angle);

            // Mouse interaction: add energy by pushing pendulums
            const bobX = p.pivotX + Math.sin(p.angle) * p.length;
            const bobY = p.pivotY + Math.cos(p.angle) * p.length;
            const dx = bobX - mx;
            const dy = bobY - my;
            const distSq = dx * dx + dy * dy;

            if (system.isGravityWell && distSq < 90000) {
                // Gravity well pulls pendulum bob toward mouse
                const dist = Math.sqrt(distSq);
                const pull = (300 - dist) / 300 * 0.002;
                const pullAngle = Math.atan2(mx - p.pivotX, my - p.pivotY);
                gravityAccel += Math.sin(pullAngle - p.angle) * pull * 5;
            } else if (distSq < 40000) {
                // Normal push: add angular velocity based on proximity
                const dist = Math.sqrt(distSq);
                const force = (200 - dist) / 200;
                const pushDirection = Math.sign(dx);
                p.angularVelocity += pushDirection * force * 0.003;
            }

            // Shockwave interaction
            system.shockwaves.forEach(sw => {
                const sdx = bobX - sw.x;
                const sdy = bobY - sw.y;
                const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
                if (Math.abs(sDist - sw.radius) < 80) {
                    const impact = (1 - Math.abs(sDist - sw.radius) / 80) * sw.strength * 0.01;
                    p.angularVelocity += (sdx > 0 ? 1 : -1) * impact;
                }
            });

            p.angularVelocity += gravityAccel;
            p.angularVelocity *= this.damping;
            p.angle += p.angularVelocity * system.speedMultiplier;

            p.bobX = p.pivotX + Math.sin(p.angle) * p.length;
            p.bobY = p.pivotY + Math.cos(p.angle) * p.length;

            // Trail history (circular buffer approach for performance)
            p.trailHistory.push({ x: p.bobX, y: p.bobY });
            if (p.trailHistory.length > this.trailLength) {
                p.trailHistory.shift();
            }
        });

        // Update energy pulses
        for (let i = this.energyPulses.length - 1; i >= 0; i--) {
            const pulse = this.energyPulses[i];
            pulse.radius += 4;
            pulse.alpha -= 0.015;
            if (pulse.alpha <= 0) {
                this.energyPulses.splice(i, 1);
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Background stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < this.backgroundStars.length; i++) {
            const s = this.backgroundStars[i];
            const twinkle = Math.sin(tick * s.twinkleSpeed + s.twinkle) * 0.3 + 0.7;
            ctx.globalAlpha = s.alpha * twinkle;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw trails first (additive blending for glow)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        this.pendulums.forEach(p => {
            const trail = p.trailHistory;
            if (trail.length < 2) return;

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);

            for (let i = 1; i < trail.length; i++) {
                const alpha = (i / trail.length) * 0.4;
                ctx.strokeStyle = this.getPendulumColor(p, alpha);
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.stroke();

            // Glow dots along trail at intervals
            for (let i = 0; i < trail.length; i += 8) {
                const alpha = (i / trail.length) * 0.3;
                ctx.fillStyle = this.getPendulumColor(p, alpha);
                ctx.beginPath();
                ctx.arc(trail[i].x, trail[i].y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // Draw strings
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        this.pendulums.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(p.pivotX, p.pivotY);
            ctx.lineTo(p.bobX, p.bobY);
            ctx.stroke();
        });

        // Draw pivot points
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.pendulums.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.pivotX, p.pivotY, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw pendulum bobs with glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        this.pendulums.forEach(p => {
            const speed = Math.abs(p.angularVelocity);
            const glowIntensity = Math.min(1, speed * 20);
            const bobSize = 4 + p.mass * 2;

            // Outer glow (only when moving fast enough)
            if (glowIntensity > 0.05) {
                const glowRadius = bobSize * (3 + glowIntensity * 4);
                const grad = ctx.createRadialGradient(
                    p.bobX, p.bobY, 0,
                    p.bobX, p.bobY, glowRadius
                );
                grad.addColorStop(0, this.getPendulumColor(p, glowIntensity * 0.6));
                grad.addColorStop(0.4, this.getPendulumColor(p, glowIntensity * 0.2));
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.bobX, p.bobY, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Core bob
            ctx.fillStyle = this.getPendulumColor(p, 0.7 + glowIntensity * 0.3);
            ctx.beginPath();
            ctx.arc(p.bobX, p.bobY, bobSize, 0, Math.PI * 2);
            ctx.fill();
        });

        // Connection lines between adjacent bobs (wave visualization)
        if (this.pendulums.length > 1) {
            ctx.lineWidth = 1;
            ctx.beginPath();
            const sorted = [...this.pendulums].sort((a, b) => a.index - b.index);
            for (let i = 0; i < sorted.length - 1; i++) {
                const p1 = sorted[i];
                const p2 = sorted[i + 1];
                const dx = p1.bobX - p2.bobX;
                const dy = p1.bobY - p2.bobY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 300) {
                    const alpha = (1 - dist / 300) * 0.2;
                    ctx.strokeStyle = this.getPendulumColor(p1, alpha);
                    ctx.beginPath();
                    ctx.moveTo(p1.bobX, p1.bobY);
                    ctx.lineTo(p2.bobX, p2.bobY);
                    ctx.stroke();
                }
            }
        }

        // Energy pulses
        for (let i = 0; i < this.energyPulses.length; i++) {
            const pulse = this.energyPulses[i];
            ctx.strokeStyle = `rgba(255, 255, 200, ${pulse.alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
