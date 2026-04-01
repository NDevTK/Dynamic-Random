/**
 * @file crystal_cave_architecture.js
 * @description Living crystal cave with growing crystal formations, refracting
 * light beams, and sparkling mineral deposits. Crystals grow procedurally from
 * walls and floor, each seed producing different crystal types (quartz spikes,
 * geode bubbles, columnar basalt, amethyst clusters, ice pillars). Mouse moves
 * a light source that creates prismatic rainbows on crystal surfaces. Click
 * seeds new crystal growth points with satisfying geometric expansion.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class CrystalCaveArchitecture extends Architecture {
    constructor() {
        super();
        this.crystals = [];
        this.lightBeams = [];
        this.sparkles = [];
        this.growthPoints = [];
        this.ambientParticles = [];
        this.crystalType = 0;
        this.palette = null;
        this.growthSpeed = 0;
        this.refractionIntensity = 0;
        this.caveTone = null;
        this.tick = 0;
        this.lightX = 0;
        this.lightY = 0;
    }

    init(system) {
        const rng = system.rng;

        // Crystal type determines the visual style dramatically
        this.crystalType = Math.floor(rng() * 6);
        // 0=quartz spikes, 1=geode bubbles, 2=columnar basalt, 3=amethyst clusters
        // 4=ice pillars, 5=bismuth staircase

        this.growthSpeed = 0.3 + rng() * 0.7;
        this.refractionIntensity = 0.3 + rng() * 0.7;

        const palettes = [
            // Quartz - clear/white/rainbow
            { base: [200, 210, 230], crystal: [240, 245, 255], glow: [180, 200, 255],
              refraction: [[255,100,100],[255,200,50],[100,255,100],[50,150,255],[200,50,255]] },
            // Amethyst - purple/violet
            { base: [60, 20, 80], crystal: [160, 80, 220], glow: [200, 120, 255],
              refraction: [[255,100,255],[180,50,220],[120,80,255],[200,150,255],[100,0,180]] },
            // Emerald - green/teal
            { base: [10, 50, 30], crystal: [40, 200, 120], glow: [80, 255, 160],
              refraction: [[50,255,150],[100,255,200],[0,200,100],[150,255,100],[0,150,120]] },
            // Citrine - amber/gold
            { base: [60, 40, 10], crystal: [255, 200, 60], glow: [255, 230, 100],
              refraction: [[255,220,50],[255,180,0],[255,150,50],[200,150,0],[255,255,150]] },
            // Ice - blue/cyan
            { base: [10, 20, 50], crystal: [150, 220, 255], glow: [100, 200, 255],
              refraction: [[100,220,255],[150,255,255],[50,150,255],[200,240,255],[80,180,220]] },
            // Bismuth - rainbow metallic
            { base: [30, 30, 40], crystal: [180, 150, 200], glow: [200, 180, 255],
              refraction: [[255,100,150],[100,200,255],[255,200,50],[50,255,200],[255,50,200]] },
        ];
        this.palette = palettes[Math.min(this.crystalType, palettes.length - 1)];

        this.caveTone = `rgb(${this.palette.base.join(',')})`;

        // Generate initial crystal formations from edges
        this.crystals = [];
        const crystalCount = 15 + Math.floor(rng() * 20);
        for (let i = 0; i < crystalCount; i++) {
            this._addCrystal(system, rng, null);
        }

        // Ambient floating mineral particles
        this.ambientParticles = [];
        const particleCount = 80 + Math.floor(rng() * 80);
        for (let i = 0; i < particleCount; i++) {
            this.ambientParticles.push({
                x: rng() * system.width,
                y: rng() * system.height,
                size: 0.5 + rng() * 2,
                speed: 0.1 + rng() * 0.4,
                angle: rng() * Math.PI * 2,
                twinklePhase: rng() * Math.PI * 2,
                twinkleSpeed: 0.02 + rng() * 0.05,
                drift: (rng() - 0.5) * 0.01
            });
        }

        this.sparkles = [];
        this.lightBeams = [];
        this.growthPoints = [];
        this.tick = 0;
        this.lightX = system.width / 2;
        this.lightY = system.height / 2;
    }

    _addCrystal(system, rng, origin) {
        const w = system.width, h = system.height;

        // Crystals grow from edges or from click points
        let baseX, baseY, growAngle;
        if (origin) {
            baseX = origin.x;
            baseY = origin.y;
            growAngle = origin.angle || (rng() * Math.PI * 2);
        } else {
            const edge = Math.floor(rng() * 4);
            if (edge === 0) { baseX = rng() * w; baseY = h; growAngle = -Math.PI / 2 + (rng() - 0.5) * 0.8; }
            else if (edge === 1) { baseX = rng() * w; baseY = 0; growAngle = Math.PI / 2 + (rng() - 0.5) * 0.8; }
            else if (edge === 2) { baseX = 0; baseY = rng() * h; growAngle = (rng() - 0.5) * 0.8; }
            else { baseX = w; baseY = rng() * h; growAngle = Math.PI + (rng() - 0.5) * 0.8; }
        }

        const maxLength = 50 + rng() * 150;
        const width = 4 + rng() * 20;
        const facets = 3 + Math.floor(rng() * 4); // 3-6 sided
        const transparency = 0.2 + rng() * 0.5;
        const subCrystals = [];

        // Sub-crystals branching off
        const branchCount = Math.floor(rng() * 4);
        for (let b = 0; b < branchCount; b++) {
            const branchPos = 0.3 + rng() * 0.5; // position along main crystal
            const branchAngle = growAngle + (rng() - 0.5) * 1.2;
            subCrystals.push({
                position: branchPos,
                angle: branchAngle,
                length: maxLength * (0.3 + rng() * 0.4),
                width: width * (0.3 + rng() * 0.5),
                growth: 0,
                facets: facets
            });
        }

        this.crystals.push({
            x: baseX,
            y: baseY,
            angle: growAngle,
            maxLength,
            currentLength: origin ? 0 : maxLength * rng(),
            width,
            facets,
            transparency,
            subCrystals,
            growth: origin ? 0 : 1, // 0-1 growth progress
            hueShift: rng() * 30 - 15,
            shimmerPhase: rng() * Math.PI * 2,
            shimmerSpeed: 0.01 + rng() * 0.03
        });
    }

    update(system) {
        this.tick++;

        // Smooth light tracking to mouse
        this.lightX += (mouse.x - this.lightX) * 0.08;
        this.lightY += (mouse.y - this.lightY) * 0.08;

        // Grow crystals
        for (const crystal of this.crystals) {
            if (crystal.growth < 1) {
                crystal.growth = Math.min(1, crystal.growth + 0.005 * this.growthSpeed);
                crystal.currentLength = crystal.maxLength * this._easeOutBack(crystal.growth);
            }
            crystal.shimmerPhase += crystal.shimmerSpeed;

            // Grow sub-crystals after main is 50% grown
            if (crystal.growth > 0.5) {
                for (const sub of crystal.subCrystals) {
                    if (sub.growth < 1) {
                        sub.growth = Math.min(1, sub.growth + 0.003 * this.growthSpeed);
                    }
                }
            }
        }

        // Update ambient particles
        for (const p of this.ambientParticles) {
            p.angle += p.drift;
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.twinklePhase += p.twinkleSpeed;

            // Light attraction
            const dx = this.lightX - p.x, dy = this.lightY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            if (dist < 200) {
                p.x += dx / dist * 0.3;
                p.y += dy / dist * 0.3;
            }

            // Wrap
            if (p.x < 0) p.x = system.width;
            if (p.x > system.width) p.x = 0;
            if (p.y < 0) p.y = system.height;
            if (p.y > system.height) p.y = 0;
        }

        // Generate sparkles near light source on crystal surfaces
        if (this.tick % 3 === 0 && this.sparkles.length < 100) {
            for (const crystal of this.crystals) {
                const tipX = crystal.x + Math.cos(crystal.angle) * crystal.currentLength;
                const tipY = crystal.y + Math.sin(crystal.angle) * crystal.currentLength;
                const dx = this.lightX - tipX, dy = this.lightY - tipY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 250 && Math.random() < 0.15) {
                    const refColor = this.palette.refraction[Math.floor(Math.random() * this.palette.refraction.length)];
                    this.sparkles.push({
                        x: tipX + (Math.random() - 0.5) * 20,
                        y: tipY + (Math.random() - 0.5) * 20,
                        size: 1 + Math.random() * 3,
                        life: 1,
                        decay: 0.02 + Math.random() * 0.03,
                        color: refColor
                    });
                }
            }
        }

        // Decay sparkles
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            this.sparkles[i].life -= this.sparkles[i].decay;
            if (this.sparkles[i].life <= 0) {
                this.sparkles.splice(i, 1);
            }
        }

        // Process growth points from clicks
        for (let i = this.growthPoints.length - 1; i >= 0; i--) {
            const gp = this.growthPoints[i];
            gp.timer++;
            if (gp.timer > gp.maxTimer) {
                this.growthPoints.splice(i, 1);
            } else if (gp.timer % 8 === 0 && this.crystals.length < 80) {
                this._addCrystal(system, Math.random, {
                    x: gp.x, y: gp.y,
                    angle: gp.baseAngle + (Math.random() - 0.5) * 1.5
                });
            }
        }
    }

    _easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    draw(system) {
        const ctx = system.ctx;
        const lx = this.lightX, ly = this.lightY;

        // Ambient cave glow from light source
        const ambientGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 500);
        ambientGrad.addColorStop(0, `rgba(${this.palette.glow.join(',')}, 0.1)`);
        ambientGrad.addColorStop(0.5, `rgba(${this.palette.glow.join(',')}, 0.03)`);
        ambientGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = ambientGrad;
        ctx.fillRect(0, 0, system.width, system.height);

        // Draw crystals
        for (const crystal of this.crystals) {
            this._drawCrystal(ctx, crystal, lx, ly);

            // Draw sub-crystals
            for (const sub of crystal.subCrystals) {
                if (sub.growth <= 0) continue;
                const branchX = crystal.x + Math.cos(crystal.angle) * crystal.currentLength * sub.position;
                const branchY = crystal.y + Math.sin(crystal.angle) * crystal.currentLength * sub.position;
                this._drawCrystal(ctx, {
                    x: branchX, y: branchY,
                    angle: sub.angle,
                    currentLength: sub.length * this._easeOutBack(sub.growth),
                    width: sub.width,
                    facets: sub.facets,
                    transparency: crystal.transparency * 0.8,
                    hueShift: crystal.hueShift + 10,
                    shimmerPhase: crystal.shimmerPhase * 1.5,
                    growth: sub.growth
                }, lx, ly);
            }
        }

        // Draw light refraction beams
        ctx.globalCompositeOperation = 'lighter';
        for (const crystal of this.crystals) {
            if (crystal.growth < 0.5) continue;
            const tipX = crystal.x + Math.cos(crystal.angle) * crystal.currentLength;
            const tipY = crystal.y + Math.sin(crystal.angle) * crystal.currentLength;
            const dx = lx - tipX, dy = ly - tipY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 350) {
                const intensity = (1 - dist / 350) * this.refractionIntensity * 0.15;
                // Prismatic beam away from light
                const refAngle = crystal.angle + Math.PI * 0.3;
                const beamLen = 80 + (1 - dist / 350) * 120;
                const refColor = this.palette.refraction[Math.floor(this.tick * 0.02 + crystal.hueShift) % this.palette.refraction.length];

                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX + Math.cos(refAngle) * beamLen, tipY + Math.sin(refAngle) * beamLen);
                ctx.strokeStyle = `rgba(${refColor.join(',')}, ${intensity})`;
                ctx.lineWidth = 3 + (1 - dist / 350) * 5;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }

        // Draw sparkles
        for (const s of this.sparkles) {
            const a = s.life;
            ctx.fillStyle = `rgba(${s.color.join(',')}, ${a})`;
            ctx.beginPath();
            // Star shape sparkle
            const r = s.size * a;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x + Math.cos(angle) * r, s.y + Math.sin(angle) * r);
            }
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(${s.color.join(',')}, ${a})`;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(s.x, s.y, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw ambient particles
        for (const p of this.ambientParticles) {
            const twinkle = (Math.sin(p.twinklePhase) + 1) * 0.5;
            const a = 0.2 + twinkle * 0.5;
            ctx.fillStyle = `rgba(${this.palette.crystal.join(',')}, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.5 + twinkle * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    _drawCrystal(ctx, crystal, lx, ly) {
        if (crystal.currentLength <= 0) return;
        const tipX = crystal.x + Math.cos(crystal.angle) * crystal.currentLength;
        const tipY = crystal.y + Math.sin(crystal.angle) * crystal.currentLength;
        const perpAngle = crystal.angle + Math.PI / 2;
        const halfW = crystal.width * (crystal.growth || 1) / 2;

        // Light-responsive shimmer
        const dx = lx - (crystal.x + tipX) / 2;
        const dy = ly - (crystal.y + tipY) / 2;
        const lightDist = Math.sqrt(dx * dx + dy * dy) + 1;
        const lightFactor = Math.max(0.2, 1 - lightDist / 500);
        const shimmer = (Math.sin(crystal.shimmerPhase) + 1) * 0.5;
        const pal = this.palette;

        // Crystal body with gradient
        const grad = ctx.createLinearGradient(crystal.x, crystal.y, tipX, tipY);
        const baseAlpha = (crystal.transparency || 0.4) * lightFactor;
        grad.addColorStop(0, `rgba(${pal.crystal.join(',')}, ${baseAlpha * 0.8})`);
        grad.addColorStop(0.5, `rgba(${pal.crystal.join(',')}, ${baseAlpha * (0.5 + shimmer * 0.3)})`);
        grad.addColorStop(1, `rgba(${pal.glow.join(',')}, ${baseAlpha * 0.3})`);

        // Draw hexagonal crystal shape
        ctx.beginPath();
        // Base (wider)
        ctx.moveTo(
            crystal.x + Math.cos(perpAngle) * halfW,
            crystal.y + Math.sin(perpAngle) * halfW
        );
        // Left face
        const midX = (crystal.x + tipX) / 2;
        const midY = (crystal.y + tipY) / 2;
        ctx.lineTo(
            midX + Math.cos(perpAngle) * halfW * 0.8,
            midY + Math.sin(perpAngle) * halfW * 0.8
        );
        // Tip
        ctx.lineTo(tipX, tipY);
        // Right face
        ctx.lineTo(
            midX - Math.cos(perpAngle) * halfW * 0.8,
            midY - Math.sin(perpAngle) * halfW * 0.8
        );
        // Back to base
        ctx.lineTo(
            crystal.x - Math.cos(perpAngle) * halfW,
            crystal.y - Math.sin(perpAngle) * halfW
        );
        ctx.closePath();

        ctx.fillStyle = grad;
        ctx.fill();

        // Edge highlight
        ctx.strokeStyle = `rgba(${pal.glow.join(',')}, ${baseAlpha * 0.6 * shimmer})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    onShockwave(x, y) {
        // Seed new crystal growth from click point
        if (this.growthPoints.length < 5) {
            this.growthPoints.push({
                x, y,
                baseAngle: Math.atan2(y - this.lightY, x - this.lightX),
                timer: 0,
                maxTimer: 40
            });
        }
        // Burst of sparkles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const refColor = this.palette.refraction[Math.floor(Math.random() * this.palette.refraction.length)];
            this.sparkles.push({
                x: x + Math.cos(angle) * Math.random() * 30,
                y: y + Math.sin(angle) * Math.random() * 30,
                size: 2 + Math.random() * 4,
                life: 1,
                decay: 0.015 + Math.random() * 0.02,
                color: refColor
            });
        }
    }
}
