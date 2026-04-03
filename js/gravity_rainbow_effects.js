/**
 * @file gravity_rainbow_effects.js
 * @description Particles fountain upward from click points and arc down in parabolic
 * trajectories, each particle leaving a rainbow-spectrum trail. Creates luminous
 * arching bridges of color across the screen. Mouse movement affects wind.
 *
 * Modes:
 * 0 - Rainbow Fountain: Particles spray up and arc down in spectrum-ordered colors
 * 1 - Gravity Bridge: Click two points to create a catenary rainbow bridge between them
 * 2 - Prismatic Rain: Colored drops fall from top, bounce on an invisible floor
 * 3 - Spectrum Tornado: Particles spiral in a funnel that follows cursor
 * 4 - Color Comet: A cluster of particles orbits the cursor leaving rainbow tails
 * 5 - Chromatic Waterfall: Particles cascade down from cursor like a waterfall
 */

const TAU = Math.PI * 2;
const RAINBOW = [0, 25, 50, 60, 120, 180, 220, 270, 310];

export class GravityRainbow {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this.particles = [];
        this.maxParticles = 400;

        // Trail canvas (half res)
        this._trailCanvas = null;
        this._trailCtx = null;
        this._trailW = 0;
        this._trailH = 0;

        // Bridge mode endpoints
        this._bridgePoints = [];

        // Tornado mode
        this._tornadoAngle = 0;

        // Gravity and wind
        this._gravity = 0.08;
        this._wind = 0;
        this._bounceFloor = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.intensity = 0.6 + rng() * 0.5;
        this.particles = [];
        this._bridgePoints = [];
        this._tornadoAngle = 0;

        this._gravity = 0.05 + rng() * 0.08;
        this._wind = 0;

        const W = window.innerWidth, H = window.innerHeight;
        this._bounceFloor = H * (0.75 + rng() * 0.2);

        // Trail canvas
        this._trailW = Math.ceil(W / 2);
        this._trailH = Math.ceil(H / 2);
        this._trailCanvas = document.createElement('canvas');
        this._trailCanvas.width = this._trailW;
        this._trailCanvas.height = this._trailH;
        this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
        this._trailCtx.clearRect(0, 0, this._trailW, this._trailH);

