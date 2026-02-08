/**
 * @file firefly_architecture.js
 * @description Synchronized bioluminescent firefly swarm that forms emergent patterns.
 * Mouse acts as a lantern that attracts/repels. Seeds change blink patterns,
 * formation shapes, and color schemes dramatically.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FireflyArchitecture extends Architecture {
    constructor() {
        super();
        this.fireflies = [];
        this.syncWave = 0;
        this.formationType = 0;
        this.glowTrails = [];
        this.trailPool = [];
        this.attractors = [];
        this.colorMode = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven formation type (completely changes movement patterns)
        this.formationType = Math.floor(rng() * 5);
        // 0 = spiral swirl, 1 = pulsing rings, 2 = river/stream, 3 = constellation clusters, 4 = chaotic dance

        // Color modes make each seed look dramatically different
        this.colorMode = Math.floor(rng() * 6);
        // 0 = warm gold, 1 = cool blue, 2 = green bioluminescent, 3 = rainbow shifting
        // 4 = red ember, 5 = white/ice

        // Seed-driven sync behavior
        this.syncSpeed = 0.005 + rng() * 0.02;
        this.syncCoupling = 0.02 + rng() * 0.08;

        const count = 120 + Math.floor(rng() * 80);
        this.fireflies = [];

        // Generate attractors (invisible points fireflies orbit around)
        this.attractors = [];
        const attractorCount = 3 + Math.floor(rng() * 4);
        for (let i = 0; i < attractorCount; i++) {
            this.attractors.push({
                x: system.width * (0.15 + rng() * 0.7),
                y: system.height * (0.15 + rng() * 0.7),
                baseX: system.width * (0.15 + rng() * 0.7),
                baseY: system.height * (0.15 + rng() * 0.7),
                radius: 50 + rng() * 150,
                strength: 0.002 + rng() * 0.005,
                orbit: rng() * Math.PI * 2,
                orbitSpeed: 0.005 + rng() * 0.01,
                orbitRadius: 30 + rng() * 80
            });
        }

        for (let i = 0; i < count; i++) {
            const assignedAttractor = Math.floor(rng() * this.attractors.length);
            const a = this.attractors[assignedAttractor];
            this.fireflies.push({
                x: a.baseX + (rng() - 0.5) * a.radius * 2,
                y: a.baseY + (rng() - 0.5) * a.radius * 2,
                vx: (rng() - 0.5) * 1.5,
                vy: (rng() - 0.5) * 1.5,
                phase: rng() * Math.PI * 2,
                frequency: this.syncSpeed + (rng() - 0.5) * 0.005,
                brightness: 0,
                maxBrightness: 0.4 + rng() * 0.6,
                size: 2 + rng() * 3,
                attractor: assignedAttractor,
                personalHue: rng() * 360,
                wanderAngle: rng() * Math.PI * 2,
                wanderSpeed: 0.02 + rng() * 0.05
            });
        }

        this.glowTrails = [];
        this.trailPool = [];
    }

    getFireflyColor(fly, brightness) {
        switch (this.colorMode) {
            case 0: // Warm gold
                return `hsla(${40 + fly.personalHue * 0.1}, 90%, ${55 + brightness * 20}%, ${brightness})`;
            case 1: // Cool blue
                return `hsla(${200 + fly.personalHue * 0.15}, 80%, ${50 + brightness * 25}%, ${brightness})`;
            case 2: // Green bioluminescent
                return `hsla(${100 + fly.personalHue * 0.15}, 85%, ${45 + brightness * 30}%, ${brightness})`;
            case 3: // Rainbow shifting
                return `hsla(${(fly.personalHue + fly.phase * 30) % 360}, 80%, ${50 + brightness * 20}%, ${brightness})`;
            case 4: // Red ember
                return `hsla(${5 + fly.personalHue * 0.08}, 95%, ${40 + brightness * 30}%, ${brightness})`;
            case 5: // White/ice
                return `hsla(${190 + fly.personalHue * 0.05}, ${20 + brightness * 30}%, ${70 + brightness * 20}%, ${brightness})`;
            default:
                return `hsla(50, 90%, 70%, ${brightness})`;
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;
        this.syncWave += this.syncSpeed;

        // Animate attractors (they slowly orbit their base positions)
        this.attractors.forEach(a => {
            a.orbit += a.orbitSpeed;
            a.x = a.baseX + Math.cos(a.orbit) * a.orbitRadius;
            a.y = a.baseY + Math.sin(a.orbit) * a.orbitRadius;
        });

        this.fireflies.forEach(fly => {
            // Synchronization: fireflies pull each other's phase toward the global wave
            fly.phase += fly.frequency;
            fly.phase += Math.sin(this.syncWave - fly.phase) * this.syncCoupling;

            // Brightness based on phase (synchronized blinking)
            const rawBrightness = Math.sin(fly.phase);
            fly.brightness = rawBrightness > 0 ? rawBrightness * fly.maxBrightness : 0;

            // Formation-specific movement
            const a = this.attractors[fly.attractor];
            const dx = a.x - fly.x;
            const dy = a.y - fly.y;
            const distToAttractor = Math.sqrt(dx * dx + dy * dy) || 1;

            switch (this.formationType) {
                case 0: // Spiral swirl
                    fly.vx += (dy / distToAttractor) * a.strength * 3;
                    fly.vy += (-dx / distToAttractor) * a.strength * 3;
                    if (distToAttractor > a.radius) {
                        fly.vx += dx * 0.001;
                        fly.vy += dy * 0.001;
                    }
                    break;
                case 1: // Pulsing rings
                    const targetDist = a.radius * (0.5 + 0.5 * Math.sin(tick * 0.01));
                    const ringForce = (targetDist - distToAttractor) * 0.002;
                    fly.vx += (dx / distToAttractor) * ringForce;
                    fly.vy += (dy / distToAttractor) * ringForce;
                    fly.vx += (dy / distToAttractor) * 0.3;
                    fly.vy += (-dx / distToAttractor) * 0.3;
                    break;
                case 2: // River/stream
                    fly.vx += Math.sin(fly.y * 0.005 + tick * 0.005) * 0.1;
                    fly.vy += dy * 0.001;
                    if (distToAttractor > a.radius * 1.5) {
                        fly.vx += dx * 0.002;
                        fly.vy += dy * 0.002;
                    }
                    break;
                case 3: // Constellation clusters (tight groups)
                    fly.vx += dx * a.strength * 0.5;
                    fly.vy += dy * a.strength * 0.5;
                    break;
                case 4: // Chaotic dance
                    fly.wanderAngle += (system.rng() - 0.5) * fly.wanderSpeed * 2;
                    fly.vx += Math.cos(fly.wanderAngle) * 0.3;
                    fly.vy += Math.sin(fly.wanderAngle) * 0.3;
                    if (distToAttractor > a.radius * 2) {
                        fly.vx += dx * 0.001;
                        fly.vy += dy * 0.001;
                    }
                    break;
            }

            // Gentle wandering
            fly.wanderAngle += (system.rng() - 0.5) * 0.1;
            fly.vx += Math.cos(fly.wanderAngle) * 0.05;
            fly.vy += Math.sin(fly.wanderAngle) * 0.05;

            // Mouse as lantern: attract nearby fireflies
            const mdx = mx - fly.x;
            const mdy = my - fly.y;
            const mDistSq = mdx * mdx + mdy * mdy;
            if (mDistSq < 40000) {
                const mDist = Math.sqrt(mDistSq);
                const force = (200 - mDist) / 200;
                if (system.isGravityWell) {
                    // Right-click: scatter
                    fly.vx -= (mdx / mDist) * force * 3;
                    fly.vy -= (mdy / mDist) * force * 3;
                    fly.brightness = fly.maxBrightness; // flash when scared
                } else {
                    // Gentle attraction
                    fly.vx += (mdx / mDist) * force * 0.8;
                    fly.vy += (mdy / mDist) * force * 0.8;
                }
            }

            fly.x += fly.vx * system.speedMultiplier;
            fly.y += fly.vy * system.speedMultiplier;
            fly.vx *= 0.95;
            fly.vy *= 0.95;

            // Wrap
            if (fly.x < -20) fly.x += system.width + 40;
            else if (fly.x > system.width + 20) fly.x -= system.width + 40;
            if (fly.y < -20) fly.y += system.height + 40;
            else if (fly.y > system.height + 20) fly.y -= system.height + 40;

            // Emit glow trail when bright
            if (fly.brightness > 0.3 && system.rng() < 0.3) {
                let trail = this.trailPool.length > 0 ? this.trailPool.pop() : {};
                trail.x = fly.x;
                trail.y = fly.y;
                trail.life = 1.0;
                trail.decay = 0.03 + system.rng() * 0.02;
                trail.size = fly.size * 0.6;
                trail.hue = fly.personalHue;
                this.glowTrails.push(trail);
            }
        });

        // Update trails
        for (let i = this.glowTrails.length - 1; i >= 0; i--) {
            const t = this.glowTrails[i];
            t.life -= t.decay;
            if (t.life <= 0) {
                this.trailPool.push(this.glowTrails.splice(i, 1)[0]);
            }
        }

        // Cap trail count
        while (this.glowTrails.length > 500) {
            this.trailPool.push(this.glowTrails.shift());
        }
    }

    draw(system) {
        const ctx = system.ctx;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw trails first (behind fireflies)
        this.glowTrails.forEach(t => {
            ctx.globalAlpha = t.life * 0.3;
            ctx.fillStyle = this.getFireflyColor({ personalHue: t.hue, phase: 0 }, t.life * 0.3);
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size * t.life, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw fireflies
        this.fireflies.forEach(fly => {
            if (fly.brightness < 0.01) return;

            const color = this.getFireflyColor(fly, fly.brightness);

            // Outer glow
            const glowRadius = fly.size * 4 * fly.brightness;
            const grad = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, glowRadius);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(fly.x, fly.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Bright core
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(fly.x, fly.y, fly.size * fly.brightness, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw faint connection lines between nearby bright fireflies (constellation effect)
        ctx.lineWidth = 0.5;
        for (let i = 0; i < this.fireflies.length; i++) {
            const f1 = this.fireflies[i];
            if (f1.brightness < 0.3) continue;
            for (let j = i + 1; j < this.fireflies.length; j++) {
                const f2 = this.fireflies[j];
                if (f2.brightness < 0.3) continue;
                const dx = f1.x - f2.x;
                const dy = f1.y - f2.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 3600) { // 60px
                    const alpha = (1 - distSq / 3600) * f1.brightness * f2.brightness * 0.3;
                    ctx.strokeStyle = `rgba(255, 255, 200, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(f1.x, f1.y);
                    ctx.lineTo(f2.x, f2.y);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }
}
