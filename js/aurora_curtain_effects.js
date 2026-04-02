/**
 * @file aurora_curtain_effects.js
 * @description Flowing aurora borealis curtains that drape across the screen.
 * Cursor movement pushes the curtains; clicks create ripple distortions.
 * Seed controls: number of curtains, color palette, wave frequency,
 * particle density, vertical position, and sway behavior.
 */

export class AuroraCurtain {
    constructor() {
        this._curtains = [];
        this._ripples = [];
        this._ripplePool = [];
        this._tick = 0;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._particles = [];
        this._particlePool = [];
        this._maxParticles = 200;
        this._baseHue = 120;
        this._verticalPos = 0.3; // 0=top, 1=bottom
        this._orientation = 0;   // 0=horizontal, 1=vertical, 2=diagonal
    }

    configure(rng, hues) {
        this._tick = 0;
        this._ripples = [];
        this._particles = [];
        this._baseHue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._verticalPos = 0.15 + rng() * 0.55;
        this._orientation = Math.floor(rng() * 3);

        const curtainCount = 3 + Math.floor(rng() * 5); // 3-7 curtains
        this._curtains = [];

        for (let i = 0; i < curtainCount; i++) {
            const hueShift = (rng() - 0.5) * 80;
            this._curtains.push({
                hue: (this._baseHue + hueShift + 360) % 360,
                yOffset: (rng() - 0.5) * 100,
                amplitude: 20 + rng() * 60,
                frequency: 0.002 + rng() * 0.008,
                speed: 0.005 + rng() * 0.02,
                phase: rng() * Math.PI * 2,
                width: 40 + rng() * 80,
                alpha: 0.08 + rng() * 0.15,
                segments: 20 + Math.floor(rng() * 30),
                waveLayers: 2 + Math.floor(rng() * 3),
                particleRate: rng() > 0.5 ? 0.1 + rng() * 0.3 : 0,
            });
        }

        this._maxParticles = 100 + Math.floor(rng() * 200);
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;

        // Ripples on click
        if (isClicking && this._tick % 6 === 0) {
            let r = this._ripplePool.length > 0 ? this._ripplePool.pop() : {};
            r.x = mx; r.y = my;
            r.radius = 0; r.maxRadius = 200 + Math.random() * 200;
            r.strength = 30 + Math.random() * 40;
            r.life = 1;
            this._ripples.push(r);
        }

        // Update ripples
        for (let i = this._ripples.length - 1; i >= 0; i--) {
            const r = this._ripples[i];
            r.radius += 3;
            r.life = Math.max(0, 1 - r.radius / r.maxRadius);
            if (r.life <= 0) {
                this._ripplePool.push(r);
                this._ripples[i] = this._ripples[this._ripples.length - 1];
                this._ripples.pop();
            }
        }

        // Spawn aurora particles
        for (const curtain of this._curtains) {
            if (curtain.particleRate > 0 && this._particles.length < this._maxParticles && Math.random() < curtain.particleRate) {
                let p = this._particlePool.length > 0 ? this._particlePool.pop() : {};
                const t = Math.random();
                p.x = t * window.innerWidth;
                p.baseY = this._getCurtainY(curtain, p.x, this._tick);
                p.y = p.baseY;
                p.vy = -0.5 - Math.random() * 1.5;
                p.vx = (Math.random() - 0.5) * 0.5;
                p.life = 40 + Math.random() * 60;
                p.maxLife = p.life;
                p.size = 1 + Math.random() * 3;
                p.hue = curtain.hue + (Math.random() - 0.5) * 30;
                this._particles.push(p);
            }
        }

        // Update particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                this._particlePool.push(p);
                this._particles[i] = this._particles[this._particles.length - 1];
                this._particles.pop();
            }
        }
    }

    _getCurtainY(curtain, x, tick) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        let baseY;

        if (this._orientation === 0) {
            baseY = h * this._verticalPos + curtain.yOffset;
        } else if (this._orientation === 1) {
            // Vertical orientation: x becomes the varying axis
            baseY = h * 0.5 + curtain.yOffset;
        } else {
            // Diagonal
            baseY = h * this._verticalPos + curtain.yOffset + (x / w) * h * 0.3;
        }

        let y = baseY;
        for (let l = 0; l < curtain.waveLayers; l++) {
            const freq = curtain.frequency * (1 + l * 0.5);
            const amp = curtain.amplitude / (1 + l * 0.3);
            const spd = curtain.speed * (1 + l * 0.2);
            y += Math.sin(x * freq + tick * spd + curtain.phase + l * 1.7) * amp;
        }

        // Mouse push effect
        const dx = x - this._mx;
        const dy = y - this._my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
            const push = (1 - dist / 200) * 40;
            y += (dy > 0 ? push : -push);
        }

        // Ripple distortion
        for (const r of this._ripples) {
            const rdx = x - r.x;
            const rdy = y - r.y;
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
            const ringDist = Math.abs(rdist - r.radius);
            if (ringDist < 50) {
                y += Math.sin(rdist * 0.1) * r.strength * r.life * (1 - ringDist / 50);
            }
        }

        return y;
    }

    draw(ctx, system) {
        if (this._curtains.length === 0) return;
        const w = system.width || window.innerWidth;
        const h = system.height || window.innerHeight;
        const tick = this._tick;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw each curtain as a gradient band
        for (const curtain of this._curtains) {
            const segW = w / curtain.segments;

            for (let i = 0; i < curtain.segments; i++) {
                const x1 = i * segW;
                const x2 = (i + 1) * segW;
                const xMid = (x1 + x2) / 2;
                const y1 = this._getCurtainY(curtain, x1, tick);
                const y2 = this._getCurtainY(curtain, x2, tick);
                const yMid = (y1 + y2) / 2;

                // Vertical gradient for each segment
                const bandHeight = curtain.width;
                const grad = ctx.createLinearGradient(xMid, yMid - bandHeight / 2, xMid, yMid + bandHeight / 2);

                const shimmer = Math.sin(tick * 0.03 + i * 0.2) * 0.5 + 0.5;
                const hue = (curtain.hue + i * 2 + tick * 0.1) % 360;
                const alpha = curtain.alpha * (0.6 + shimmer * 0.4);

                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.2, `hsla(${hue}, 80%, 60%, ${alpha * 0.3})`);
                grad.addColorStop(0.4, `hsla(${hue}, 90%, 70%, ${alpha})`);
                grad.addColorStop(0.5, `hsla(${(hue + 20) % 360}, 95%, 80%, ${alpha * 1.2})`);
                grad.addColorStop(0.6, `hsla(${hue}, 90%, 70%, ${alpha})`);
                grad.addColorStop(0.8, `hsla(${hue}, 80%, 60%, ${alpha * 0.3})`);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(x1, y1 - bandHeight / 2);
                ctx.lineTo(x2, y2 - bandHeight / 2);
                ctx.lineTo(x2, y2 + bandHeight / 2);
                ctx.lineTo(x1, y1 + bandHeight / 2);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Draw particles
        for (const p of this._particles) {
            const alpha = (p.life / p.maxLife) * 0.6;
            ctx.fillStyle = `hsla(${p.hue}, 80%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
