/**
 * @file weather_architecture.js
 * @description Dynamic weather system with procedural clouds, lightning, rain, and snow.
 * Seed determines weather type, cloud formations, precipitation density, and colors.
 * Mouse attracts/repels precipitation. Gravity well summons lightning strikes.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class WeatherArchitecture extends Architecture {
    constructor() {
        super();
        this.clouds = [];
        this.precipitation = [];
        this.precipPool = [];
        this.lightning = [];
        this.puddles = [];
        this.puddlePool = [];
        this.weatherType = 0;
        this.windSpeed = 0;
        this.windAngle = 0;
        this.skyHue = 220;
        this.fogDensity = 0;
        this.thunderTimer = 0;
        this.flashAlpha = 0;
    }

    init(system) {
        const rng = system.rng;

        // Weather types: 0=rain, 1=snow, 2=thunderstorm, 3=hail+wind, 4=aurora snow
        this.weatherType = Math.floor(rng() * 5);

        this.windSpeed = (rng() - 0.3) * 3;
        this.windAngle = this.windSpeed > 0 ? 0.1 + rng() * 0.3 : -(0.1 + rng() * 0.3);
        this.fogDensity = rng() * 0.03;

        // Sky color by weather
        switch (this.weatherType) {
            case 0: this.skyHue = 200 + rng() * 20; break;   // rain: blue-grey
            case 1: this.skyHue = 210 + rng() * 10; break;   // snow: pale blue
            case 2: this.skyHue = 250 + rng() * 20; break;   // thunder: dark purple
            case 3: this.skyHue = 180 + rng() * 30; break;   // hail: teal
            case 4: this.skyHue = 160 + rng() * 40; break;   // aurora snow: green tones
        }

        // Generate clouds
        this.clouds = [];
        const cloudCount = 5 + Math.floor(rng() * 8);
        for (let i = 0; i < cloudCount; i++) {
            const puffs = [];
            const puffCount = 3 + Math.floor(rng() * 5);
            const baseX = rng() * system.width;
            const baseY = rng() * system.height * 0.5;

            for (let p = 0; p < puffCount; p++) {
                puffs.push({
                    offsetX: (rng() - 0.5) * 120,
                    offsetY: (rng() - 0.5) * 40,
                    radius: 30 + rng() * 60,
                    alpha: 0.03 + rng() * 0.05
                });
            }

            this.clouds.push({
                x: baseX,
                y: baseY,
                puffs,
                speed: 0.2 + rng() * 0.5,
                darkness: this.weatherType === 2 ? 0.15 + rng() * 0.1 : 0.05 + rng() * 0.08,
                isThunder: this.weatherType === 2 && rng() > 0.5
            });
        }

        // Initialize precipitation
        this.precipitation = [];
        this.precipPool = [];
        const precipCount = this.weatherType === 1 || this.weatherType === 4 ? 200 : 300;
        for (let i = 0; i < precipCount; i++) {
            this.precipitation.push(this._createPrecip(system, rng, true));
        }

        this.lightning = [];
        this.puddles = [];
        this.puddlePool = [];
        this.thunderTimer = 0;
        this.flashAlpha = 0;
    }

    _createPrecip(system, rng, initial) {
        const x = rng() * (system.width + 200) - 100;
        const y = initial ? rng() * system.height : -10 - rng() * 50;

        switch (this.weatherType) {
            case 0: // Rain
                return {
                    x, y,
                    vx: this.windSpeed,
                    vy: 8 + rng() * 6,
                    length: 10 + rng() * 15,
                    alpha: 0.15 + rng() * 0.2,
                    size: 1
                };
            case 1: // Snow
            case 4: // Aurora snow
                return {
                    x, y,
                    vx: this.windSpeed * 0.5 + (rng() - 0.5) * 0.5,
                    vy: 0.5 + rng() * 1.5,
                    length: 0,
                    alpha: 0.3 + rng() * 0.4,
                    size: 1 + rng() * 3,
                    wobble: rng() * Math.PI * 2,
                    wobbleSpeed: 0.02 + rng() * 0.04
                };
            case 2: // Thunderstorm (heavy rain)
                return {
                    x, y,
                    vx: this.windSpeed * 1.5,
                    vy: 12 + rng() * 8,
                    length: 15 + rng() * 20,
                    alpha: 0.2 + rng() * 0.2,
                    size: 1 + rng()
                };
            case 3: // Hail
                return {
                    x, y,
                    vx: this.windSpeed * 2,
                    vy: 6 + rng() * 10,
                    length: 0,
                    alpha: 0.4 + rng() * 0.3,
                    size: 2 + rng() * 4,
                    rotation: rng() * Math.PI * 2,
                    rotSpeed: (rng() - 0.5) * 0.2
                };
            default:
                return { x, y, vx: 0, vy: 2, length: 10, alpha: 0.2, size: 1 };
        }
    }

    _createLightning(x, y, system) {
        const rng = system.rng;
        const segments = [];
        let cx = x;
        let cy = y;
        const targetY = system.height;
        const steps = 10 + Math.floor(rng() * 15);

        for (let i = 0; i < steps; i++) {
            const nx = cx + (rng() - 0.5) * 80;
            const ny = cy + (targetY - y) / steps;
            segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
            cx = nx;
            cy = ny;

            // Branch
            if (rng() > 0.7) {
                const bx = cx + (rng() - 0.5) * 100;
                const by = cy + rng() * 60;
                segments.push({ x1: cx, y1: cy, x2: bx, y2: by, branch: true });
            }
        }

        return {
            segments,
            life: 1,
            decay: 0.05 + rng() * 0.05,
            hue: 200 + rng() * 60,
            thickness: 2 + rng() * 2
        };
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;

        // Update clouds
        for (const cloud of this.clouds) {
            cloud.x += cloud.speed + this.windSpeed * 0.5;
            if (cloud.x > system.width + 200) cloud.x = -200;
            if (cloud.x < -200) cloud.x = system.width + 200;
        }

        // Update precipitation
        for (let i = 0; i < this.precipitation.length; i++) {
            const p = this.precipitation[i];

            // Mouse influence on precipitation
            const dx = mx - p.x;
            const dy = my - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 22500) {
                const dist = Math.sqrt(distSq);
                const force = (150 - dist) / 150;
                if (system.isGravityWell) {
                    // Attract
                    p.vx += dx / dist * force * 0.5;
                    p.vy += dy / dist * force * 0.5;
                } else {
                    // Deflect
                    p.vx -= dx / dist * force * 0.3;
                }
            }

            // Snow/aurora wobble
            if ((this.weatherType === 1 || this.weatherType === 4) && p.wobble !== undefined) {
                p.wobble += p.wobbleSpeed;
                p.x += Math.sin(p.wobble) * 0.5;
            }

            // Hail rotation
            if (this.weatherType === 3 && p.rotSpeed !== undefined) {
                p.rotation += p.rotSpeed;
            }

            p.x += p.vx * system.speedMultiplier;
            p.y += p.vy * system.speedMultiplier;

            // Reset when off screen
            if (p.y > system.height + 20 || p.x < -50 || p.x > system.width + 50) {
                // Create splash/puddle
                if (p.y > system.height - 10 && (this.weatherType === 0 || this.weatherType === 2)) {
                    let puddle = this.puddlePool.length > 0 ? this.puddlePool.pop() : {};
                    puddle.x = p.x;
                    puddle.y = system.height - 5;
                    puddle.radius = 0;
                    puddle.maxRadius = 3 + system.rng() * 5;
                    puddle.life = 1;
                    this.puddles.push(puddle);
                }

                const newP = this._createPrecip(system, system.rng, false);
                Object.assign(p, newP);
            }
        }

        // Update puddles
        for (let i = this.puddles.length - 1; i >= 0; i--) {
            const p = this.puddles[i];
            p.radius += 0.5;
            p.life = 1 - p.radius / p.maxRadius;
            if (p.life <= 0) {
                this.puddlePool.push(p);
                this.puddles[i] = this.puddles[this.puddles.length - 1];
                this.puddles.pop();
            }
        }
        // Cap puddles
        while (this.puddles.length > 50) {
            this.puddlePool.push(this.puddles.shift());
        }

        // Lightning on gravity well (thunderstorm) or random
        if (system.isGravityWell && (this.weatherType === 2 || this.weatherType === 3)) {
            if (tick % 15 === 0) {
                this.lightning.push(this._createLightning(mx, 0, system));
                this.flashAlpha = 0.3;
            }
        }

        // Random lightning in thunderstorms
        if (this.weatherType === 2 && system.rng() < 0.005) {
            const thunderCloud = this.clouds.find(c => c.isThunder);
            if (thunderCloud) {
                this.lightning.push(this._createLightning(
                    thunderCloud.x + (system.rng() - 0.5) * 100,
                    thunderCloud.y + 30,
                    system
                ));
                this.flashAlpha = 0.15;
            }
        }

        // Update lightning
        for (let i = this.lightning.length - 1; i >= 0; i--) {
            this.lightning[i].life -= this.lightning[i].decay;
            if (this.lightning[i].life <= 0) {
                this.lightning.splice(i, 1);
            }
        }

        // Flash decay
        this.flashAlpha *= 0.9;
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        ctx.save();

        // Lightning flash (white overlay)
        if (this.flashAlpha > 0.01) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
            ctx.fillRect(0, 0, system.width, system.height);
        }

        // Draw clouds
        for (const cloud of this.clouds) {
            for (const puff of cloud.puffs) {
                const px = cloud.x + puff.offsetX;
                const py = cloud.y + puff.offsetY;
                const grad = ctx.createRadialGradient(px, py, 0, px, py, puff.radius);
                grad.addColorStop(0, `hsla(${this.skyHue}, 10%, ${cloud.isThunder ? 15 : 40}%, ${cloud.darkness})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, puff.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw precipitation
        if (this.weatherType === 0 || this.weatherType === 2) {
            // Rain
            ctx.strokeStyle = `hsla(${this.skyHue + 20}, 30%, 70%, 1)`;
            ctx.lineWidth = 1;
            for (const p of this.precipitation) {
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 0.5, p.y - p.length);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        } else if (this.weatherType === 1 || this.weatherType === 4) {
            // Snow
            ctx.fillStyle = '#fff';
            for (const p of this.precipitation) {
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Aurora effect for type 4
            if (this.weatherType === 4) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const auroraY = system.height * 0.2;
                for (let i = 0; i < 3; i++) {
                    const hue = (120 + i * 40 + tick * 0.3) % 360;
                    ctx.strokeStyle = `hsla(${hue}, 80%, 50%, 0.06)`;
                    ctx.lineWidth = 30 + i * 20;
                    ctx.beginPath();
                    for (let x = 0; x < system.width; x += 10) {
                        const y = auroraY + Math.sin(x * 0.003 + tick * 0.005 + i) * 40 +
                                  Math.sin(x * 0.008 + tick * 0.01) * 20;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                ctx.restore();
            }
        } else if (this.weatherType === 3) {
            // Hail
            ctx.fillStyle = `hsla(${this.skyHue}, 20%, 80%, 1)`;
            for (const p of this.precipitation) {
                ctx.globalAlpha = p.alpha;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation || 0);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }

        // Draw puddle splashes
        ctx.lineWidth = 0.5;
        for (const p of this.puddles) {
            ctx.strokeStyle = `hsla(${this.skyHue + 20}, 30%, 70%, ${p.life * 0.3})`;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.radius * 2, p.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw lightning
        for (const bolt of this.lightning) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Glow
            ctx.strokeStyle = `hsla(${bolt.hue}, 80%, 80%, ${bolt.life * 0.3})`;
            ctx.lineWidth = bolt.thickness * 3;
            ctx.beginPath();
            for (const seg of bolt.segments) {
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
            }
            ctx.stroke();

            // Core
            ctx.strokeStyle = `hsla(${bolt.hue}, 90%, 95%, ${bolt.life * 0.8})`;
            ctx.lineWidth = bolt.thickness;
            ctx.beginPath();
            for (const seg of bolt.segments) {
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
            }
            ctx.stroke();

            ctx.restore();
        }

        // Fog layer
        if (this.fogDensity > 0.005) {
            ctx.fillStyle = `hsla(${this.skyHue}, 5%, 30%, ${this.fogDensity})`;
            ctx.fillRect(0, system.height * 0.5, system.width, system.height * 0.5);
        }

        ctx.restore();
    }
}
