/**
 * @file fireworks_architecture.js
 * @description Interactive fireworks show with seed-driven explosion styles,
 *   color palettes, launch patterns, and gravity. Click to launch!
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FireworksArchitecture extends Architecture {
    constructor() {
        super();
        this.rockets = [];
        this.particles = [];
        this.sparks = [];
        this.pool = [];        // particle object pool
        this.sparkPool = [];
        this.autoTimer = 0;
        this.autoInterval = 60;
        this.gravity = 0.06;
        this.styles = [];      // seed-driven explosion style palette
        this.palette = [];
        this.trailFade = 0.08;
        this.burstMin = 60;
        this.burstMax = 160;
        this.rocketSpeed = 0;
        this.groundY = 0;
        this.tick = 0;
        this.launchZones = [];
        this.windX = 0;
        this.showNames = false;
        // Off-screen trail canvas for persistent glow
        this._trailCanvas = null;
        this._trailCtx = null;
    }

    init(system) {
        const rng = system.rng;
        this.gravity = 0.04 + rng() * 0.06;
        this.trailFade = 0.04 + rng() * 0.08;
        this.burstMin = 50 + Math.floor(rng() * 60);
        this.burstMax = this.burstMin + 40 + Math.floor(rng() * 100);
        this.rocketSpeed = 6 + rng() * 6;
        this.groundY = system.height * (0.85 + rng() * 0.1);
        this.autoInterval = 30 + Math.floor(rng() * 60);
        this.windX = (rng() - 0.5) * 0.02;
        this.showNames = rng() > 0.7;

        // Seed-driven color palette (5-8 hues)
        const baseHue = system.hue;
        const paletteSize = 5 + Math.floor(rng() * 4);
        this.palette = [];
        for (let i = 0; i < paletteSize; i++) {
            const h = (baseHue + rng() * 360) % 360;
            const s = 70 + rng() * 30;
            const l = 55 + rng() * 20;
            this.palette.push({ h, s, l });
        }

        // Explosion styles: chrysanthemum, peony, willow, ring, crossette, palm, strobe, heart
        const allStyles = ['chrysanthemum', 'peony', 'willow', 'ring', 'crossette', 'palm', 'strobe', 'heart', 'spiral', 'double'];
        this.styles = [];
        const numStyles = 3 + Math.floor(rng() * 4);
        for (let i = 0; i < numStyles; i++) {
            this.styles.push(allStyles[Math.floor(rng() * allStyles.length)]);
        }

        // Seed-driven launch zones (x positions where rockets tend to launch)
        this.launchZones = [];
        const numZones = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < numZones; i++) {
            this.launchZones.push(0.1 + rng() * 0.8);
        }

        // Trail canvas
        this._trailCanvas = document.createElement('canvas');
        this._trailCanvas.width = system.width;
        this._trailCanvas.height = system.height;
        this._trailCtx = this._trailCanvas.getContext('2d');

        this.rockets = [];
        this.particles = [];
        this.sparks = [];
        this.tick = 0;
    }

    _getParticle() {
        return this.pool.length > 0 ? this.pool.pop() : {};
    }

    _recyclePart(p) {
        this.pool.push(p);
    }

    _getSpark() {
        return this.sparkPool.length > 0 ? this.sparkPool.pop() : {};
    }

    _launchRocket(system, x) {
        const rng = system.rng;
        const zone = this.launchZones[Math.floor(rng() * this.launchZones.length)];
        const launchX = x !== undefined ? x : zone * system.width + (rng() - 0.5) * system.width * 0.15;
        const targetY = system.height * (0.15 + rng() * 0.35);
        const color = this.palette[Math.floor(rng() * this.palette.length)];
        const style = this.styles[Math.floor(rng() * this.styles.length)];
        const angle = Math.atan2(targetY - this.groundY, launchX - launchX + (rng() - 0.5) * 40);
        const speed = this.rocketSpeed + rng() * 3;

        this.rockets.push({
            x: launchX,
            y: this.groundY,
            vx: (rng() - 0.5) * 1.5,
            vy: -speed - rng() * 2,
            targetY,
            color,
            style,
            burstCount: this.burstMin + Math.floor(rng() * (this.burstMax - this.burstMin)),
            trail: [],
            life: 200
        });
    }

    _explode(system, rocket) {
        const rng = system.rng;
        const style = rocket.style;
        const color = rocket.color;
        const count = rocket.burstCount;
        const x = rocket.x;
        const y = rocket.y;

        if (style === 'chrysanthemum') {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + rng() * 0.3;
                const speed = 2 + rng() * 4;
                const p = this._getParticle();
                p.x = x; p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 60 + rng() * 40;
                p.maxLife = p.life;
                p.h = color.h + (rng() - 0.5) * 20;
                p.s = color.s;
                p.l = color.l;
                p.size = 1.5 + rng() * 2;
                p.trail = true;
                p.sparkle = rng() > 0.7;
                this.particles.push(p);
            }
        } else if (style === 'peony') {
            for (let i = 0; i < count; i++) {
                const angle = rng() * Math.PI * 2;
                const speed = 1 + rng() * 5;
                const p = this._getParticle();
                p.x = x; p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 50 + rng() * 50;
                p.maxLife = p.life;
                p.h = color.h + (rng() - 0.5) * 40;
                p.s = color.s;
                p.l = color.l + rng() * 15;
                p.size = 2 + rng() * 2.5;
                p.trail = false;
                p.sparkle = false;
                this.particles.push(p);
            }
        } else if (style === 'willow') {
            for (let i = 0; i < count * 0.7; i++) {
                const angle = rng() * Math.PI * 2;
                const speed = 1.5 + rng() * 3;
                const p = this._getParticle();
                p.x = x; p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed - 1;
                p.life = 100 + rng() * 60;
                p.maxLife = p.life;
                p.h = 40 + rng() * 20; // golden willow
                p.s = 80;
                p.l = 60 + rng() * 20;
                p.size = 1 + rng() * 1.5;
                p.trail = true;
                p.sparkle = false;
                this.particles.push(p);
            }
        } else if (style === 'ring') {
            const ringCount = Math.floor(count * 0.8);
            for (let i = 0; i < ringCount; i++) {
                const angle = (i / ringCount) * Math.PI * 2;
                const speed = 3 + rng() * 1.5;
                const p = this._getParticle();
                p.x = x; p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 40 + rng() * 20;
                p.maxLife = p.life;
                p.h = color.h;
                p.s = color.s;
                p.l = color.l;
                p.size = 2;
                p.trail = true;
                p.sparkle = false;
                this.particles.push(p);
            }
        } else if (style === 'crossette') {
            // Splits into sub-bursts
            const arms = 4 + Math.floor(rng() * 4);
            for (let a = 0; a < arms; a++) {
                const baseAngle = (a / arms) * Math.PI * 2;
                const speed = 4 + rng() * 2;
                for (let i = 0; i < Math.floor(count / arms); i++) {
                    const angle = baseAngle + (rng() - 0.5) * 0.5;
                    const sp = speed * (0.3 + rng() * 0.7);
                    const p = this._getParticle();
                    p.x = x; p.y = y;
                    p.vx = Math.cos(angle) * sp;
                    p.vy = Math.sin(angle) * sp;
                    p.life = 35 + rng() * 25;
                    p.maxLife = p.life;
                    p.h = color.h + a * 30;
                    p.s = color.s;
                    p.l = color.l;
                    p.size = 1.5 + rng();
                    p.trail = true;
                    p.sparkle = true;
                    this.particles.push(p);
                }
            }
        } else if (style === 'palm') {
            for (let i = 0; i < count; i++) {
                const angle = -Math.PI / 2 + (rng() - 0.5) * 1.2;
                const speed = 2 + rng() * 5;
                const p = this._getParticle();
                p.x = x; p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 80 + rng() * 40;
                p.maxLife = p.life;
                p.h = 100 + rng() * 30; // greenish
                p.s = 70;
                p.l = 50 + rng() * 20;
                p.size = 1 + rng() * 2;
                p.trail = true;
                p.sparkle = false;
                this.particles.push(p);
            }
        } else if (style === 'strobe') {
            for (let i = 0; i < count; i++) {
                const angle = rng() * Math.PI * 2;
                const speed = 1 + rng() * 4;
                const p = this._getParticle();
                p.x = x; p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 80 + rng() * 40;
                p.maxLife = p.life;
                p.h = 0;
                p.s = 0;
                p.l = 90 + rng() * 10;
                p.size = 1 + rng();
                p.trail = false;
                p.sparkle = true;
                this.particles.push(p);
            }
        } else if (style === 'heart') {
            for (let i = 0; i < count; i++) {
                const t = (i / count) * Math.PI * 2;
                const hx = 16 * Math.pow(Math.sin(t), 3);
                const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                const scale = 0.2 + rng() * 0.15;
                const p = this._getParticle();
                p.x = x; p.y = y;
                p.vx = hx * scale * 0.3;
                p.vy = hy * scale * 0.3;
                p.life = 50 + rng() * 30;
                p.maxLife = p.life;
                p.h = 340 + rng() * 30; // pinkish-red
                p.s = 90;
                p.l = 55 + rng() * 15;
                p.size = 1.5 + rng() * 1.5;
                p.trail = true;
                p.sparkle = false;
                this.particles.push(p);
            }
        } else if (style === 'spiral') {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 8 + rng() * 0.2;
                const speed = 1 + (i / count) * 5;
                const p = this._getParticle();
                p.x = x; p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = 60 + rng() * 30;
                p.maxLife = p.life;
                p.h = color.h + (i / count) * 60;
                p.s = color.s;
                p.l = color.l;
                p.size = 1 + rng() * 2;
                p.trail = true;
                p.sparkle = rng() > 0.8;
                this.particles.push(p);
            }
        } else { // double
            // Two concentric bursts
            for (let ring = 0; ring < 2; ring++) {
                const rc = Math.floor(count / 2);
                const speed = ring === 0 ? 2 + rng() * 2 : 4 + rng() * 2;
                for (let i = 0; i < rc; i++) {
                    const angle = (i / rc) * Math.PI * 2;
                    const p = this._getParticle();
                    p.x = x; p.y = y;
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed;
                    p.life = 40 + rng() * 30;
                    p.maxLife = p.life;
                    p.h = ring === 0 ? color.h : (color.h + 180) % 360;
                    p.s = color.s;
                    p.l = color.l;
                    p.size = 1.5 + rng();
                    p.trail = true;
                    p.sparkle = ring === 1;
                    this.particles.push(p);
                }
            }
        }
    }

    update(system) {
        this.tick++;

        // Auto-launch rockets
        this.autoTimer++;
        if (this.autoTimer >= this.autoInterval) {
            this.autoTimer = 0;
            this._launchRocket(system);
            // Sometimes launch multiples
            if (system.rng() > 0.6) this._launchRocket(system);
            if (system.rng() > 0.85) this._launchRocket(system);
        }

        // Mouse click launches at cursor position
        if (system.speedMultiplier > 5) {
            this._launchRocket(system, mouse.x);
        }

        // Update rockets
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const r = this.rockets[i];
            r.x += r.vx;
            r.y += r.vy;
            r.vy += this.gravity * 0.5;
            r.vx += this.windX;
            r.life--;

            // Emit sparks from rocket trail
            if (this.tick % 2 === 0) {
                const s = this._getSpark();
                s.x = r.x + (system.rng() - 0.5) * 3;
                s.y = r.y;
                s.vx = (system.rng() - 0.5) * 0.5;
                s.vy = system.rng() * 1 + 0.5;
                s.life = 15 + system.rng() * 10;
                s.size = 1 + system.rng();
                this.sparks.push(s);
            }

            // Explode when reached target or slowed down
            if (r.y <= r.targetY || r.vy >= 0 || r.life <= 0) {
                this._explode(system, r);
                this.rockets[i] = this.rockets[this.rockets.length - 1];
                this.rockets.pop();
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += this.gravity;
            p.vx += this.windX;
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.life--;

            if (p.life <= 0) {
                this._recyclePart(p);
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            }
        }

        // Update sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life--;
            if (s.life <= 0) {
                this.sparkPool.push(s);
                this.sparks[i] = this.sparks[this.sparks.length - 1];
                this.sparks.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tctx = this._trailCtx;

        // Fade trail canvas
        if (tctx && this._trailCanvas.width === system.width) {
            tctx.fillStyle = `rgba(0,0,0,${this.trailFade})`;
            tctx.fillRect(0, 0, system.width, system.height);
        }

        // Draw particles to trail canvas for glow persistence
        if (tctx) {
            tctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                const alpha = Math.max(0, p.life / p.maxLife);
                if (p.sparkle && this.tick % 4 < 2) continue; // strobe effect
                tctx.fillStyle = `hsla(${p.h}, ${p.s}%, ${p.l}%, ${alpha})`;
                tctx.beginPath();
                tctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                tctx.fill();
            }
            tctx.globalCompositeOperation = 'source-over';

            // Composite trail canvas onto main
            ctx.drawImage(this._trailCanvas, 0, 0);
        }

        // Draw rockets
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.rockets.length; i++) {
            const r = this.rockets[i];
            ctx.fillStyle = `hsla(${r.color.h}, ${r.color.s}%, 80%, 1)`;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
            ctx.fill();

            // Bright glow around rocket
            const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 15);
            g.addColorStop(0, `hsla(${r.color.h}, 100%, 90%, 0.6)`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw live particles with glow
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const alpha = Math.max(0, p.life / p.maxLife);
            if (p.sparkle && this.tick % 4 < 2) continue;
            const sz = p.size * (0.5 + alpha * 0.5);
            ctx.fillStyle = `hsla(${p.h}, ${p.s}%, ${p.l}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw sparks (rocket trails)
        for (let i = 0; i < this.sparks.length; i++) {
            const s = this.sparks[i];
            const alpha = s.life / 25;
            ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
