/**
 * @file aurora_architecture.js
 * @description Northern lights architecture with shimmering curtains of light,
 * magnetic field disruption on mouse interaction, and seed-driven wave patterns.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class AuroraArchitecture extends Architecture {
    constructor() {
        super();
        this.curtains = [];
        this.disruptions = [];
        this.groundStars = [];
        this.magneticPulse = 0;
        this.windAngle = 0;
        this.windSpeed = 0;
        this.palette = [];
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven palette: each seed produces a unique color combination
        const paletteStyles = [
            // Classic green/blue aurora
            () => [
                { h: 120 + rng() * 40, s: 80, l: 50 },
                { h: 160 + rng() * 40, s: 70, l: 40 },
                { h: 200 + rng() * 30, s: 90, l: 45 }
            ],
            // Rare red/pink aurora
            () => [
                { h: 340 + rng() * 30, s: 80, l: 45 },
                { h: 300 + rng() * 40, s: 70, l: 50 },
                { h: 270 + rng() * 30, s: 85, l: 40 }
            ],
            // Purple/violet storm
            () => [
                { h: 260 + rng() * 30, s: 85, l: 50 },
                { h: 280 + rng() * 40, s: 75, l: 55 },
                { h: 220 + rng() * 30, s: 90, l: 40 }
            ],
            // Golden/amber solar wind
            () => [
                { h: 40 + rng() * 20, s: 90, l: 55 },
                { h: 20 + rng() * 30, s: 85, l: 45 },
                { h: 60 + rng() * 20, s: 80, l: 50 }
            ]
        ];
        this.palette = paletteStyles[Math.floor(rng() * paletteStyles.length)]();

        // Seed-driven wave parameters
        this.windSpeed = 0.001 + rng() * 0.003;
        this.windAngle = rng() * Math.PI * 0.3;

        // Generate curtains with unique wave properties per seed
        this.curtains = [];
        const curtainCount = 3 + Math.floor(rng() * 4);
        for (let i = 0; i < curtainCount; i++) {
            const color = this.palette[i % this.palette.length];
            this.curtains.push({
                yBase: system.height * (0.1 + rng() * 0.3),
                amplitude: 40 + rng() * 80,
                frequency: 0.001 + rng() * 0.004,
                secondaryFreq: 0.003 + rng() * 0.006,
                secondaryAmp: 15 + rng() * 40,
                speed: 0.3 + rng() * 0.8,
                phase: rng() * Math.PI * 2,
                height: 80 + rng() * 200,
                color: color,
                shimmerSpeed: 0.01 + rng() * 0.03,
                foldCount: 3 + Math.floor(rng() * 5),
                intensity: 0.06 + rng() * 0.1
            });
        }

        this.disruptions = [];

        // Background stars (dim, below the aurora)
        this.groundStars = [];
        for (let i = 0; i < 200; i++) {
            this.groundStars.push({
                x: rng() * system.width,
                y: rng() * system.height,
                size: rng() * 1.2 + 0.3,
                alpha: rng() * 0.4 + 0.1,
                twinkle: rng() * Math.PI * 2,
                twinkleSpeed: 0.02 + rng() * 0.04
            });
        }
    }

    update(system) {
        this.magneticPulse += this.windSpeed;

        // Mouse creates magnetic disruptions
        const mx = mouse.x;
        const my = mouse.y;

        if (system.isGravityWell) {
            // Strong disruption on right-click
            this.disruptions.push({
                x: mx, y: my,
                radius: 0,
                maxRadius: 400,
                speed: 8,
                strength: 50,
                life: 1.0
            });
        }

        // Update disruptions
        for (let i = this.disruptions.length - 1; i >= 0; i--) {
            const d = this.disruptions[i];
            d.radius += d.speed;
            d.life = 1 - (d.radius / d.maxRadius);
            if (d.life <= 0) {
                this.disruptions.splice(i, 1);
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;

        // Stars first (behind aurora)
        ctx.save();
        this.groundStars.forEach(s => {
            const twinkle = Math.sin(tick * s.twinkleSpeed + s.twinkle) * 0.3 + 0.7;
            ctx.globalAlpha = s.alpha * twinkle;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        // Draw each curtain
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        this.curtains.forEach((curtain, ci) => {
            const step = 3; // pixels between sample points
            const { h, s, l } = curtain.color;

            for (let x = 0; x < system.width; x += step) {
                const normX = x / system.width;

                // Primary wave
                const wave1 = Math.sin(x * curtain.frequency + tick * 0.01 * curtain.speed + curtain.phase + this.magneticPulse * 50) * curtain.amplitude;
                // Secondary undulation
                const wave2 = Math.sin(x * curtain.secondaryFreq + tick * 0.02 * curtain.speed) * curtain.secondaryAmp;
                // Fold detail
                const fold = Math.sin(x * 0.01 * curtain.foldCount + tick * 0.005) * 20;

                let yTop = curtain.yBase + wave1 + wave2 + fold;

                // Mouse magnetic field disruption
                const dx = x - mx;
                const dy = yTop - my;
                const distSq = dx * dx + dy * dy;
                if (distSq < 40000) {
                    const dist = Math.sqrt(distSq);
                    const force = (200 - dist) / 200;
                    yTop += force * 60 * Math.sin(tick * 0.1 + x * 0.02);
                }

                // Wave disruptions from shockwaves
                for (const d of this.disruptions) {
                    const ddx = x - d.x;
                    const ddy = yTop - d.y;
                    const dDist = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (Math.abs(dDist - d.radius) < 60) {
                        yTop += d.strength * d.life * Math.sin(dDist * 0.1);
                    }
                }

                // Shimmer: varying intensity along the curtain
                const shimmer = (Math.sin(x * 0.02 + tick * curtain.shimmerSpeed) * 0.5 + 0.5);
                const intensityHere = curtain.intensity * (0.5 + shimmer * 0.5);

                // Height variation
                const heightHere = curtain.height * (0.7 + shimmer * 0.3);

                // Draw vertical gradient strip
                const grad = ctx.createLinearGradient(x, yTop, x, yTop + heightHere);
                grad.addColorStop(0, `hsla(${h}, ${s}%, ${l + 15}%, ${intensityHere * 1.5})`);
                grad.addColorStop(0.3, `hsla(${h}, ${s}%, ${l}%, ${intensityHere})`);
                grad.addColorStop(0.7, `hsla(${(h + 20) % 360}, ${s - 10}%, ${l - 10}%, ${intensityHere * 0.5})`);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.fillRect(x, yTop, step + 1, heightHere);
            }
        });

        // Bright highlight streaks along the top edge of curtains
        this.curtains.forEach(curtain => {
            const { h, s, l } = curtain.color;
            ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 30}%, 0.15)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x < system.width; x += 6) {
                const wave1 = Math.sin(x * curtain.frequency + tick * 0.01 * curtain.speed + curtain.phase + this.magneticPulse * 50) * curtain.amplitude;
                const wave2 = Math.sin(x * curtain.secondaryFreq + tick * 0.02 * curtain.speed) * curtain.secondaryAmp;
                const y = curtain.yBase + wave1 + wave2;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
