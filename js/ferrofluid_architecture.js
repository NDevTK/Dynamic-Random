/**
 * @file ferrofluid_architecture.js
 * @description Ferrofluid / magnetic sand simulation. Thousands of tiny magnetic
 * particles form dramatic spiky formations around the cursor like real ferrofluid.
 * Different seeds produce wildly different behaviors: viscosity, spike sharpness,
 * particle count, color palette (mercury silver, oil-black iridescent, neon plasma,
 * molten gold), and magnetic field strength. Clicking creates magnetic poles that
 * attract/repel. Right-click creates repulsion zones.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class FerrofluidArchitecture extends Architecture {
    constructor() {
        super();
        this.particles = [];
        this.poles = [];
        this.ripples = [];
        this.viscosity = 0;
        this.spikeSharpness = 0;
        this.magneticStrength = 0;
        this.colorMode = 0;
        this.palette = null;
        this.baseFormation = 0;
        this.surfaceTension = 0;
        this.noiseScale = 0;
        this.noiseSpeed = 0;
        this.tick = 0;
        this.trailCanvas = null;
        this.trailCtx = null;
        this.iridescenceSpeed = 0;
        this.blobCount = 0;
        this.blobs = [];
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven behavior parameters
        this.viscosity = 0.85 + rng() * 0.12;        // how quickly particles slow down
        this.spikeSharpness = 2 + rng() * 8;          // how pointy spikes get
        this.magneticStrength = 80 + rng() * 200;     // force of cursor magnet
        this.surfaceTension = 0.02 + rng() * 0.06;    // how much particles clump
        this.noiseScale = 0.003 + rng() * 0.008;      // turbulence frequency
        this.noiseSpeed = 0.005 + rng() * 0.02;       // turbulence animation speed
        this.iridescenceSpeed = 0.5 + rng() * 2;      // color shimmer speed
        this.baseFormation = Math.floor(rng() * 5);    // idle formation pattern

        // Dramatically different color palettes per seed
        const palettes = [
            // Mercury silver
            { base: [160, 170, 185], highlight: [220, 230, 245], shadow: [40, 45, 55],
              glow: 'rgba(180,195,220,', iridescent: false, name: 'mercury' },
            // Oil-slick iridescent
            { base: [20, 20, 30], highlight: [60, 40, 80], shadow: [5, 5, 10],
              glow: 'rgba(100,60,180,', iridescent: true, name: 'oil' },
            // Neon plasma
            { base: [0, 255, 180], highlight: [100, 255, 255], shadow: [0, 80, 60],
              glow: 'rgba(0,255,200,', iridescent: false, name: 'neon' },
            // Molten gold
            { base: [220, 170, 50], highlight: [255, 220, 100], shadow: [120, 70, 10],
              glow: 'rgba(255,200,60,', iridescent: false, name: 'gold' },
            // Blood red
            { base: [180, 20, 30], highlight: [255, 60, 40], shadow: [60, 5, 10],
              glow: 'rgba(255,40,30,', iridescent: false, name: 'blood' },
            // Bioluminescent blue
            { base: [10, 40, 120], highlight: [30, 120, 255], shadow: [5, 10, 40],
              glow: 'rgba(30,100,255,', iridescent: true, name: 'bio' },
            // Void purple
            { base: [80, 10, 120], highlight: [180, 50, 255], shadow: [20, 5, 40],
              glow: 'rgba(150,30,255,', iridescent: true, name: 'void' },
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)];
        this.colorMode = Math.floor(rng() * 3); // 0=solid, 1=gradient by speed, 2=gradient by distance

        // Generate particles
        const count = 600 + Math.floor(rng() * 400);
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: 0,
                vy: 0,
                size: 1.5 + rng() * 2.5,
                phase: rng() * Math.PI * 2,
                mass: 0.5 + rng() * 1.5
            });
        }

        // Generate ambient blobs (large slow-moving ferrofluid masses)
        this.blobCount = 3 + Math.floor(rng() * 5);
        this.blobs = [];
        for (let i = 0; i < this.blobCount; i++) {
            this.blobs.push({
                x: rng() * system.width,
                y: rng() * system.height,
                targetX: rng() * system.width,
                targetY: rng() * system.height,
                radius: 30 + rng() * 60,
                spikeCount: 5 + Math.floor(rng() * 12),
                spikePhase: rng() * Math.PI * 2,
                spikeSpeed: 0.01 + rng() * 0.03,
                rotationSpeed: (rng() - 0.5) * 0.02,
                rotation: rng() * Math.PI * 2,
                moveTimer: 0,
                moveInterval: 200 + Math.floor(rng() * 300)
            });
        }

        // Trail canvas for persistence effect
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = system.width;
        this.trailCanvas.height = system.height;
        this.trailCtx = this.trailCanvas.getContext('2d');

        this.poles = [];
        this.ripples = [];
        this.tick = 0;
    }

    _simplex2D(x, y) {
        // Simple hash-based noise approximation
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1;
    }

    _fbm(x, y, octaves) {
        let value = 0, amplitude = 0.5;
        for (let i = 0; i < octaves; i++) {
            value += amplitude * this._simplex2D(x, y);
            x *= 2; y *= 2; amplitude *= 0.5;
        }
        return value;
    }

    update(system) {
        this.tick++;
        const mx = mouse.x, my = mouse.y;
        const w = system.width, h = system.height;
        const t = this.tick * this.noiseSpeed;

        // Decay poles
        for (let i = this.poles.length - 1; i >= 0; i--) {
            this.poles[i].life -= 0.008;
            if (this.poles[i].life <= 0) {
                this.poles.splice(i, 1);
            }
        }

        // Decay ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            this.ripples[i].radius += 3;
            this.ripples[i].alpha -= 0.015;
            if (this.ripples[i].alpha <= 0) {
                this.ripples.splice(i, 1);
            }
        }

        // Update blobs
        for (const blob of this.blobs) {
            blob.moveTimer++;
            if (blob.moveTimer > blob.moveInterval) {
                blob.moveTimer = 0;
                blob.targetX = Math.random() * w;
                blob.targetY = Math.random() * h;
            }
            blob.x += (blob.targetX - blob.x) * 0.005;
            blob.y += (blob.targetY - blob.y) * 0.005;
            blob.rotation += blob.rotationSpeed;
            blob.spikePhase += blob.spikeSpeed;

            // Blobs are attracted to cursor
            const bdx = mx - blob.x, bdy = my - blob.y;
            const bdist = Math.sqrt(bdx * bdx + bdy * bdy) + 1;
            if (bdist < 400) {
                const force = (400 - bdist) * 0.0003;
                blob.x += bdx * force;
                blob.y += bdy * force;
            }
        }

        // Update particles
        for (const p of this.particles) {
            // Noise-based turbulence
            const nx = this._fbm(p.x * this.noiseScale + t, p.y * this.noiseScale, 2);
            const ny = this._fbm(p.x * this.noiseScale, p.y * this.noiseScale + t, 2);
            p.vx += nx * 0.3;
            p.vy += ny * 0.3;

            // Cursor magnetic attraction
            const dx = mx - p.x, dy = my - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            if (dist < 350) {
                const force = this.magneticStrength / (dist * dist) * p.mass;
                // Create spike-like formations: particles closer to cursor get pulled harder
                const spikeForce = Math.pow(Math.max(0, 1 - dist / 350), this.spikeSharpness);
                p.vx += dx / dist * (force + spikeForce * 2);
                p.vy += dy / dist * (force + spikeForce * 2);
            }

            // Pole attraction/repulsion
            for (const pole of this.poles) {
                const pdx = pole.x - p.x, pdy = pole.y - p.y;
                const pdist = Math.sqrt(pdx * pdx + pdy * pdy) + 1;
                if (pdist < 200) {
                    const pf = pole.strength * pole.life / (pdist * pdist) * 40;
                    p.vx += pdx / pdist * pf;
                    p.vy += pdy / pdist * pf;
                }
            }

            // Blob attraction (particles cluster around blobs)
            for (const blob of this.blobs) {
                const bx = blob.x - p.x, by = blob.y - p.y;
                const bd = Math.sqrt(bx * bx + by * by) + 1;
                if (bd < blob.radius * 3) {
                    const bf = this.surfaceTension * blob.radius / bd;
                    p.vx += bx / bd * bf;
                    p.vy += by / bd * bf;
                }
            }

            // Idle formation pattern
            if (dist > 400) {
                p.phase += 0.01;
                let formX = 0, formY = 0;
                if (this.baseFormation === 0) {
                    // Circular orbit
                    formX = Math.cos(p.phase) * 0.1;
                    formY = Math.sin(p.phase) * 0.1;
                } else if (this.baseFormation === 1) {
                    // Gentle drift downward (gravity)
                    formY = 0.05;
                } else if (this.baseFormation === 2) {
                    // Spiral inward to center
                    const cx = w / 2 - p.x, cy = h / 2 - p.y;
                    formX = cx * 0.0002 + Math.cos(p.phase) * 0.05;
                    formY = cy * 0.0002 + Math.sin(p.phase) * 0.05;
                } else if (this.baseFormation === 3) {
                    // Figure-8 pattern
                    formX = Math.sin(p.phase * 2) * 0.15;
                    formY = Math.sin(p.phase) * 0.1;
                } else {
                    // Random walk
                    formX = (Math.random() - 0.5) * 0.2;
                    formY = (Math.random() - 0.5) * 0.2;
                }
                p.vx += formX;
                p.vy += formY;
            }

            // Apply velocity with viscosity damping
            p.vx *= this.viscosity;
            p.vy *= this.viscosity;
            p.x += p.vx;
            p.y += p.vy;

            // Soft boundary wrap
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const t = this.tick;
        const mx = mouse.x, my = mouse.y;

        // Draw persistent trail layer (slow fade for ghostly trail)
        this.trailCtx.globalAlpha = 0.08;
        this.trailCtx.fillStyle = '#000';
        this.trailCtx.fillRect(0, 0, system.width, system.height);
        this.trailCtx.globalAlpha = 1;

        // Draw blobs onto trail canvas
        for (const blob of this.blobs) {
            this.trailCtx.save();
            this.trailCtx.translate(blob.x, blob.y);
            this.trailCtx.rotate(blob.rotation);

            const pal = this.palette;
            const grad = this.trailCtx.createRadialGradient(0, 0, 0, 0, 0, blob.radius);
            grad.addColorStop(0, `rgba(${pal.highlight.join(',')}, 0.4)`);
            grad.addColorStop(0.6, `rgba(${pal.base.join(',')}, 0.2)`);
            grad.addColorStop(1, 'transparent');

            // Draw spiky blob shape
            this.trailCtx.beginPath();
            const steps = blob.spikeCount * 2;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const spikeOff = Math.sin(angle * blob.spikeCount + blob.spikePhase) * 0.4 + 0.6;
                const r = blob.radius * spikeOff;
                if (i === 0) this.trailCtx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else this.trailCtx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            this.trailCtx.closePath();
            this.trailCtx.fillStyle = grad;
            this.trailCtx.fill();
            this.trailCtx.restore();
        }

        // Composite trail
        ctx.globalAlpha = 0.6;
        ctx.drawImage(this.trailCanvas, 0, 0);
        ctx.globalAlpha = 1;

        // Draw ripples
        for (const ripple of this.ripples) {
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `${this.palette.glow}${ripple.alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw cursor magnetic field indicator
        const fieldRadius = 350;
        const fieldGrad = ctx.createRadialGradient(mx, my, 0, mx, my, fieldRadius);
        fieldGrad.addColorStop(0, `${this.palette.glow}0.08)`);
        fieldGrad.addColorStop(0.5, `${this.palette.glow}0.03)`);
        fieldGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fieldGrad;
        ctx.beginPath();
        ctx.arc(mx, my, fieldRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw particles
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const dx = mx - p.x, dy = my - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const pal = this.palette;

            let r, g, b, alpha;
            if (this.colorMode === 0) {
                // Solid with speed glow
                const glow = Math.min(1, speed * 0.15);
                r = pal.base[0] + (pal.highlight[0] - pal.base[0]) * glow;
                g = pal.base[1] + (pal.highlight[1] - pal.base[1]) * glow;
                b = pal.base[2] + (pal.highlight[2] - pal.base[2]) * glow;
                alpha = 0.5 + glow * 0.5;
            } else if (this.colorMode === 1) {
                // Speed-based color shift
                const spd = Math.min(1, speed * 0.1);
                r = pal.shadow[0] + (pal.highlight[0] - pal.shadow[0]) * spd;
                g = pal.shadow[1] + (pal.highlight[1] - pal.shadow[1]) * spd;
                b = pal.shadow[2] + (pal.highlight[2] - pal.shadow[2]) * spd;
                alpha = 0.4 + spd * 0.6;
            } else {
                // Distance-from-cursor gradient
                const d = Math.min(1, dist / 400);
                r = pal.highlight[0] + (pal.shadow[0] - pal.highlight[0]) * d;
                g = pal.highlight[1] + (pal.shadow[1] - pal.highlight[1]) * d;
                b = pal.highlight[2] + (pal.shadow[2] - pal.highlight[2]) * d;
                alpha = 1 - d * 0.6;
            }

            // Iridescent shimmer for oil-slick and bio palettes
            if (pal.iridescent) {
                const shimmer = Math.sin(t * 0.02 * this.iridescenceSpeed + p.phase + dist * 0.01);
                r += shimmer * 60;
                g += shimmer * 40 + Math.cos(t * 0.015 + p.phase) * 50;
                b += Math.sin(t * 0.025 + p.phase * 1.5) * 60;
            }

            r = Math.max(0, Math.min(255, r)) | 0;
            g = Math.max(0, Math.min(255, g)) | 0;
            b = Math.max(0, Math.min(255, b)) | 0;

            const size = p.size * (1 + Math.min(speed * 0.08, 1.5));
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw pole markers
        for (const pole of this.poles) {
            const pa = pole.life * 0.6;
            ctx.beginPath();
            ctx.arc(pole.x, pole.y, 8 * pole.life, 0, Math.PI * 2);
            ctx.fillStyle = pole.strength > 0
                ? `rgba(${this.palette.highlight.join(',')}, ${pa})`
                : `rgba(255, 50, 50, ${pa})`;
            ctx.fill();
        }
    }

    onShockwave(x, y) {
        // Create an attractive magnetic pole
        if (this.poles.length < 8) {
            this.poles.push({ x, y, strength: 1, life: 1 });
        }
        this.ripples.push({ x, y, radius: 0, alpha: 0.8 });
    }

    onGravityWell(x, y) {
        // Create a repulsive pole
        if (this.poles.length < 8) {
            this.poles.push({ x, y, strength: -1.5, life: 1 });
        }
    }
}
