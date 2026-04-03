/**
 * @file smoke_wisps_effects.js
 * @description Flowing ethereal smoke tendrils that respond to mouse movement.
 * Mouse acts as wind source - moving the cursor pushes smoke, and clicking
 * creates vortex bursts. Particles use Perlin-like noise for organic flow.
 *
 * Modes:
 * 0 - Incense Smoke: Thin white/gray tendrils that curl upward with delicate swirls
 * 1 - Dragon Breath: Thick hot smoke with ember particles, red-orange palette
 * 2 - Spirit Mist: Ghostly translucent forms that coalesce into face-like shapes
 * 3 - Aurora Smoke: Colorful bands that shimmer like northern lights in smoke form
 * 4 - Toxic Cloud: Green-purple miasma that clings to the bottom and reacts to cursor
 * 5 - Ink in Water: Dense swirling patterns like ink dropped into water, high contrast
 */

const TAU = Math.PI * 2;

// Simple 2D noise using hash for organic flow
function _noise2d(x, y, seed) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

function _smoothNoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    // Smoothstep
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = _noise2d(ix, iy, seed);
    const n10 = _noise2d(ix + 1, iy, seed);
    const n01 = _noise2d(ix, iy + 1, seed);
    const n11 = _noise2d(ix + 1, iy + 1, seed);
    return n00 * (1 - sx) * (1 - sy) + n10 * sx * (1 - sy) + n01 * (1 - sx) * sy + n11 * sx * sy;
}

export class SmokeWisps {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this._particles = [];
        this._maxParticles = 200;
        this._particlePool = [];
        this._spawnRate = 3;
        this._noiseSeed = 0;

        // Vortex bursts from clicks
        this._vortices = [];
        this._vortexPool = [];

        // Embers for dragon breath mode
        this._embers = [];
        this._emberPool = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 0;
        this.intensity = 0.5 + rng() * 0.5;
        this._particles = [];
        this._vortices = [];
        this._embers = [];
        this._noiseSeed = rng() * 1000;

        this._spawnRate = this.mode === 1 ? 5 : this.mode === 3 ? 4 : this.mode === 5 ? 6 : 3;
        this._maxParticles = this.mode === 4 ? 300 : this.mode === 5 ? 250 : 200;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        const W = window.innerWidth, H = window.innerHeight;

        // Spawn new particles
        for (let i = 0; i < this._spawnRate && this._particles.length < this._maxParticles; i++) {
            const p = this._particlePool.length > 0 ? this._particlePool.pop() : {};
            const seed = this.tick * 31 + i * 67;
            const pr1 = ((seed * 2654435761) >>> 0) / 4294967296;
            const pr2 = (((seed + 7) * 2246822519) >>> 0) / 4294967296;
            const pr3 = (((seed + 13) * 3266489917) >>> 0) / 4294967296;

            if (this.mode === 4) {
                // Toxic cloud spawns from bottom
                p.x = pr1 * W;
                p.y = H - pr2 * 50;
                p.vx = (pr3 - 0.5) * 0.5;
                p.vy = -0.3 - pr2 * 0.5;
            } else if (this.mode === 5) {
                // Ink spawns from cursor area
                p.x = mx + (pr1 - 0.5) * 40;
                p.y = my + (pr2 - 0.5) * 40;
                p.vx = (pr1 - 0.5) * 2;
                p.vy = (pr2 - 0.5) * 2;
            } else {
                // Spawn near bottom or sides based on mode
                p.x = this.mode === 0 ? W * 0.3 + pr1 * W * 0.4 : pr1 * W;
                p.y = H + 10;
                p.vx = (pr3 - 0.5) * 0.3;
                p.vy = -0.5 - pr2 * 1.5;
            }

            p.life = 80 + pr2 * 120;
            p.maxLife = p.life;
            p.size = this.mode === 0 ? 15 + pr1 * 25 : this.mode === 3 ? 20 + pr1 * 40 : 10 + pr1 * 30;
            p.hueOffset = (pr3 - 0.5) * (this.mode === 3 ? 120 : 40);
            p.noisePhase = pr1 * 100;
            p.opacity = 0;
            p.maxOpacity = 0.05 + pr2 * 0.1;
            this._particles.push(p);
        }

        // Wind from mouse
        const windX = (mx - this._pmx) * 0.3;
        const windY = (my - this._pmy) * 0.3;

        // Update particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life--;

            // Fade in/out
            const lifeRatio = p.life / p.maxLife;
            if (lifeRatio > 0.9) {
                p.opacity = Math.min(p.maxOpacity, p.opacity + 0.005);
            } else if (lifeRatio < 0.2) {
                p.opacity *= 0.97;
            }

            // Noise-based flow
            const nx = p.x * 0.005 + this.tick * 0.002;
            const ny = p.y * 0.005 + p.noisePhase;
            const noiseVal = _smoothNoise(nx, ny, this._noiseSeed);
            const noiseAngle = noiseVal * TAU * 2;

            p.vx += Math.cos(noiseAngle) * 0.05;
            p.vy += Math.sin(noiseAngle) * 0.05;

            // Buoyancy
            if (this.mode !== 5) {
                p.vy -= 0.02;
            }

