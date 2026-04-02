/**
 * @file aurora_curtain_effects.js
 * @description Flowing aurora borealis curtains that drape across the screen.
 * Cursor movement pushes the curtains; clicks create ripple distortions.
 * Seed controls: number of curtains, color palette, wave frequency,
 * particle density, vertical position, sway behavior, and shimmer style.
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
        this._mouseSpeed = 0;
        this._particles = [];
        this._particlePool = [];
        this._maxParticles = 200;
        this._baseHue = 120;
        this._verticalPos = 0.3;
        this._orientation = 0;   // 0=horizontal, 1=vertical, 2=diagonal
        this._shimmerStyle = 0;  // 0=wave, 1=pulse, 2=sparkle

        // Cached Y values per curtain to avoid recomputing in draw
        this._cachedYs = [];
        this._cacheValid = false;
    }

    configure(rng, hues) {
        this._tick = 0;
        this._ripples = [];
        this._particles = [];
        this._baseHue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._verticalPos = 0.15 + rng() * 0.55;
        this._orientation = Math.floor(rng() * 3);
        this._shimmerStyle = Math.floor(rng() * 3);

        const curtainCount = 3 + Math.floor(rng() * 5);
        this._curtains = [];

        for (let i = 0; i < curtainCount; i++) {
            const hueShift = (rng() - 0.5) * 80;
            // Fewer segments for performance, smooth with interpolation
            const segments = 15 + Math.floor(rng() * 15);
            this._curtains.push({
                hue: (this._baseHue + hueShift + 360) % 360,
                yOffset: (rng() - 0.5) * 100,
                amplitude: 20 + rng() * 60,
                frequency: 0.002 + rng() * 0.008,
                speed: 0.005 + rng() * 0.02,
                phase: rng() * Math.PI * 2,
                width: 40 + rng() * 80,
                alpha: 0.08 + rng() * 0.15,
                segments,
                waveLayers: 2 + Math.floor(rng() * 3),
                particleRate: rng() > 0.5 ? 0.1 + rng() * 0.3 : 0,
                // Vertical drape: some curtains hang taller at edges
                drapeAmount: rng() > 0.5 ? rng() * 0.4 : 0,
            });
        }

        this._maxParticles = 80 + Math.floor(rng() * 150);
        this._cachedYs = new Array(curtainCount);
        for (let i = 0; i < curtainCount; i++) {
            this._cachedYs[i] = new Float32Array(this._curtains[i].segments + 1);
        }
    }

    // Tick-based pseudo-random
    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Ripples on click - tick-based RNG
        if (isClicking && this._tick % 6 === 0) {
            let r = this._ripplePool.length > 0 ? this._ripplePool.pop() : {};
            const seed = this._tick * 7 + 13;
            r.x = mx; r.y = my;
            r.radius = 0;
            r.maxRadius = 200 + this._prand(seed) * 200;
            r.strength = 30 + this._prand(seed + 1) * 40;
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

        // Spawn aurora particles - tick-based RNG
        const w = window.innerWidth;
        for (let ci = 0; ci < this._curtains.length; ci++) {
            const curtain = this._curtains[ci];
            if (curtain.particleRate > 0 && this._particles.length < this._maxParticles) {
                const seed = this._tick * 31 + ci * 97;
                if (this._prand(seed) < curtain.particleRate) {
                    let p = this._particlePool.length > 0 ? this._particlePool.pop() : {};
                    const t = this._prand(seed + 1);
                    p.x = t * w;
                    p.baseY = this._computeCurtainY(curtain, p.x, this._tick);
                    p.y = p.baseY;
                    p.vy = -0.5 - this._prand(seed + 2) * 1.5;
                    p.vx = (this._prand(seed + 3) - 0.5) * 0.5;
                    p.life = 40 + this._prand(seed + 4) * 60;
                    p.maxLife = p.life;
                    p.size = 1 + this._prand(seed + 5) * 3;
                    p.hue = curtain.hue + (this._prand(seed + 6) - 0.5) * 30;
                    this._particles.push(p);
                }
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

        // Pre-compute cached Y positions for all curtain segments
        this._computeAllCurtainYs();
    }

    _computeCurtainY(curtain, x, tick) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        let baseY;

        if (this._orientation === 0) {
            baseY = h * this._verticalPos + curtain.yOffset;
        } else if (this._orientation === 1) {
            baseY = h * 0.5 + curtain.yOffset;
        } else {
            baseY = h * this._verticalPos + curtain.yOffset + (x / w) * h * 0.3;
        }

        // Drape: lower at edges, higher in center
        if (curtain.drapeAmount > 0) {
            const centerDist = Math.abs(x / w - 0.5) * 2; // 0 at center, 1 at edges
            baseY += centerDist * centerDist * curtain.drapeAmount * h * 0.15;
        }

        let y = baseY;
        for (let l = 0; l < curtain.waveLayers; l++) {
            const freq = curtain.frequency * (1 + l * 0.5);
            const amp = curtain.amplitude / (1 + l * 0.3);
            const spd = curtain.speed * (1 + l * 0.2);
            y += Math.sin(x * freq + tick * spd + curtain.phase + l * 1.7) * amp;
        }

        // Mouse push effect - strength scales with mouse speed
        const dx = x - this._mx;
        const dy = y - this._my;
        const distSq = dx * dx + dy * dy;
        const pushRadius = 200 + this._mouseSpeed * 3;
        const pushRadiusSq = pushRadius * pushRadius;
        if (distSq < pushRadiusSq) {
            const dist = Math.sqrt(distSq);
            const push = (1 - dist / pushRadius) * (40 + this._mouseSpeed * 2);
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

    _computeAllCurtainYs() {
        const w = window.innerWidth;
        const tick = this._tick;

        for (let ci = 0; ci < this._curtains.length; ci++) {
            const curtain = this._curtains[ci];
            const segW = w / curtain.segments;
            const yArr = this._cachedYs[ci];

            for (let i = 0; i <= curtain.segments; i++) {
                const x = i * segW;
                yArr[i] = this._computeCurtainY(curtain, x, tick);
            }
        }
        this._cacheValid = true;
    }

    draw(ctx, system) {
        if (this._curtains.length === 0 || !this._cacheValid) return;
        const w = system.width || window.innerWidth;
        const tick = this._tick;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw each curtain using cached Y values
        for (let ci = 0; ci < this._curtains.length; ci++) {
            const curtain = this._curtains[ci];
            const segW = w / curtain.segments;
            const yArr = this._cachedYs[ci];
            const bandHeight = curtain.width;
            const halfBand = bandHeight / 2;

            for (let i = 0; i < curtain.segments; i++) {
                const x1 = i * segW;
                const x2 = (i + 1) * segW;
                const xMid = (x1 + x2) / 2;
                const y1 = yArr[i];
                const y2 = yArr[i + 1];
                const yMid = (y1 + y2) / 2;

                // Shimmer varies by style
                let shimmer;
                if (this._shimmerStyle === 0) {
                    shimmer = Math.sin(tick * 0.03 + i * 0.2) * 0.5 + 0.5;
                } else if (this._shimmerStyle === 1) {
                    shimmer = Math.sin(tick * 0.06 + ci * 1.5) * 0.5 + 0.5;
                } else {
                    // Sparkle: sharp random-looking peaks
                    shimmer = this._prand(tick * 3 + i * 17 + ci * 53) > 0.7
                        ? 0.8 + this._prand(tick + i) * 0.2 : 0.3;
                }

                const hue = (curtain.hue + i * 2 + tick * 0.1) % 360;
                const alpha = curtain.alpha * (0.6 + shimmer * 0.4);

                // Single gradient per segment (optimized: fewer color stops)
                const grad = ctx.createLinearGradient(xMid, yMid - halfBand, xMid, yMid + halfBand);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.3, `hsla(${hue | 0}, 85%, 65%, ${(alpha * 0.4).toFixed(3)})`);
                grad.addColorStop(0.5, `hsla(${(hue + 15) | 0}, 95%, 78%, ${(alpha * 1.1).toFixed(3)})`);
                grad.addColorStop(0.7, `hsla(${hue | 0}, 85%, 65%, ${(alpha * 0.4).toFixed(3)})`);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(x1, y1 - halfBand);
                ctx.lineTo(x2, y2 - halfBand);
                ctx.lineTo(x2, y2 + halfBand);
                ctx.lineTo(x1, y1 + halfBand);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Draw particles
        if (this._particles.length > 0) {
            for (const p of this._particles) {
                const alpha = (p.life / p.maxLife) * 0.6;
                const size = p.size * (p.life / p.maxLife);
                ctx.fillStyle = `hsla(${p.hue | 0}, 80%, 80%, ${alpha.toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