        if (this.mode === 2) {
            this.maxParticles = 300;
        } else {
            this.maxParticles = 400;
        }
    }

    _spawnParticle(x, y, vx, vy, hueIdx) {
        if (this.particles.length >= this.maxParticles) return;
        this.particles.push({
            x, y, vx, vy,
            hue: RAINBOW[hueIdx % RAINBOW.length],
            life: 80 + Math.random() * 80,
            maxLife: 160,
            size: 1.2 + Math.random() * 2,
            bounces: 0,
            maxBounces: this.mode === 2 ? 3 : 0
        });
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Wind from mouse horizontal movement
        this._wind = (mx - this._pmx) * 0.002;

        if (isClicking && !this._wasClicking) {
            if (this.mode === 0) this._spawnFountain(mx, my);
            else if (this.mode === 1) this._handleBridge(mx, my);
            else if (this.mode === 5) { /* waterfall spawns continuously */ }
            else this._spawnFountain(mx, my);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Continuous spawning for some modes
        if (this.mode === 2 && this.tick % 2 === 0) {
            const W = window.innerWidth;
            for (let i = 0; i < 3; i++) {
                const x = Math.random() * W;
                const hueIdx = Math.floor(Math.random() * RAINBOW.length);
                this._spawnParticle(x, -5, (Math.random() - 0.5) * 0.5, 1 + Math.random() * 2, hueIdx);
            }
        }

        if (this.mode === 3) this._updateTornado();
        if (this.mode === 4) this._updateComet();
        if (this.mode === 5 && (isClicking || this._mouseSpeed > 2)) this._updateWaterfall();

        // Update particles
        const H = window.innerHeight;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vy += this._gravity;
            p.vx += this._wind;
            p.vx *= 0.999;
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            // Bounce
            if (this.mode === 2 && p.y > this._bounceFloor && p.bounces < p.maxBounces) {
                p.y = this._bounceFloor;
                p.vy *= -0.6;
                p.vx *= 0.8;
                p.bounces++;
            }

            if (p.life <= 0 || p.y > H + 20) {
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            }
        }

        // Update trail canvas
        if (this._trailCtx && this.tick % 2 === 0) {
            const tc = this._trailCtx;
            tc.globalCompositeOperation = 'destination-out';
            tc.fillStyle = 'rgba(0,0,0,0.03)';
            tc.fillRect(0, 0, this._trailW, this._trailH);

            tc.globalCompositeOperation = 'lighter';
            for (const p of this.particles) {
                const lifeRatio = p.life / p.maxLife;
                if (lifeRatio < 0.05) continue;
                const alpha = Math.min(lifeRatio, 0.5) * 0.25 * this.intensity;
                tc.fillStyle = `hsla(${p.hue}, 85%, 60%, ${alpha})`;
                tc.beginPath();
                tc.arc(p.x / 2, p.y / 2, p.size, 0, TAU);
                tc.fill();
            }
        }
    }

    _spawnFountain(x, y) {
        const count = 30 + Math.floor(Math.random() * 20);
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            const speed = 3 + Math.random() * 6;
            this._spawnParticle(
                x + (Math.random() - 0.5) * 10,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                i % RAINBOW.length
            );
        }
    }

    _handleBridge(x, y) {
        this._bridgePoints.push({ x, y });
        if (this._bridgePoints.length >= 2) {
            const p1 = this._bridgePoints[0];
            const p2 = this._bridgePoints[1];
            this._spawnBridge(p1.x, p1.y, p2.x, p2.y);
            this._bridgePoints = [];
        }
    }

    _spawnBridge(x1, y1, x2, y2) {
        const segments = 40;
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sag = dist * 0.3;

        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const x = x1 + dx * t;
            // Catenary approximation
            const catY = y1 + dy * t - Math.sin(t * Math.PI) * sag;
            const tangentAngle = Math.atan2(
                dy - Math.cos(t * Math.PI) * sag * Math.PI,
                dx
            );
            const perpAngle = tangentAngle + Math.PI / 2;
            // Slight spread perpendicular to bridge
            const spread = (Math.random() - 0.5) * 5;
            this._spawnParticle(
                x + Math.cos(perpAngle) * spread,
                catY + Math.sin(perpAngle) * spread,
                Math.cos(tangentAngle) * 0.5,
                -0.5 - Math.random() * 1,
                i % RAINBOW.length
            );
        }
    }

    _updateTornado() {
        this._tornadoAngle += 0.08;
        if (this.tick % 2 === 0) {
            const r = 20 + Math.random() * 60;
            const angle = this._tornadoAngle + Math.random() * 0.5;
            const x = this._mx + Math.cos(angle) * r;
            const y = this._my + Math.sin(angle) * r * 0.3;
            const hueIdx = Math.floor(this._tornadoAngle / 0.5) % RAINBOW.length;
            this._spawnParticle(x, y,
                Math.cos(angle + Math.PI / 2) * 2,
                -2 - Math.random() * 3,
                hueIdx
            );
        }
    }

    _updateComet() {
        if (this.tick % 2 === 0) {
            const orbitR = 60 + Math.sin(this.tick * 0.01) * 30;
            const angle = this.tick * 0.04;
            for (let i = 0; i < 3; i++) {
                const a = angle + i * (TAU / 3);
                const x = this._mx + Math.cos(a) * orbitR;
                const y = this._my + Math.sin(a) * orbitR * 0.6;
                const hueIdx = (Math.floor(this.tick / 4) + i * 3) % RAINBOW.length;
                this._spawnParticle(x, y,
                    -Math.sin(a) * 1.5 + (this._mx - this._pmx) * 0.3,
                    Math.cos(a) * 0.5 + (this._my - this._pmy) * 0.3,
                    hueIdx
                );
            }
        }
    }

    _updateWaterfall() {
        const count = Math.min(5, Math.floor(this._mouseSpeed / 3) + 1);
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 30;
            this._spawnParticle(
                this._mx + spread,
                this._my,
                spread * 0.05 + (this._mx - this._pmx) * 0.1,
                1 + Math.random() * 2,
                Math.floor(Math.random() * RAINBOW.length)
            );
        }
    }

    draw(ctx, system) {
        ctx.save();

        // Trail layer
        if (this._trailCanvas && this._trailW > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.8 * this.intensity;
            ctx.drawImage(this._trailCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';

        // Draw bridge guidelines
        if (this.mode === 1 && this._bridgePoints.length === 1) {
            const p = this._bridgePoints[0];
            ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(this._mx, this._my);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Bounce floor indicator for rain mode
        if (this.mode === 2) {
            ctx.strokeStyle = `rgba(255, 255, 255, 0.02)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, this._bounceFloor);
            ctx.lineTo(system.width, this._bounceFloor);
            ctx.stroke();
        }

        // Draw particles with glow
        for (const p of this.particles) {
            const lifeRatio = p.life / p.maxLife;
            if (lifeRatio < 0.02) continue;
            const alpha = Math.min(lifeRatio, 0.6) * 0.5 * this.intensity;
            const size = p.size * (0.5 + lifeRatio * 0.5);

            // Outer glow
            if (alpha > 0.05) {
                ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, ${alpha * 0.15})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 4, 0, TAU);
                ctx.fill();
            }

            // Core
            ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, TAU);
            ctx.fill();

            // Bright center at spawn
            if (lifeRatio > 0.7) {
                const peakAlpha = (lifeRatio - 0.7) * 3.3 * 0.3 * this.intensity;
                ctx.fillStyle = `hsla(${p.hue}, 30%, 95%, ${peakAlpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 0.4, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
