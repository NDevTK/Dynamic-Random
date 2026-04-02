/**
 * @file glitch_city_architecture.js
 * @description Procedural cyberpunk cityscape with neon signs, flying vehicles,
 * rain, and lightning. Each seed generates a completely different city style:
 * noir retrofuture, alien megastructure, underwater dome city, floating sky islands,
 * or brutalist dystopia. Mouse position shifts the parallax perspective. Click
 * triggers lightning strikes that illuminate the whole skyline. Buildings pulse
 * with holographic advertisements and digital noise.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class GlitchCityArchitecture extends Architecture {
    constructor() {
        super();
        this.buildings = [];
        this.backgroundBuildings = [];
        this.neonSigns = [];
        this.vehicles = [];
        this.raindrops = [];
        this.lightning = [];
        this.cityStyle = 0;
        this.palette = null;
        this.rainIntensity = 0;
        this.fogDensity = 0;
        this.parallaxStrength = 0;
        this.tick = 0;
        this.skyGradient = null;
        this.horizonY = 0;
        this.buildingGlitch = 0;
        this.holograms = [];
        this.stars = [];
    }

    init(system) {
        const rng = system.rng;
        const w = system.width, h = system.height;

        // City style determines the entire aesthetic
        this.cityStyle = Math.floor(rng() * 6);
        // 0=cyberpunk neon, 1=noir retrofuture, 2=alien megastructure,
        // 3=underwater dome, 4=sky islands, 5=brutalist dystopia

        this.rainIntensity = this.cityStyle === 3 ? 0 : (0.2 + rng() * 0.8);
        this.fogDensity = 0.1 + rng() * 0.4;
        this.parallaxStrength = 15 + rng() * 30;
        this.horizonY = h * (0.55 + rng() * 0.15);
        this.buildingGlitch = 0;

        const palettes = [
            // Cyberpunk neon
            { sky: [[10,5,30],[30,10,50]], buildings: [20,25,35], windows: [[255,0,100],[0,255,200],[255,200,0]],
              neon: [[255,0,150],[0,255,255],[255,100,0]], fog: [100,0,150], rain: [150,180,255] },
            // Noir retrofuture
            { sky: [[15,15,20],[30,25,35]], buildings: [25,25,30], windows: [[255,200,100],[200,180,150],[255,255,200]],
              neon: [[255,200,50],[200,150,100],[255,100,50]], fog: [80,70,60], rain: [180,170,160] },
            // Alien megastructure
            { sky: [[5,20,15],[10,40,30]], buildings: [15,35,25], windows: [[0,255,100],[100,255,200],[200,255,150]],
              neon: [[0,255,80],[100,255,0],[0,200,150]], fog: [0,100,80], rain: [100,255,200] },
            // Underwater dome
            { sky: [[5,15,40],[10,30,60]], buildings: [15,25,45], windows: [[50,200,255],[100,255,255],[150,200,255]],
              neon: [[0,180,255],[50,255,200],[100,150,255]], fog: [20,60,120], rain: [100,180,255] },
            // Sky islands
            { sky: [[40,20,60],[80,40,100]], buildings: [50,40,60], windows: [[255,200,255],[200,150,255],[255,150,200]],
              neon: [[255,100,255],[200,50,255],[255,200,100]], fog: [120,80,160], rain: [200,180,255] },
            // Brutalist dystopia
            { sky: [[20,15,15],[40,30,25]], buildings: [35,30,28], windows: [[255,80,30],[200,50,20],[255,150,50]],
              neon: [[255,50,0],[200,100,0],[255,200,0]], fog: [100,60,40], rain: [160,140,120] },
        ];
        this.palette = palettes[this.cityStyle];

        // Generate background buildings (far layer)
        this.backgroundBuildings = [];
        const bgCount = 30 + Math.floor(rng() * 20);
        for (let i = 0; i < bgCount; i++) {
            const bw = 20 + rng() * 60;
            const bh = 60 + rng() * 200;
            this.backgroundBuildings.push({
                x: (i / bgCount) * w * 1.3 - w * 0.15 + (rng() - 0.5) * 30,
                width: bw,
                height: bh,
                windows: Math.floor(bh / 15),
                windowCols: Math.max(1, Math.floor(bw / 12)),
                parallaxLayer: 0.3
            });
        }

        // Generate foreground buildings
        this.buildings = [];
        const fgCount = 15 + Math.floor(rng() * 15);
        for (let i = 0; i < fgCount; i++) {
            const bw = 40 + rng() * 120;
            const bh = 100 + rng() * 350;
            const hasAntenna = rng() > 0.6;
            const hasNeon = rng() > 0.4;
            const roofStyle = Math.floor(rng() * 4); // 0=flat, 1=pointed, 2=stepped, 3=dome

            this.buildings.push({
                x: (i / fgCount) * w * 1.2 - w * 0.1 + (rng() - 0.5) * 40,
                width: bw,
                height: bh,
                windows: Math.floor(bh / 18),
                windowCols: Math.max(1, Math.floor(bw / 15)),
                hasAntenna,
                antennaHeight: 10 + rng() * 40,
                hasNeon,
                neonColor: this.palette.neon[Math.floor(rng() * this.palette.neon.length)],
                neonPhase: rng() * Math.PI * 2,
                neonSpeed: 0.02 + rng() * 0.05,
                roofStyle,
                parallaxLayer: 0.7 + rng() * 0.3,
                windowFlickerSeed: rng() * 1000,
                glitchOffset: 0
            });
        }

        // Generate neon signs
        this.neonSigns = [];
        const signCount = 5 + Math.floor(rng() * 10);
        for (let i = 0; i < signCount; i++) {
            const building = this.buildings[Math.floor(rng() * this.buildings.length)];
            this.neonSigns.push({
                x: building.x + rng() * building.width,
                y: this.horizonY - building.height * (0.3 + rng() * 0.5),
                width: 15 + rng() * 40,
                height: 8 + rng() * 20,
                color: this.palette.neon[Math.floor(rng() * this.palette.neon.length)],
                flickerPhase: rng() * Math.PI * 2,
                flickerSpeed: 0.03 + rng() * 0.1,
                on: true,
                buzzing: rng() > 0.7
            });
        }

        // Flying vehicles
        this.vehicles = [];
        const vehicleCount = 8 + Math.floor(rng() * 12);
        for (let i = 0; i < vehicleCount; i++) {
            this.vehicles.push({
                x: rng() * w,
                y: this.horizonY - 50 - rng() * 300,
                speed: 0.5 + rng() * 2,
                direction: rng() > 0.5 ? 1 : -1,
                size: 2 + rng() * 4,
                color: this.palette.neon[Math.floor(rng() * this.palette.neon.length)],
                trail: [],
                wobble: rng() * Math.PI * 2,
                layer: 0.4 + rng() * 0.6
            });
        }

        // Initialize rain
        this.raindrops = [];
        const rainCount = Math.floor(this.rainIntensity * 200);
        for (let i = 0; i < rainCount; i++) {
            this.raindrops.push({
                x: rng() * w,
                y: rng() * h,
                speed: 4 + rng() * 8,
                length: 5 + rng() * 15,
                alpha: 0.1 + rng() * 0.3
            });
        }

        // Stars (visible through gaps)
        this.stars = [];
        if (this.cityStyle !== 3) { // no stars underwater
            for (let i = 0; i < 100; i++) {
                this.stars.push({
                    x: rng() * w,
                    y: rng() * this.horizonY * 0.7,
                    size: 0.5 + rng() * 1.5,
                    twinkle: rng() * Math.PI * 2
                });
            }
        }

        // Holograms
        this.holograms = [];
        const holoCount = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < holoCount; i++) {
            this.holograms.push({
                x: rng() * w,
                y: this.horizonY - 200 - rng() * 200,
                width: 40 + rng() * 80,
                height: 60 + rng() * 100,
                color: this.palette.neon[Math.floor(rng() * this.palette.neon.length)],
                scanlineOffset: 0,
                glitchTimer: 0,
                alpha: 0.3 + rng() * 0.3,
                parallaxLayer: 0.6 + rng() * 0.3
            });
        }

        this.lightning = [];
        this.tick = 0;
    }

    update(system) {
        this.tick++;
        const w = system.width, h = system.height;

        // Update rain
        for (const drop of this.raindrops) {
            drop.y += drop.speed;
            drop.x += (mouse.x - w / 2) * 0.001; // slight wind from mouse
            if (drop.y > h) {
                drop.y = -drop.length;
                drop.x = Math.random() * w;
            }
        }

        // Update vehicles
        for (const v of this.vehicles) {
            v.x += v.speed * v.direction;
            v.wobble += 0.02;
            v.y += Math.sin(v.wobble) * 0.3;

            // Trail
            v.trail.push({ x: v.x, y: v.y, alpha: 0.5 });
            if (v.trail.length > 12) v.trail.shift();
            for (const t of v.trail) t.alpha *= 0.9;

            // Wrap
            if (v.x > w + 50) v.x = -50;
            if (v.x < -50) v.x = w + 50;
        }

        // Update neon signs
        for (const sign of this.neonSigns) {
            sign.flickerPhase += sign.flickerSpeed;
            if (sign.buzzing && Math.random() < 0.05) {
                sign.on = !sign.on;
            }
        }

        // Update holograms
        for (const holo of this.holograms) {
            holo.scanlineOffset = (holo.scanlineOffset + 1) % holo.height;
            holo.glitchTimer--;
            if (holo.glitchTimer <= 0 && Math.random() < 0.01) {
                holo.glitchTimer = 5 + Math.floor(Math.random() * 10);
            }
        }

        // Decay lightning
        for (let i = this.lightning.length - 1; i >= 0; i--) {
            this.lightning[i].alpha -= 0.04;
            if (this.lightning[i].alpha <= 0) {
                this.lightning.splice(i, 1);
            }
        }

        // Random ambient lightning
        if (this.rainIntensity > 0.5 && Math.random() < 0.003) {
            this._createLightning(Math.random() * w, 0, system);
        }

        // Building glitch effect
        if (Math.random() < 0.02) {
            this.buildingGlitch = 3 + Math.floor(Math.random() * 5);
        }
        if (this.buildingGlitch > 0) this.buildingGlitch--;
    }

    _createLightning(x, y, system) {
        const segments = [];
        let cx = x, cy = y;
        const targetY = this.horizonY;
        while (cy < targetY) {
            const nx = cx + (Math.random() - 0.5) * 60;
            const ny = cy + 10 + Math.random() * 30;
            segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });

            // Branch
            if (Math.random() < 0.3) {
                const bx = nx + (Math.random() - 0.5) * 80;
                const by = ny + 20 + Math.random() * 40;
                segments.push({ x1: nx, y1: ny, x2: bx, y2: by });
            }
            cx = nx; cy = ny;
        }
        this.lightning.push({ segments, alpha: 1 });
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width, h = system.height;
        const px = (mouse.x - w / 2) / w * this.parallaxStrength;
        const py = (mouse.y - h / 2) / h * this.parallaxStrength * 0.3;
        const pal = this.palette;

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
        skyGrad.addColorStop(0, `rgb(${pal.sky[0].join(',')})`);
        skyGrad.addColorStop(1, `rgb(${pal.sky[1].join(',')})`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, this.horizonY + 50);

        // Stars
        for (const star of this.stars) {
            star.twinkle += 0.02;
            const a = (Math.sin(star.twinkle) + 1) * 0.3 + 0.2;
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.beginPath();
            ctx.arc(star.x + px * 0.1, star.y + py * 0.1, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Background buildings (far layer)
        const bgColor = pal.buildings;
        for (const b of this.backgroundBuildings) {
            const bx = b.x + px * b.parallaxLayer;
            const by = this.horizonY - b.height + py * b.parallaxLayer;
            ctx.fillStyle = `rgba(${bgColor[0]-10},${bgColor[1]-10},${bgColor[2]-10}, 0.6)`;
            ctx.fillRect(bx, by, b.width, b.height + 50);

            // Distant windows
            const wc = pal.windows[0];
            for (let row = 0; row < b.windows; row++) {
                for (let col = 0; col < b.windowCols; col++) {
                    if (Math.sin(row * 7.3 + col * 13.1 + this.tick * 0.01) > 0.3) {
                        ctx.fillStyle = `rgba(${wc.join(',')}, 0.15)`;
                        ctx.fillRect(bx + 3 + col * 12, by + 3 + row * 15, 6, 8);
                    }
                }
            }
        }

        // Fog layer between background and foreground
        const fogGrad = ctx.createLinearGradient(0, this.horizonY - 200, 0, this.horizonY);
        fogGrad.addColorStop(0, 'transparent');
        fogGrad.addColorStop(1, `rgba(${pal.fog.join(',')}, ${this.fogDensity})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, w, this.horizonY + 50);

        // Foreground buildings
        for (const b of this.buildings) {
            const bx = b.x + px * b.parallaxLayer;
            const by = this.horizonY - b.height + py * b.parallaxLayer;
            const glitchOff = this.buildingGlitch > 0 ? (Math.random() - 0.5) * 4 : 0;

            // Building body
            ctx.fillStyle = `rgb(${bgColor.join(',')})`;
            ctx.fillRect(bx + glitchOff, by, b.width, b.height + 50);

            // Building edge highlight
            ctx.fillStyle = `rgba(255,255,255,0.03)`;
            ctx.fillRect(bx + glitchOff, by, 2, b.height + 50);

            // Roof style
            if (b.roofStyle === 1) {
                ctx.beginPath();
                ctx.moveTo(bx + glitchOff, by);
                ctx.lineTo(bx + glitchOff + b.width / 2, by - 20);
                ctx.lineTo(bx + glitchOff + b.width, by);
                ctx.fillStyle = `rgb(${bgColor[0]+5},${bgColor[1]+5},${bgColor[2]+5})`;
                ctx.fill();
            } else if (b.roofStyle === 3) {
                ctx.beginPath();
                ctx.arc(bx + glitchOff + b.width / 2, by, b.width / 2, Math.PI, 0);
                ctx.fillStyle = `rgb(${bgColor[0]+3},${bgColor[1]+3},${bgColor[2]+3})`;
                ctx.fill();
            }

            // Windows with flicker
            for (let row = 0; row < b.windows; row++) {
                for (let col = 0; col < b.windowCols; col++) {
                    const hash = Math.sin(b.windowFlickerSeed + row * 17.3 + col * 31.7 + Math.floor(this.tick * 0.005) * 3.1);
                    if (hash > -0.2) {
                        const wc = pal.windows[Math.abs(Math.floor(hash * 10)) % pal.windows.length];
                        const a = 0.1 + (hash + 0.2) * 0.4;
                        ctx.fillStyle = `rgba(${wc.join(',')}, ${a})`;
                        ctx.fillRect(bx + 5 + col * 15 + glitchOff, by + 5 + row * 18, 8, 10);
                    }
                }
            }

            // Antenna
            if (b.hasAntenna) {
                ctx.strokeStyle = `rgba(255,255,255,0.3)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(bx + b.width / 2 + glitchOff, by);
                ctx.lineTo(bx + b.width / 2 + glitchOff, by - b.antennaHeight);
                ctx.stroke();
                // Blinking light
                if (Math.sin(this.tick * 0.05) > 0) {
                    ctx.fillStyle = 'rgba(255,0,0,0.8)';
                    ctx.beginPath();
                    ctx.arc(bx + b.width / 2 + glitchOff, by - b.antennaHeight, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Neon edge on building
            if (b.hasNeon) {
                const neonAlpha = (Math.sin(b.neonPhase + this.tick * b.neonSpeed) + 1) * 0.3 + 0.2;
                ctx.strokeStyle = `rgba(${b.neonColor.join(',')}, ${neonAlpha})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(bx + glitchOff + 2, by + 2, b.width - 4, 30);

                // Glow
                ctx.shadowColor = `rgba(${b.neonColor.join(',')}, ${neonAlpha})`;
                ctx.shadowBlur = 15;
                ctx.strokeRect(bx + glitchOff + 2, by + 2, b.width - 4, 30);
                ctx.shadowBlur = 0;
            }
        }

        // Holograms
        ctx.globalCompositeOperation = 'lighter';
        for (const holo of this.holograms) {
            const hx = holo.x + px * holo.parallaxLayer;
            const hy = holo.y + py * holo.parallaxLayer;
            const isGlitching = holo.glitchTimer > 0;

            ctx.save();
            ctx.globalAlpha = holo.alpha * (isGlitching ? (Math.random() * 0.5 + 0.5) : 1);

            // Hologram body
            ctx.fillStyle = `rgba(${holo.color.join(',')}, 0.1)`;
            ctx.fillRect(hx + (isGlitching ? (Math.random()-0.5)*10 : 0), hy, holo.width, holo.height);

            // Scanlines
            ctx.fillStyle = `rgba(${holo.color.join(',')}, 0.15)`;
            for (let s = holo.scanlineOffset % 4; s < holo.height; s += 4) {
                ctx.fillRect(hx, hy + s, holo.width, 1);
            }

            // Border
            ctx.strokeStyle = `rgba(${holo.color.join(',')}, 0.3)`;
            ctx.lineWidth = 1;
            ctx.strokeRect(hx, hy, holo.width, holo.height);

            ctx.restore();
        }

        // Neon signs
        for (const sign of this.neonSigns) {
            if (!sign.on) continue;
            const sx = sign.x + px * 0.8;
            const sy = sign.y + py * 0.8;
            const flicker = (Math.sin(sign.flickerPhase) + 1) * 0.5;
            const a = 0.3 + flicker * 0.5;

            ctx.fillStyle = `rgba(${sign.color.join(',')}, ${a})`;
            ctx.fillRect(sx, sy, sign.width, sign.height);

            // Glow
            ctx.shadowColor = `rgba(${sign.color.join(',')}, ${a})`;
            ctx.shadowBlur = 20;
            ctx.fillRect(sx, sy, sign.width, sign.height);
            ctx.shadowBlur = 0;
        }

        // Vehicle trails
        for (const v of this.vehicles) {
            const vx = v.x + px * v.layer;
            const vy = v.y + py * v.layer;
            // Trail
            for (const t of v.trail) {
                ctx.fillStyle = `rgba(${v.color.join(',')}, ${t.alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(t.x + px * v.layer, t.y + py * v.layer, v.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            // Vehicle
            ctx.fillStyle = `rgba(${v.color.join(',')}, 0.9)`;
            ctx.beginPath();
            ctx.arc(vx, vy, v.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Lightning
        for (const bolt of this.lightning) {
            ctx.strokeStyle = `rgba(255,255,255,${bolt.alpha})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = `rgba(200,200,255,${bolt.alpha})`;
            ctx.shadowBlur = 20;
            for (const seg of bolt.segments) {
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // Flash
            if (bolt.alpha > 0.7) {
                ctx.fillStyle = `rgba(200,200,255,${(bolt.alpha - 0.7) * 0.15})`;
                ctx.fillRect(0, 0, w, h);
            }
        }

        // Rain
        if (this.rainIntensity > 0) {
            ctx.strokeStyle = `rgba(${pal.rain.join(',')}, 0.3)`;
            ctx.lineWidth = 1;
            for (const drop of this.raindrops) {
                ctx.beginPath();
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x + 1, drop.y + drop.length);
                ctx.stroke();
            }
        }

        // Ground fog
        const gfGrad = ctx.createLinearGradient(0, this.horizonY - 30, 0, this.horizonY + 30);
        gfGrad.addColorStop(0, 'transparent');
        gfGrad.addColorStop(0.5, `rgba(${pal.fog.join(',')}, ${this.fogDensity * 0.6})`);
        gfGrad.addColorStop(1, `rgba(${pal.fog.join(',')}, ${this.fogDensity * 0.3})`);
        ctx.fillStyle = gfGrad;
        ctx.fillRect(0, this.horizonY - 30, w, 60);
    }

    onShockwave(x, y) {
        this._createLightning(x, 0, { width: 0, height: 0 });
        this.buildingGlitch = 8;
    }
}
