/**
 * @file sand_dune_architecture.js
 * @description Desert landscape with particle sand that swirls in wind, forming
 * rippling dunes. Mouse creates wind gusts that blow sand. Seeds change sand
 * type (golden sahara, red mars, white salt flats, volcanic ash, crystal snow),
 * wind patterns, dune formations, and particle behaviors.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class SandDuneArchitecture extends Architecture {
    constructor() {
        super();
        this.grains = [];
        this.dunes = [];
        this.windGusts = [];
        this.dustDevils = [];
        this.sandType = 0;
        this.windBase = { angle: 0, speed: 0 };
        this.tick = 0;
        this.heatShimmer = 0;
    }

    init(system) {
        const rng = system.rng;

        this.sandType = Math.floor(rng() * 6);
        // 0=golden sahara, 1=red mars, 2=white salt, 3=volcanic ash, 4=crystal snow, 5=alien purple

        this.windPattern = Math.floor(rng() * 5);
        // 0=steady easterly, 1=swirling, 2=gusting, 3=calm with bursts, 4=cyclonic

        this.windBase = {
            angle: rng() * Math.PI * 2,
            speed: 0.5 + rng() * 2,
        };

        this.grainCount = 800 + Math.floor(rng() * 600);
        this.duneCount = 4 + Math.floor(rng() * 5);
        this.dustDevilChance = 0.001 + rng() * 0.004;
        this.heatShimmerEnabled = rng() > 0.4;
        this.starFieldEnabled = this.sandType === 1 && rng() > 0.5; // Mars night sky
        this.rippleDetail = 0.5 + rng() * 1.5;

        // Generate dunes (wave-like height curves)
        this.dunes = [];
        for (let i = 0; i < this.duneCount; i++) {
            const baseY = system.height * (0.4 + (i / this.duneCount) * 0.5);
            const amplitude = 30 + rng() * 60;
            const frequency = 0.002 + rng() * 0.004;
            const phase = rng() * Math.PI * 2;
            const drift = (rng() - 0.5) * 0.1;
            this.dunes.push({ baseY, amplitude, frequency, phase, drift, layerAlpha: 0.15 + (i / this.duneCount) * 0.3 });
        }

        // Generate sand grains
        this.grains = [];
        for (let i = 0; i < this.grainCount; i++) {
            this.grains.push(this.createGrain(system, rng, false));
        }

        // Stars for mars
        this.stars = [];
        if (this.starFieldEnabled) {
            for (let i = 0; i < 100; i++) {
                this.stars.push({
                    x: rng() * system.width,
                    y: rng() * system.height * 0.4,
                    size: rng() * 1.5 + 0.3,
                    alpha: rng() * 0.5 + 0.3,
                    twinkle: rng() * Math.PI * 2,
                });
            }
        }
    }

    createGrain(system, rng, airborne) {
        return {
            x: rng() * system.width,
            y: airborne ? rng() * system.height * 0.7 : system.height * (0.5 + rng() * 0.5),
            vx: 0,
            vy: 0,
            size: 0.5 + rng() * 2,
            settled: !airborne,
            settleTimer: 0,
            alpha: 0.3 + rng() * 0.5,
            colorVariant: rng(),
        };
    }

    getGrainColor(variant, alpha) {
        switch (this.sandType) {
            case 0: { // Golden sahara
                const r = 200 + variant * 55;
                const g = 170 + variant * 40;
                const b = 100 + variant * 30;
                return `rgba(${r},${g},${b},${alpha})`;
            }
            case 1: { // Red mars
                const r = 180 + variant * 60;
                const g = 80 + variant * 40;
                const b = 40 + variant * 30;
                return `rgba(${r},${g},${b},${alpha})`;
            }
            case 2: { // White salt
                const v = 220 + variant * 35;
                return `rgba(${v},${v},${v - 10},${alpha})`;
            }
            case 3: { // Volcanic ash
                const v = 40 + variant * 50;
                return `rgba(${v},${v},${v + 5},${alpha})`;
            }
            case 4: { // Crystal snow
                const r = 200 + variant * 55;
                const g = 220 + variant * 35;
                const b = 240 + variant * 15;
                return `rgba(${r},${g},${b},${alpha})`;
            }
            case 5: { // Alien purple
                const r = 120 + variant * 60;
                const g = 60 + variant * 30;
                const b = 150 + variant * 80;
                return `rgba(${r},${g},${b},${alpha})`;
            }
            default: return `rgba(200,180,120,${alpha})`;
        }
    }

    getDuneColor(layer, alpha) {
        switch (this.sandType) {
            case 0: return `rgba(${180 - layer * 20},${150 - layer * 15},${80 - layer * 10},${alpha})`;
            case 1: return `rgba(${160 - layer * 15},${60 - layer * 10},${30 - layer * 5},${alpha})`;
            case 2: return `rgba(${200 - layer * 10},${200 - layer * 10},${195 - layer * 10},${alpha})`;
            case 3: return `rgba(${50 + layer * 5},${45 + layer * 5},${48 + layer * 5},${alpha})`;
            case 4: return `rgba(${180 - layer * 10},${200 - layer * 10},${220 - layer * 10},${alpha})`;
            case 5: return `rgba(${100 - layer * 10},${50 - layer * 5},${130 - layer * 10},${alpha})`;
            default: return `rgba(180,150,80,${alpha})`;
        }
    }

    getWindAt(x, y, system) {
        let wx = 0, wy = 0;

        switch (this.windPattern) {
            case 0: // Steady
                wx = Math.cos(this.windBase.angle) * this.windBase.speed;
                wy = Math.sin(this.windBase.angle) * this.windBase.speed * 0.3;
                break;
            case 1: // Swirling
                wx = Math.sin(y * 0.005 + this.tick * 0.01) * this.windBase.speed;
                wy = Math.cos(x * 0.003 + this.tick * 0.008) * this.windBase.speed * 0.5;
                break;
            case 2: // Gusting
                const gust = Math.sin(this.tick * 0.02) > 0.7 ? 3 : 0.5;
                wx = Math.cos(this.windBase.angle) * this.windBase.speed * gust;
                wy = Math.sin(this.windBase.angle) * this.windBase.speed * gust * 0.2;
                break;
            case 3: // Calm with bursts
                const burst = Math.sin(this.tick * 0.005) > 0.9 ? 5 : 0.2;
                wx = Math.cos(this.windBase.angle + Math.sin(this.tick * 0.01)) * burst;
                wy = -0.5 * burst;
                break;
            case 4: // Cyclonic
                const cAngle = Math.atan2(y - system.height * 0.6, x - system.width / 2);
                wx = Math.cos(cAngle + Math.PI / 2) * this.windBase.speed;
                wy = Math.sin(cAngle + Math.PI / 2) * this.windBase.speed;
                break;
        }

        // Mouse creates local wind gust
        const dx = x - mouse.x, dy = y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 1) {
            const force = (200 - dist) * 0.005;
            wx += (dx / dist) * force * 3;
            wy += (dy / dist) * force * 2;
        }

        // Dust devil influence
        for (const dd of this.dustDevils) {
            const ddx = x - dd.x, ddy = y - dd.y;
            const ddd = Math.sqrt(ddx * ddx + ddy * ddy);
            if (ddd < dd.radius && ddd > 1) {
                const ddf = (dd.radius - ddd) / dd.radius * dd.strength;
                wx += Math.cos(Math.atan2(ddy, ddx) + Math.PI / 2) * ddf;
                wy += Math.sin(Math.atan2(ddy, ddx) + Math.PI / 2) * ddf - ddf * 0.5;
            }
        }

        return { x: wx, y: wy };
    }

    update(system) {
        this.tick++;

        // Shift wind angle slowly
        this.windBase.angle += Math.sin(this.tick * 0.001) * 0.002;

        // Animate dune phases
        for (const d of this.dunes) {
            d.phase += d.drift;
        }

        // Spawn dust devils
        if (Math.random() < this.dustDevilChance && this.dustDevils.length < 3) {
            this.dustDevils.push({
                x: Math.random() * system.width,
                y: system.height * (0.5 + Math.random() * 0.3),
                vx: (Math.random() - 0.5) * 1,
                radius: 50 + Math.random() * 80,
                strength: 2 + Math.random() * 3,
                life: 200 + Math.random() * 200,
                rotation: 0,
            });
        }

        // Update dust devils
        for (let i = this.dustDevils.length - 1; i >= 0; i--) {
            const dd = this.dustDevils[i];
            dd.x += dd.vx;
            dd.rotation += 0.1;
            dd.life--;
            if (dd.life <= 0 || dd.x < -100 || dd.x > system.width + 100) {
                this.dustDevils[i] = this.dustDevils[this.dustDevils.length - 1];
                this.dustDevils.pop();
            }
        }

        // Update grains
        for (const g of this.grains) {
            if (g.settled) {
                // Check if wind is strong enough to lift
                const wind = this.getWindAt(g.x, g.y, system);
                const windMag = Math.sqrt(wind.x * wind.x + wind.y * wind.y);
                if (windMag > 1.5 || Math.random() < 0.002) {
                    g.settled = false;
                    g.vx = wind.x * 0.5;
                    g.vy = wind.y * 0.5 - 1;
                }
            } else {
                const wind = this.getWindAt(g.x, g.y, system);
                g.vx += wind.x * 0.02;
                g.vy += wind.y * 0.02 + 0.03; // gravity

                g.vx *= 0.98;
                g.vy *= 0.98;

                g.x += g.vx;
                g.y += g.vy;

                // Get dune height at this position
                let duneTop = system.height;
                for (const d of this.dunes) {
                    const dy = d.baseY + Math.sin(g.x * d.frequency + d.phase) * d.amplitude;
                    duneTop = Math.min(duneTop, dy);
                }

                // Settle on dune surface
                if (g.y >= duneTop && g.vy > 0) {
                    g.y = duneTop;
                    g.settled = true;
                    g.settleTimer = 60 + Math.random() * 120;
                }

                // Wrap horizontally
                if (g.x < -10) g.x = system.width + 10;
                if (g.x > system.width + 10) g.x = -10;
                if (g.y < -50) { g.y = system.height * 0.5; g.vy = 0; }
                if (g.y > system.height + 10) { g.y = system.height * 0.5; g.settled = false; }
            }
        }

        // Heat shimmer
        if (this.heatShimmerEnabled) {
            this.heatShimmer = Math.sin(this.tick * 0.03) * 0.5 + 0.5;
        }
    }

    draw(system) {
        const ctx = system.ctx;

        // Stars (mars)
        if (this.starFieldEnabled) {
            for (const s of this.stars) {
                const twinkle = Math.sin(this.tick * 0.02 + s.twinkle) * 0.2 + s.alpha;
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Sky gradient for some types
        if (this.sandType === 0 || this.sandType === 5) {
            const skyGrad = ctx.createLinearGradient(0, 0, 0, system.height * 0.5);
            if (this.sandType === 5) {
                skyGrad.addColorStop(0, 'rgba(30, 10, 50, 0.3)');
                skyGrad.addColorStop(1, 'rgba(60, 20, 80, 0)');
            } else {
                skyGrad.addColorStop(0, 'rgba(40, 30, 15, 0.2)');
                skyGrad.addColorStop(1, 'rgba(60, 45, 20, 0)');
            }
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, system.width, system.height * 0.5);
        }

        // Draw dune layers (back to front)
        for (let d = 0; d < this.dunes.length; d++) {
            const dune = this.dunes[d];
            ctx.beginPath();
            ctx.moveTo(0, system.height);

            for (let x = 0; x <= system.width; x += 4) {
                const y = dune.baseY +
                    Math.sin(x * dune.frequency + dune.phase) * dune.amplitude +
                    Math.sin(x * dune.frequency * 2.3 + dune.phase * 1.5) * dune.amplitude * 0.3;
                ctx.lineTo(x, y);
            }

            ctx.lineTo(system.width, system.height);
            ctx.closePath();
            ctx.fillStyle = this.getDuneColor(d, dune.layerAlpha);
            ctx.fill();

            // Sand ripple lines on dune surface
            if (d === this.dunes.length - 1) {
                ctx.save();
                ctx.strokeStyle = this.getDuneColor(d, 0.1);
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                for (let x = 0; x < system.width; x += 8 / this.rippleDetail) {
                    const y = dune.baseY +
                        Math.sin(x * dune.frequency + dune.phase) * dune.amplitude +
                        Math.sin(x * dune.frequency * 2.3 + dune.phase * 1.5) * dune.amplitude * 0.3;
                    const rippleY = y + Math.sin(x * 0.1 + this.tick * 0.02) * 2;
                    ctx.moveTo(x, rippleY);
                    ctx.lineTo(x + 3, rippleY + 0.5);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw sand grains
        // Batch by similar color for performance
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        for (const g of this.grains) {
            if (g.settled) continue; // Only draw airborne grains visibly
            ctx.moveTo(g.x + g.size, g.y);
            ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
        }
        ctx.fillStyle = this.getGrainColor(0.5, 0.4);
        ctx.fill();

        // Draw settled grains more subtly
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        for (const g of this.grains) {
            if (!g.settled) continue;
            ctx.moveTo(g.x + g.size * 0.5, g.y);
            ctx.arc(g.x, g.y, g.size * 0.5, 0, Math.PI * 2);
        }
        ctx.fillStyle = this.getGrainColor(0.7, 0.3);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw dust devils
        for (const dd of this.dustDevils) {
            const lifeRatio = dd.life / 400;
            ctx.save();
            ctx.globalAlpha = lifeRatio * 0.3;
            for (let ring = 0; ring < 5; ring++) {
                const r = dd.radius * (ring / 5);
                const grad = ctx.createRadialGradient(dd.x, dd.y, r * 0.8, dd.x, dd.y, r);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, this.getGrainColor(0.5, 0.1));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(dd.x, dd.y - ring * 15, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Heat shimmer effect
        if (this.heatShimmerEnabled && this.heatShimmer > 0.3) {
            ctx.save();
            ctx.globalAlpha = this.heatShimmer * 0.04;
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 5; i++) {
                const shimmerY = system.height * 0.4 + i * 30;
                const shimmerX = Math.sin(this.tick * 0.02 + i) * 20;
                ctx.fillStyle = this.getGrainColor(0.8, 0.1);
                ctx.fillRect(shimmerX, shimmerY, system.width, 3);
            }
            ctx.restore();
        }
    }
}
