/**
 * @file aurora_architecture.js
 * @description Northern lights architecture with shimmering curtains of light,
 * magnetic field disruption on mouse interaction, and seed-driven wave patterns.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';
import { lissajousCurve } from './math_patterns.js';

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

        // Assign Lissajous curves to randomly selected curtains for complex shapes
        for (let i = 0; i < this.curtains.length; i++) {
            if (system.rng() > 0.5) {
                const result = lissajousCurve(200, system.rng);
                this.curtains[i].lissajous = result.points;
                this.curtains[i].useLissajous = true;
            }
        }

        this.disruptions = [];

        // Aurora type: 0=curtain, 1=rays, 2=corona, 3=pulsating, 4=mixed
        this.auroraType = Math.floor(rng() * 5);

        // Vertical rays (for ray/mixed types)
        this.rays = [];
        if (this.auroraType === 1 || this.auroraType === 4) {
            const rayCount = 15 + Math.floor(rng() * 20);
            for (let i = 0; i < rayCount; i++) {
                const color = this.palette[Math.floor(rng() * this.palette.length)];
                this.rays.push({
                    x: rng() * system.width,
                    baseX: rng() * system.width,
                    width: 3 + rng() * 8,
                    height: system.height * (0.2 + rng() * 0.5),
                    yTop: system.height * (0.05 + rng() * 0.15),
                    alpha: 0.02 + rng() * 0.06,
                    speed: (rng() - 0.5) * 0.5,
                    phase: rng() * Math.PI * 2,
                    phaseSpeed: 0.005 + rng() * 0.015,
                    color,
                    drift: rng() * 0.3,
                });
            }
        }

        // Corona particles (for corona/mixed types)
        this.coronaParticles = [];
        if (this.auroraType === 2 || this.auroraType === 4) {
            const particleCount = 60 + Math.floor(rng() * 80);
            for (let i = 0; i < particleCount; i++) {
                const color = this.palette[Math.floor(rng() * this.palette.length)];
                this.coronaParticles.push({
                    angle: rng() * Math.PI * 2,
                    radius: 50 + rng() * 200,
                    speed: 0.002 + rng() * 0.008,
                    size: 1.5 + rng() * 3,
                    alpha: 0.1 + rng() * 0.3,
                    color,
                    cx: system.width * (0.3 + rng() * 0.4),
                    cy: system.height * (0.15 + rng() * 0.2),
                    trail: [],
                });
            }
        }

        // Pulsation state
        this.pulsationPhase = 0;
        this.pulsationSpeed = 0.01 + rng() * 0.02;
        this.pulsationDepth = this.auroraType === 3 ? 0.5 : 0.15;

        // Background stars (dim, below the aurora)
        this.groundStars = [];
        const starCount = 150 + Math.floor(rng() * 100);
        for (let i = 0; i < starCount; i++) {
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
        this.pulsationPhase += this.pulsationSpeed;

        const mx = mouse.x;
        const my = mouse.y;

        // Right-click: strong disruption
        if (system.isGravityWell) {
            if (this.disruptions.length < 10) {
                this.disruptions.push({
                    x: mx, y: my,
                    radius: 0, maxRadius: 400,
                    speed: 8, strength: 50, life: 1.0
                });
            }
        }

        // Left-click: aurora burst — spawns a bright flare disruption
        if (isLeftMouseDown && system.tick % 12 === 0 && this.disruptions.length < 10) {
            this.disruptions.push({
                x: mx, y: my,
                radius: 0, maxRadius: 250,
                speed: 5, strength: 80, life: 1.0
            });
        }

        // Update disruptions (swap-and-pop instead of splice)
        for (let i = this.disruptions.length - 1; i >= 0; i--) {
            const d = this.disruptions[i];
            d.radius += d.speed;
            d.life = 1 - (d.radius / d.maxRadius);
            if (d.life <= 0) {
                this.disruptions[i] = this.disruptions[this.disruptions.length - 1];
                this.disruptions.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;
        const qualityScale = system.qualityScale || 1;

        // Stars first (behind aurora) - skip some at low quality
        ctx.save();
        ctx.fillStyle = '#fff';
        const starStep = qualityScale < 0.5 ? 3 : qualityScale < 0.75 ? 2 : 1;
        for (let i = 0; i < this.groundStars.length; i += starStep) {
            const s = this.groundStars[i];
            const twinkle = Math.sin(tick * s.twinkleSpeed + s.twinkle) * 0.3 + 0.7;
            ctx.globalAlpha = s.alpha * twinkle;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Global pulsation effect
        const pulsation = 1 - this.pulsationDepth + Math.sin(this.pulsationPhase) * this.pulsationDepth;

        // Draw each curtain using solid-color bands instead of per-strip gradients
        // This eliminates hundreds of createLinearGradient calls per frame
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Scale step by quality — wider steps = fewer fillRect calls
        const step = qualityScale < 0.5 ? 10 : qualityScale < 0.75 ? 7 : 5;
        const bands = qualityScale < 0.5 ? 2 : 4;

        for (let ci = 0; ci < this.curtains.length; ci++) {
            const curtain = this.curtains[ci];
            const { h, s, l } = curtain.color;
            const h2 = (h + 20) % 360;
            const s2 = s - 10;
            const l2 = l - 10;

            for (let x = 0; x < system.width; x += step) {
                // Primary wave
                const wave1 = Math.sin(x * curtain.frequency + tick * 0.01 * curtain.speed + curtain.phase + this.magneticPulse * 50) * curtain.amplitude;
                // Secondary undulation
                const wave2 = Math.sin(x * curtain.secondaryFreq + tick * 0.02 * curtain.speed) * curtain.secondaryAmp;
                // Fold detail
                const fold = Math.sin(x * 0.01 * curtain.foldCount + tick * 0.005) * 20;

                // If this curtain has a Lissajous curve, sample its y-values to
                // modulate the wave, producing interference-like aurora shapes
                let lissajousOffset = 0;
                if (curtain.useLissajous) {
                    const pts = curtain.lissajous;
                    const idx = Math.floor((x / system.width) * pts.length) % pts.length;
                    lissajousOffset = pts[idx].y * curtain.secondaryAmp * 0.5;
                }

                let yTop = curtain.yBase + wave1 + wave2 + fold + lissajousOffset;

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
                for (let di = 0; di < this.disruptions.length; di++) {
                    const d = this.disruptions[di];
                    const ddx = x - d.x;
                    const ddy = yTop - d.y;
                    const dDist = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (Math.abs(dDist - d.radius) < 60) {
                        yTop += d.strength * d.life * Math.sin(dDist * 0.1);
                    }
                }

                // Shimmer: varying intensity along the curtain
                const shimmer = (Math.sin(x * 0.02 + tick * curtain.shimmerSpeed) * 0.5 + 0.5);
                const intensityHere = curtain.intensity * (0.5 + shimmer * 0.5) * pulsation;
                const heightHere = curtain.height * (0.7 + shimmer * 0.3);
                const bandH = heightHere / bands;

                // Draw 4 solid-color bands to approximate the vertical gradient
                // Band 0 (top): bright, high alpha
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 15}%, ${intensityHere * 1.5})`;
                ctx.fillRect(x, yTop, step + 1, bandH);
                // Band 1: primary color
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${intensityHere})`;
                ctx.fillRect(x, yTop + bandH, step + 1, bandH);
                // Band 2: shifted hue, lower alpha
                ctx.fillStyle = `hsla(${h2}, ${s2}%, ${l2}%, ${intensityHere * 0.5})`;
                ctx.fillRect(x, yTop + bandH * 2, step + 1, bandH);
                // Band 3 (bottom): fading out
                ctx.fillStyle = `hsla(${h2}, ${s2}%, ${l2}%, ${intensityHere * 0.15})`;
                ctx.fillRect(x, yTop + bandH * 3, step + 1, bandH);
            }
        }

        // Bright highlight streaks along the top edge of curtains
        for (let ci = 0; ci < this.curtains.length; ci++) {
            const curtain = this.curtains[ci];
            const { h, s, l } = curtain.color;
            ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 30}%, 0.15)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x < system.width; x += 8) {
                const wave1 = Math.sin(x * curtain.frequency + tick * 0.01 * curtain.speed + curtain.phase + this.magneticPulse * 50) * curtain.amplitude;
                const wave2 = Math.sin(x * curtain.secondaryFreq + tick * 0.02 * curtain.speed) * curtain.secondaryAmp;
                const y = curtain.yBase + wave1 + wave2;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Draw vertical rays
        if (this.rays.length > 0) {
            for (const ray of this.rays) {
                ray.phase += ray.phaseSpeed;
                const shimmer = Math.sin(ray.phase) * 0.5 + 0.5;
                ray.x = ray.baseX + Math.sin(tick * 0.003 + ray.phase) * 30;

                const { h, s, l } = ray.color;
                const rayAlpha = ray.alpha * shimmer * pulsation;
                const rayGrad = ctx.createLinearGradient(ray.x, ray.yTop, ray.x, ray.yTop + ray.height);
                rayGrad.addColorStop(0, `hsla(${h}, ${s}%, ${l + 20}%, ${rayAlpha * 1.5})`);
                rayGrad.addColorStop(0.3, `hsla(${h}, ${s}%, ${l}%, ${rayAlpha})`);
                rayGrad.addColorStop(0.7, `hsla(${h}, ${s}%, ${l - 10}%, ${rayAlpha * 0.5})`);
                rayGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = rayGrad;
                ctx.fillRect(ray.x - ray.width / 2, ray.yTop, ray.width, ray.height);
            }
        }

        // Draw corona particles
        if (this.coronaParticles.length > 0) {
            for (const cp of this.coronaParticles) {
                cp.angle += cp.speed;
                const px = cp.cx + Math.cos(cp.angle) * cp.radius;
                const py = cp.cy + Math.sin(cp.angle) * cp.radius * 0.4;
                const { h, s, l } = cp.color;

                cp.trail.push({ x: px, y: py });
                if (cp.trail.length > 12) cp.trail.shift();

                // Trail
                if (cp.trail.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(cp.trail[0].x, cp.trail[0].y);
                    for (let t = 1; t < cp.trail.length; t++) {
                        ctx.lineTo(cp.trail[t].x, cp.trail[t].y);
                    }
                    ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${cp.alpha * 0.3 * pulsation})`;
                    ctx.lineWidth = cp.size * 0.5;
                    ctx.stroke();
                }

                // Particle
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 15}%, ${cp.alpha * pulsation})`;
                ctx.beginPath();
                ctx.arc(px, py, cp.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