            // Mouse wind influence
            const dx = mx - p.x, dy = my - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000 && distSq > 0) { // 200^2
                const dist = Math.sqrt(distSq);
                const influence = (1 - dist / 200) * 0.5;
                p.vx += windX * influence;
                p.vy += windY * influence;
                // Slight repulsion
                p.vx -= (dx / dist) * influence * 0.3;
                p.vy -= (dy / dist) * influence * 0.3;
            }

            // Vortex influence
            for (const v of this._vortices) {
                const vdx = v.x - p.x, vdy = v.y - p.y;
                const vdist = Math.sqrt(vdx * vdx + vdy * vdy);
                if (vdist < v.radius && vdist > 0) {
                    const strength = (1 - vdist / v.radius) * v.strength * 0.05;
                    // Tangential + inward
                    p.vx += (-vdy / vdist * strength + vdx / vdist * strength * 0.3);
                    p.vy += (vdx / vdist * strength + vdy / vdist * strength * 0.3);
                }
            }

            // Damping
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x += p.vx;
            p.y += p.vy;

            // Expand over time
            p.size += 0.1;

            if (p.life <= 0 || p.y < -p.size || p.x < -p.size || p.x > W + p.size) {
                this._particlePool.push(p);
                this._particles[i] = this._particles[this._particles.length - 1];
                this._particles.pop();
            }
        }

        // Click vortex
        if (isClicking && !this._wasClicking) {
            const v = this._vortexPool.length > 0 ? this._vortexPool.pop() : {};
            v.x = mx;
            v.y = my;
            v.radius = 100 + this._mouseSpeed * 3;
            v.strength = 3 + this._mouseSpeed * 0.5;
            v.life = 40;
            v.maxLife = 40;
            this._vortices.push(v);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Update vortices
        for (let i = this._vortices.length - 1; i >= 0; i--) {
            const v = this._vortices[i];
            v.life--;
            v.strength *= 0.95;
            v.radius *= 1.02;
            if (v.life <= 0) {
                this._vortexPool.push(v);
                this._vortices[i] = this._vortices[this._vortices.length - 1];
                this._vortices.pop();
            }
        }

        // Dragon breath embers
        if (this.mode === 1 && this.tick % 3 === 0 && this._embers.length < 50) {
            const seed = this.tick * 53;
            const e = this._emberPool.length > 0 ? this._emberPool.pop() : {};
            const pr = ((seed * 2654435761) >>> 0) / 4294967296;
            e.x = pr * W;
            e.y = H;
            e.vx = (pr - 0.5) * 1;
            e.vy = -1 - pr * 2;
            e.life = 30 + pr * 40;
            e.maxLife = e.life;
            e.size = 1 + pr * 2;
            this._embers.push(e);
        }
        for (let i = this._embers.length - 1; i >= 0; i--) {
            const e = this._embers[i];
            e.x += e.vx + windX * 0.2;
            e.y += e.vy;
            e.vx += (((this.tick * 2654435761 + i * 2246822519) >>> 0) / 4294967296 - 0.5) * 0.2;
            e.life--;
            if (e.life <= 0) {
                this._emberPool.push(e);
                this._embers[i] = this._embers[this._embers.length - 1];
                this._embers.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = this.mode === 5 ? 'screen' : 'lighter';

        for (const p of this._particles) {
            const lifeRatio = p.life / p.maxLife;
            const hue = this._getHue(p);
            const sat = this._getSaturation();
            const light = this._getLightness(lifeRatio);
            const alpha = p.opacity * this.intensity;

            if (alpha < 0.002) continue;

            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, TAU);
            ctx.fill();

            // Inner brighter core for some modes
            if (this.mode === 1 || this.mode === 5) {
                ctx.fillStyle = `hsla(${hue}, ${sat + 10}%, ${light + 15}%, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.4, 0, TAU);
                ctx.fill();
            }
        }

        // Vortex visualization
        for (const v of this._vortices) {
            const lifeRatio = v.life / v.maxLife;
            const alpha = lifeRatio * 0.12 * this.intensity;
            ctx.strokeStyle = `hsla(${this.hue}, 60%, 65%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.radius * (1 - lifeRatio), 0, TAU);
            ctx.stroke();
        }

        // Embers
        for (const e of this._embers) {
            const lifeRatio = e.life / e.maxLife;
            const alpha = lifeRatio * 0.4 * this.intensity;
            ctx.fillStyle = `hsla(${this.hue + 20}, 90%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    _getHue(p) {
        if (this.mode === 0) return 0; // White/gray smoke (saturation handles it)
        if (this.mode === 1) return (this.hue + p.hueOffset + 360) % 360; // Red-orange
        if (this.mode === 2) return (200 + p.hueOffset + 360) % 360; // Blue-white
        if (this.mode === 3) return (this.hue + p.hueOffset + this.tick * 0.5 + 360) % 360; // Rainbow shift
        if (this.mode === 4) return (120 + p.hueOffset + 360) % 360; // Green-purple
        return (this.hue + p.hueOffset + 360) % 360; // Ink
    }

    _getSaturation() {
        if (this.mode === 0) return 5; // Nearly desaturated
        if (this.mode === 2) return 20;
        return 60;
    }

    _getLightness(lifeRatio) {
        if (this.mode === 0) return 70 + lifeRatio * 20;
        if (this.mode === 1) return 40 + lifeRatio * 30;
        if (this.mode === 5) return 30 + lifeRatio * 20;
        return 50 + lifeRatio * 20;
    }
}
