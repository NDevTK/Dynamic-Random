/**
 * @file raindrop_architecture.js
 * @description Rain system with drops, puddle ripples, splash particles, and lightning.
 * Mouse acts as wind source or umbrella. Seeds change rain type, intensity,
 * direction, color scheme, and weather personality.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class RaindropArchitecture extends Architecture {
    constructor() {
        super();
        this.drops = [];
        this.ripples = [];
        this.splashes = [];
        this.lightning = null;
        this.lightningTimer = 0;
        this.windX = 0;
        this.windTarget = 0;
        this.weatherType = 0;
        this.dropColor = '';
        this.ambientFlash = 0;
        this.puddles = [];
    }

    init(system) {
        const rng = system.rng;

        // Weather types dramatically change the look
        this.weatherType = Math.floor(rng() * 5);
        // 0 = gentle rain, 1 = thunderstorm, 2 = neon rain (cyberpunk), 3 = golden shower/sun rain
        // 4 = snow/ice crystals

        this.windTarget = (rng() - 0.5) * 4;
        this.windX = this.windTarget;

        const dropCount = this.weatherType === 0 ? 150 : (this.weatherType === 4 ? 100 : 250);

        // Color based on weather type
        switch (this.weatherType) {
            case 0: this.dropColor = { h: 210, s: 40, l: 70 }; break;
            case 1: this.dropColor = { h: 220, s: 30, l: 60 }; break;
            case 2: this.dropColor = { h: system.hue, s: 100, l: 70 }; break;
            case 3: this.dropColor = { h: 45, s: 80, l: 65 }; break;
            case 4: this.dropColor = { h: 200, s: 10, l: 90 }; break;
        }

        this.lightningTimer = this.weatherType === 1 ? 50 + Math.floor(rng() * 100) : 999999;

        // Generate drops
        this.drops = [];
        for (let i = 0; i < dropCount; i++) {
            this.drops.push(this.createDrop(system, true));
        }

        // Generate puddles (reflective spots on "ground")
        this.puddles = [];
        const puddleCount = 5 + Math.floor(rng() * 8);
        for (let i = 0; i < puddleCount; i++) {
            this.puddles.push({
                x: rng() * system.width,
                y: system.height * (0.75 + rng() * 0.2),
                width: 40 + rng() * 120,
                height: 5 + rng() * 10,
                ripplePhase: rng() * Math.PI * 2
            });
        }

        this.ripples = [];
        this.splashes = [];
    }

    createDrop(system, randomY) {
        const rng = system.rng;
        const isSnow = this.weatherType === 4;
        return {
            x: rng() * (system.width + 200) - 100,
            y: randomY ? rng() * system.height : -10 - rng() * 50,
            speed: isSnow ? (0.5 + rng() * 1.5) : (4 + rng() * 8),
            length: isSnow ? 0 : (10 + rng() * 20),
            size: isSnow ? (2 + rng() * 4) : (1 + rng() * 1.5),
            alpha: 0.2 + rng() * 0.4,
            wobble: rng() * Math.PI * 2,
            wobbleSpeed: 0.02 + rng() * 0.04
        };
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const rng = system.rng;
        const isSnow = this.weatherType === 4;

        // Wind shifts
        if (rng() < 0.005) {
            this.windTarget = (rng() - 0.5) * (this.weatherType === 1 ? 8 : 4);
        }
        this.windX += (this.windTarget - this.windX) * 0.01;

        // Mouse influence on wind
        const windInfluence = (mx - system.width / 2) / system.width * 2;

        // Update drops
        for (let i = 0; i < this.drops.length; i++) {
            const d = this.drops[i];

            if (isSnow) {
                d.wobble += d.wobbleSpeed;
                d.x += Math.sin(d.wobble) * 0.5 + this.windX * 0.3 + windInfluence * 0.2;
                d.y += d.speed * system.speedMultiplier;
            } else {
                d.x += (this.windX + windInfluence * 0.5) * system.speedMultiplier;
                d.y += d.speed * system.speedMultiplier;
            }

            // Mouse umbrella: repel drops within radius
            const mdx = d.x - mx;
            const mdy = d.y - my;
            const mDistSq = mdx * mdx + mdy * mdy;
            if (mDistSq < 10000) {
                const mDist = Math.sqrt(mDistSq);
                const force = (100 - mDist) / 100;
                d.x += (mdx / mDist) * force * 3;
                d.y += (mdy / mDist) * force * 2;
            }

            // Reset when off screen
            if (d.y > system.height + 20) {
                // Create ripple where it lands
                if (rng() < 0.3) {
                    this.ripples.push({
                        x: d.x,
                        y: system.height * (0.8 + rng() * 0.18),
                        radius: 0,
                        maxRadius: isSnow ? 5 : (8 + rng() * 15),
                        speed: isSnow ? 0.3 : (0.5 + rng() * 1),
                        alpha: 0.3
                    });
                }
                // Splash particles
                if (!isSnow && rng() < 0.2) {
                    for (let j = 0; j < 3; j++) {
                        this.splashes.push({
                            x: d.x,
                            y: system.height * 0.85,
                            vx: (rng() - 0.5) * 3,
                            vy: -rng() * 3 - 1,
                            life: 1.0,
                            size: 1 + rng() * 1.5
                        });
                    }
                }

                // Respawn at top
                d.x = rng() * (system.width + 200) - 100;
                d.y = -10 - rng() * 50;
            }
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed;
            r.alpha = (1 - r.radius / r.maxRadius) * 0.3;
            if (r.radius >= r.maxRadius) {
                this.ripples.splice(i, 1);
            }
        }

        // Update splashes
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const s = this.splashes[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.15; // gravity
            s.life -= 0.04;
            if (s.life <= 0) {
                this.splashes.splice(i, 1);
            }
        }

        // Lightning (thunderstorm only)
        if (this.ambientFlash > 0) this.ambientFlash -= 0.05;
        this.lightningTimer--;
        if (this.lightningTimer <= 0 && this.weatherType === 1) {
            this.lightning = this.generateLightning(
                system.width * (0.2 + rng() * 0.6), 0,
                system.width * (0.3 + rng() * 0.4), system.height * 0.7,
                system, 4
            );
            this.ambientFlash = 1.0;
            this.lightningTimer = 80 + Math.floor(rng() * 200);
            // Double flash sometimes
            if (rng() > 0.5) {
                setTimeout(() => { this.ambientFlash = 0.8; }, 100);
            }
        }
        if (this.lightning) {
            this.lightning.life -= 0.1;
            if (this.lightning.life <= 0) this.lightning = null;
        }

        // Cap ripples
        while (this.ripples.length > 100) this.ripples.shift();
    }

    generateLightning(x1, y1, x2, y2, system, depth) {
        const segments = [];
        const points = [{ x: x1, y: y1 }];
        const steps = 8 + Math.floor(system.rng() * 6);
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            points.push({
                x: x1 + (x2 - x1) * t + (system.rng() - 0.5) * 80,
                y: y1 + (y2 - y1) * t + (system.rng() - 0.5) * 20
            });
        }
        segments.push(points);

        // Branches
        if (depth > 0) {
            const branchCount = Math.floor(system.rng() * 3);
            for (let b = 0; b < branchCount; b++) {
                const branchPoint = points[Math.floor(system.rng() * (points.length - 2)) + 1];
                const branchEnd = {
                    x: branchPoint.x + (system.rng() - 0.5) * 150,
                    y: branchPoint.y + system.rng() * 100 + 30
                };
                const branch = this.generateLightning(
                    branchPoint.x, branchPoint.y,
                    branchEnd.x, branchEnd.y,
                    system, depth - 1
                );
                segments.push(...branch.segments);
            }
        }

        return { segments, life: 1.0 };
    }

    draw(system) {
        const ctx = system.ctx;
        const { h, s, l } = this.dropColor;
        const isSnow = this.weatherType === 4;

        // Ambient flash from lightning
        if (this.ambientFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(200, 200, 255, ${this.ambientFlash * 0.15})`;
            ctx.fillRect(0, 0, system.width, system.height);
            ctx.restore();
        }

        // Draw puddle reflections
        ctx.save();
        this.puddles.forEach(p => {
            p.ripplePhase += 0.02;
            const shimmer = Math.sin(p.ripplePhase + system.tick * 0.01) * 0.05 + 0.1;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.width / 2);
            grad.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, ${shimmer})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.width / 2, p.height, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // Draw ripples
        ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, 0.2)`;
        ctx.lineWidth = 1;
        this.ripples.forEach(r => {
            ctx.globalAlpha = r.alpha;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // Draw drops
        ctx.save();
        if (isSnow) {
            // Snow: draw as soft dots
            ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, 0.6)`;
            this.drops.forEach(d => {
                ctx.globalAlpha = d.alpha;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fill();
            });
        } else {
            // Rain: draw as streaks
            ctx.lineCap = 'round';
            const batch = new Path2D();
            this.drops.forEach(d => {
                batch.moveTo(d.x, d.y);
                batch.lineTo(d.x - this.windX * 0.5, d.y - d.length);
            });
            ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, 0.3)`;
            ctx.lineWidth = 1.5;
            ctx.stroke(batch);

            // Neon rain gets extra glow
            if (this.weatherType === 2) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${h}, 100%, 70%, 0.1)`;
                ctx.lineWidth = 4;
                ctx.stroke(batch);
                ctx.globalCompositeOperation = 'source-over';
            }
        }
        ctx.restore();

        // Draw splashes
        ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 10}%, 0.5)`;
        this.splashes.forEach(sp => {
            ctx.globalAlpha = sp.life;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Draw lightning
        if (this.lightning) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            this.lightning.segments.forEach(seg => {
                // Glow layer
                ctx.strokeStyle = `rgba(150, 150, 255, ${this.lightning.life * 0.3})`;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(seg[0].x, seg[0].y);
                for (let i = 1; i < seg.length; i++) {
                    ctx.lineTo(seg[i].x, seg[i].y);
                }
                ctx.stroke();

                // Core
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightning.life * 0.8})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(seg[0].x, seg[0].y);
                for (let i = 1; i < seg.length; i++) {
                    ctx.lineTo(seg[i].x, seg[i].y);
                }
                ctx.stroke();
            });
            ctx.restore();
        }

        // Fog layer for atmosphere (gentle rain and thunderstorm)
        if (this.weatherType === 0 || this.weatherType === 1) {
            ctx.save();
            const fogY = system.height * 0.6;
            const fogGrad = ctx.createLinearGradient(0, fogY, 0, system.height);
            fogGrad.addColorStop(0, 'transparent');
            fogGrad.addColorStop(1, `rgba(100, 110, 130, 0.1)`);
            ctx.fillStyle = fogGrad;
            ctx.fillRect(0, fogY, system.width, system.height - fogY);
            ctx.restore();
        }
    }
}
