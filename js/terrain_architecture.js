/**
 * @file terrain_architecture.js
 * @description Parallax procedural landscape with layered mountains, sky, clouds, and weather.
 * Mouse creates parallax effect. Seeds generate completely different terrain profiles,
 * time of day, weather, and visual style.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class TerrainArchitecture extends Architecture {
    constructor() {
        super();
        this.layers = [];
        this.clouds = [];
        this.stars = [];
        this.particles = [];
        this.timeOfDay = 0;
        this.skyColors = [];
        this.weatherType = 0;
        this.moonX = 0;
        this.moonY = 0;
        this.moonPhase = 0;
    }

    init(system) {
        const rng = system.rng;

        // Time of day (completely changes sky gradient)
        this.timeOfDay = Math.floor(rng() * 5);
        // 0 = night, 1 = dawn, 2 = day, 3 = sunset, 4 = twilight

        // Weather
        this.weatherType = Math.floor(rng() * 4);
        // 0 = clear, 1 = misty, 2 = stormy, 3 = aurora

        // Sky colors based on time
        switch (this.timeOfDay) {
            case 0: // Night
                this.skyColors = ['#0a0a2e', '#0d1b3e', '#0f0f30'];
                break;
            case 1: // Dawn
                this.skyColors = ['#1a0a2e', '#4a1942', '#ff6b35', '#ffd700'];
                break;
            case 2: // Day
                this.skyColors = ['#1a5276', '#2e86c1', '#85c1e9'];
                break;
            case 3: // Sunset
                this.skyColors = ['#1a0a2e', '#c0392b', '#e67e22', '#f9e79f'];
                break;
            case 4: // Twilight
                this.skyColors = ['#0a0a3e', '#2c1654', '#6c3483', '#af7ac5'];
                break;
        }

        // Moon/sun position
        this.moonX = 0.2 + rng() * 0.6;
        this.moonY = 0.1 + rng() * 0.2;
        this.moonPhase = rng(); // 0-1 for crescent

        // Generate terrain layers (back to front, each with increasing parallax)
        this.layers = [];
        const layerCount = 4 + Math.floor(rng() * 3);
        for (let i = 0; i < layerCount; i++) {
            const depth = i / layerCount; // 0 = far, 1 = near
            const baseY = system.height * (0.35 + depth * 0.15);
            const points = [];
            const resolution = 10;

            // Generate mountain profile using multiple octaves of pseudo-noise
            const freq1 = 0.002 + rng() * 0.004;
            const freq2 = 0.008 + rng() * 0.01;
            const amp1 = 60 + rng() * 100 * (1 - depth * 0.3);
            const amp2 = 15 + rng() * 30;
            const offset = rng() * 1000;

            for (let x = -50; x <= system.width + 50; x += resolution) {
                const y = baseY
                    - Math.abs(Math.sin((x + offset) * freq1)) * amp1
                    - Math.abs(Math.sin((x + offset * 2) * freq2)) * amp2
                    - Math.sin((x + offset) * freq1 * 3) * amp2 * 0.5;
                points.push({ x, y });
            }

            // Layer-specific hue shift
            const hueShift = this.timeOfDay === 0 ? 220 + rng() * 40
                : this.timeOfDay === 3 ? 10 + rng() * 30
                : system.hue + (rng() - 0.5) * 40;

            const lightness = this.timeOfDay === 0
                ? 5 + depth * 8
                : this.timeOfDay === 2
                    ? 20 + depth * 15
                    : 10 + depth * 12;

            this.layers.push({
                points,
                depth,
                parallaxFactor: 0.02 + depth * 0.04,
                hue: hueShift,
                saturation: 20 + rng() * 30,
                lightness: lightness,
                hasTreeline: depth > 0.5 && rng() > 0.4,
                treeSpacing: 15 + Math.floor(rng() * 20),
                treeHeight: 8 + rng() * 15,
                hasFog: depth > 0.3 && this.weatherType === 1
            });
        }

        // Stars (for night/twilight)
        this.stars = [];
        if (this.timeOfDay === 0 || this.timeOfDay === 4) {
            for (let i = 0; i < 200; i++) {
                this.stars.push({
                    x: rng() * system.width,
                    y: rng() * system.height * 0.5,
                    size: rng() * 1.5 + 0.3,
                    alpha: rng() * 0.6 + 0.2,
                    twinkle: rng() * Math.PI * 2,
                    speed: 0.02 + rng() * 0.04
                });
            }
        }

        // Clouds
        this.clouds = [];
        const cloudCount = this.weatherType === 2 ? 12 : (this.weatherType === 0 ? 5 : 8);
        for (let i = 0; i < cloudCount; i++) {
            const cy = system.height * (0.05 + rng() * 0.25);
            this.clouds.push({
                x: rng() * system.width * 1.5 - system.width * 0.25,
                y: cy,
                width: 80 + rng() * 200,
                height: 20 + rng() * 40,
                speed: 0.1 + rng() * 0.4,
                alpha: this.weatherType === 2 ? 0.4 + rng() * 0.3 : 0.1 + rng() * 0.15,
                puffs: Array.from({ length: 3 + Math.floor(rng() * 4) }, () => ({
                    xOff: (rng() - 0.5) * 100,
                    yOff: (rng() - 0.5) * 20,
                    radius: 20 + rng() * 40
                }))
            });
        }

        // Atmospheric particles (dust, fireflies for night, etc.)
        this.particles = [];
        const pCount = 30 + Math.floor(rng() * 40);
        for (let i = 0; i < pCount; i++) {
            this.particles.push({
                x: rng() * system.width,
                y: system.height * (0.3 + rng() * 0.6),
                vx: (rng() - 0.5) * 0.5,
                vy: (rng() - 0.5) * 0.3,
                size: 1 + rng() * 2,
                alpha: rng() * 0.3 + 0.1,
                phase: rng() * Math.PI * 2
            });
        }
    }

    update(system) {
        // Move clouds
        this.clouds.forEach(c => {
            c.x += c.speed * system.speedMultiplier;
            if (c.x > system.width + c.width) {
                c.x = -c.width * 1.5;
            }
        });

        // Atmospheric particles
        this.particles.forEach(p => {
            p.x += p.vx * system.speedMultiplier;
            p.y += Math.sin(system.tick * 0.01 + p.phase) * 0.2;
            if (p.x < -10) p.x = system.width + 10;
            else if (p.x > system.width + 10) p.x = -10;
        });
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const mx = (mouse.x - system.width / 2) * 0.02;
        const my = (mouse.y - system.height / 2) * 0.01;

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, system.height * 0.6);
        this.skyColors.forEach((color, i) => {
            skyGrad.addColorStop(i / (this.skyColors.length - 1), color);
        });
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, system.width, system.height * 0.6);

        // Stars
        if (this.stars.length > 0) {
            ctx.fillStyle = '#fff';
            this.stars.forEach(s => {
                const twinkle = Math.sin(tick * s.speed + s.twinkle) * 0.3 + 0.7;
                ctx.globalAlpha = s.alpha * twinkle;
                ctx.beginPath();
                ctx.arc(s.x - mx * 0.5, s.y - my * 0.5, s.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        // Moon/Sun
        const celestialX = system.width * this.moonX - mx;
        const celestialY = system.height * this.moonY - my;
        if (this.timeOfDay === 0 || this.timeOfDay === 4) {
            // Moon
            ctx.save();
            ctx.fillStyle = '#e8e8d0';
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 30, 0, Math.PI * 2);
            ctx.fill();
            // Moon glow
            const moonGlow = ctx.createRadialGradient(celestialX, celestialY, 25, celestialX, celestialY, 100);
            moonGlow.addColorStop(0, 'rgba(200, 200, 180, 0.15)');
            moonGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = moonGlow;
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 100, 0, Math.PI * 2);
            ctx.fill();
            // Phase shadow
            ctx.fillStyle = this.skyColors[0];
            ctx.beginPath();
            ctx.arc(celestialX + 15 * this.moonPhase, celestialY, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (this.timeOfDay === 2) {
            // Sun
            const sunGlow = ctx.createRadialGradient(celestialX, celestialY, 15, celestialX, celestialY, 120);
            sunGlow.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
            sunGlow.addColorStop(0.3, 'rgba(255, 220, 100, 0.2)');
            sunGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = sunGlow;
            ctx.beginPath();
            ctx.arc(celestialX, celestialY, 120, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.timeOfDay === 3) {
            // Setting sun
            const sunGlow = ctx.createRadialGradient(celestialX, celestialY + 30, 20, celestialX, celestialY + 30, 200);
            sunGlow.addColorStop(0, 'rgba(255, 100, 50, 0.6)');
            sunGlow.addColorStop(0.4, 'rgba(255, 150, 50, 0.15)');
            sunGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = sunGlow;
            ctx.beginPath();
            ctx.arc(celestialX, celestialY + 30, 200, 0, Math.PI * 2);
            ctx.fill();
        }

        // Aurora (weather type 3, night only)
        if (this.weatherType === 3 && (this.timeOfDay === 0 || this.timeOfDay === 4)) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const auroraHues = [120, 160, 280];
            for (let band = 0; band < 3; band++) {
                ctx.fillStyle = `hsla(${auroraHues[band]}, 80%, 40%, 0.06)`;
                ctx.beginPath();
                ctx.moveTo(0, system.height);
                const bandY = system.height * (0.15 + band * 0.08);
                for (let x = 0; x <= system.width; x += 30) {
                    const y = bandY + Math.sin(x * 0.003 + tick * 0.003 + band * 5) * 40
                        + Math.sin(x * 0.007 + tick * 0.005) * 20;
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(system.width, system.height);
                ctx.fill();
            }
            ctx.restore();
        }

        // Clouds
        this.clouds.forEach(c => {
            ctx.save();
            ctx.globalAlpha = c.alpha;
            const cloudColor = this.timeOfDay === 0 ? 'rgba(30, 30, 60,'
                : this.timeOfDay === 3 ? 'rgba(200, 120, 60,'
                : this.timeOfDay === 2 ? 'rgba(255, 255, 255,'
                : 'rgba(100, 80, 120,';
            c.puffs.forEach(puff => {
                const px = c.x + puff.xOff - mx * 0.8;
                const py = c.y + puff.yOff - my * 0.5;
                const grad = ctx.createRadialGradient(px, py, 0, px, py, puff.radius);
                grad.addColorStop(0, cloudColor + '0.8)');
                grad.addColorStop(1, cloudColor + '0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, puff.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        });

        // Terrain layers (back to front)
        this.layers.forEach(layer => {
            const offsetX = mx * layer.parallaxFactor * 20;
            const offsetY = my * layer.parallaxFactor * 10;

            // Mountain silhouette
            ctx.fillStyle = `hsl(${layer.hue}, ${layer.saturation}%, ${layer.lightness}%)`;
            ctx.beginPath();
            ctx.moveTo(-50, system.height);
            layer.points.forEach(p => {
                ctx.lineTo(p.x - offsetX, p.y - offsetY);
            });
            ctx.lineTo(system.width + 50, system.height);
            ctx.closePath();
            ctx.fill();

            // Treeline on near layers
            if (layer.hasTreeline) {
                ctx.fillStyle = `hsl(${layer.hue}, ${layer.saturation + 5}%, ${Math.max(3, layer.lightness - 3)}%)`;
                layer.points.forEach((p, idx) => {
                    if (idx % layer.treeSpacing === 0) {
                        const tx = p.x - offsetX;
                        const ty = p.y - offsetY;
                        // Simple triangle tree
                        ctx.beginPath();
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx - 4, ty + layer.treeHeight);
                        ctx.lineTo(tx + 4, ty + layer.treeHeight);
                        ctx.closePath();
                        ctx.fill();
                    }
                });
            }

            // Fog between layers
            if (layer.hasFog) {
                const fogGrad = ctx.createLinearGradient(0, layer.points[0].y - 30, 0, layer.points[0].y + 50);
                fogGrad.addColorStop(0, 'transparent');
                fogGrad.addColorStop(0.5, `hsla(${layer.hue}, 10%, ${layer.lightness + 10}%, 0.15)`);
                fogGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = fogGrad;
                ctx.fillRect(0, layer.points[0].y - 30 - offsetY, system.width, 80);
            }
        });

        // Atmospheric particles
        ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha * (Math.sin(tick * 0.02 + p.phase) * 0.3 + 0.7);
            const hue = this.timeOfDay === 0 ? 50 : system.hue;
            ctx.fillStyle = `hsla(${hue}, 50%, 70%, 0.5)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }
}
