/**
 * @file ink_splatter_effects.js
 * @description Procedural ink splatters that bloom from click points, drip under
 * gravity, and spread organically. Mouse movement creates calligraphic strokes.
 * Each splatter uses a unique seed-driven shape with fractal edges.
 *
 * Modes:
 * 0 - Watercolor Bloom: Soft spreading color that bleeds at edges
 * 1 - Ink Drip: Dark splatters that drip downward with gravity
 * 2 - Spray Paint: Stippled spray pattern with overspray haze
 * 3 - Blood Splatter: Forensic-style directional splatter physics
 * 4 - Neon Graffiti: Glowing neon paint with bright edges and dark centers
 * 5 - Galaxy Paint: Cosmic dust clouds with embedded star specks
 */

const TAU = Math.PI * 2;

export class InkSplatter {
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

        // Offscreen canvas for persistent splatters
        this._splatCanvas = null;
        this._splatCtx = null;
        this._splatW = 0;
        this._splatH = 0;

        // Active drips
        this._drips = [];
        this._dripPool = [];
        this._maxDrips = 80;

        // Active blooms (expanding splatters)
        this._blooms = [];
        this._bloomPool = [];
        this._maxBlooms = 20;

        // Calligraphy stroke
        this._strokePoints = [];
        this._maxStrokePoints = 60;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this._drips = [];
        this._blooms = [];
        this._strokePoints = [];
        this.intensity = 0.6 + rng() * 0.5;

        switch (this.mode) {
            case 0: this.hue = palette.length > 0 ? palette[0].h : 210 + Math.floor(rng() * 60); break;
            case 1: this.hue = palette.length > 0 ? palette[0].h : 30; break;
            case 2: this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360); break;
            case 3: this.hue = palette.length > 0 ? palette[0].h : 355; break;
            case 4: this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360); break;
            case 5: this.hue = palette.length > 0 ? palette[0].h : 270; break;
        }

        const W = window.innerWidth, H = window.innerHeight;
        this._splatW = Math.ceil(W / 2);
        this._splatH = Math.ceil(H / 2);
        this._splatCanvas = document.createElement('canvas');
        this._splatCanvas.width = this._splatW;
        this._splatCanvas.height = this._splatH;
        this._splatCtx = this._splatCanvas.getContext('2d', { alpha: true });
        this._splatCtx.clearRect(0, 0, this._splatW, this._splatH);
    }

    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    _spawnSplatter(x, y, size, velocity) {
        if (this._blooms.length >= this._maxBlooms) return;
        const bloom = this._bloomPool.length > 0 ? this._bloomPool.pop() : {};
        bloom.x = x;
        bloom.y = y;
        bloom.radius = 2;
        bloom.maxRadius = size;
        bloom.speed = 0.5 + Math.random() * 1.5;
        bloom.life = 1;
        bloom.hueOffset = (Math.random() - 0.5) * 20;
        bloom.vx = velocity ? velocity.x * 0.5 : 0;
        bloom.vy = velocity ? velocity.y * 0.5 : 0;
        // Fractal edge seed
        bloom.edgeSeed = Math.floor(Math.random() * 10000);
        bloom.blobCount = 3 + Math.floor(Math.random() * 5);
        this._blooms.push(bloom);

        // Spawn satellite drips
        if (this.mode === 1 || this.mode === 3) {
            const dripCount = 2 + Math.floor(Math.random() * 4);
            for (let d = 0; d < dripCount && this._drips.length < this._maxDrips; d++) {
                const angle = Math.random() * TAU;
                const dist = size * (0.3 + Math.random() * 0.7);
                const drip = this._dripPool.length > 0 ? this._dripPool.pop() : {};
                drip.x = x + Math.cos(angle) * dist;
                drip.y = y + Math.sin(angle) * dist;
                drip.vx = Math.cos(angle) * 0.5 + (velocity ? velocity.x * 0.3 : 0);
                drip.vy = 0.5 + Math.random() * 1.5;
                drip.size = 1 + Math.random() * 3;
                drip.life = 60 + Math.random() * 60;
                drip.maxLife = drip.life;
                drip.hue = (this.hue + bloom.hueOffset + Math.random() * 10) % 360;
                drip.trail = [];
                this._drips.push(drip);
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        const dx = mx - this._pmx;
        const dy = my - this._pmy;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        // Click spawns splatter
        if (isClicking && !this._wasClicking) {
            const size = 20 + this._mouseSpeed * 2 + Math.random() * 30;
            this._spawnSplatter(mx, my, size, { x: dx, y: dy });
        }

        // Continuous stroke while clicking
        if (isClicking && this._mouseSpeed > 1) {
            this._strokePoints.push({ x: mx, y: my, size: 1 + this._mouseSpeed * 0.3 });
            if (this._strokePoints.length > this._maxStrokePoints) {
                this._strokePoints.shift();
            }
            // Small spray particles while dragging
            if (this.mode === 2 && this.tick % 2 === 0) {
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * TAU;
                    const dist = Math.random() * 15;
                    this._spawnSplatter(mx + Math.cos(angle) * dist, my + Math.sin(angle) * dist, 3 + Math.random() * 5, null);
                }
            }
        } else if (!isClicking) {
            // Fade out stroke
            if (this._strokePoints.length > 0 && this.tick % 3 === 0) {
                this._strokePoints.shift();
            }
        }

        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Update blooms
        for (let i = this._blooms.length - 1; i >= 0; i--) {
            const b = this._blooms[i];
            b.radius += b.speed;
            b.x += b.vx;
            b.y += b.vy;
            b.vx *= 0.95;
            b.vy *= 0.95;
            b.life = Math.max(0, 1 - b.radius / b.maxRadius);

            // Render to persistent canvas when mature
            if (b.radius >= b.maxRadius * 0.8 && !b._rendered) {
                b._rendered = true;
                this._renderSplatToCanvas(b);
            }

            if (b.life <= 0) {
                if (!b._rendered) this._renderSplatToCanvas(b);
                this._bloomPool.push(b);
                this._blooms[i] = this._blooms[this._blooms.length - 1];
                this._blooms.pop();
            }
        }

        // Update drips
        for (let i = this._drips.length - 1; i >= 0; i--) {
            const d = this._drips[i];
            d.vy += 0.03; // gravity
            d.x += d.vx;
            d.y += d.vy;
            d.vx *= 0.99;
            d.life--;

            // Trail
            if (this.tick % 2 === 0) {
                d.trail.push(d.x, d.y);
                if (d.trail.length > 16) d.trail.splice(0, 2);
            }

            if (d.life <= 0 || d.y > window.innerHeight + 10) {
                this._dripPool.push(d);
                this._drips[i] = this._drips[this._drips.length - 1];
                this._drips.pop();
            }
        }

        // Slowly fade the persistent canvas
        if (this._splatCtx && this.tick % 10 === 0) {
            this._splatCtx.globalCompositeOperation = 'destination-out';
            this._splatCtx.fillStyle = 'rgba(0,0,0,0.005)';
            this._splatCtx.fillRect(0, 0, this._splatW, this._splatH);
        }
    }

    _renderSplatToCanvas(bloom) {
        if (!this._splatCtx) return;
        const ctx = this._splatCtx;
        const x = bloom.x / 2;
        const y = bloom.y / 2;
        const r = bloom.radius / 2;
        const hue = (this.hue + (bloom.hueOffset || 0) + 360) % 360;

        ctx.globalCompositeOperation = 'lighter';

        if (this.mode === 0) {
            // Watercolor: soft radial gradient
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, `hsla(${hue}, 60%, 55%, 0.06)`);
            grad.addColorStop(0.6, `hsla(${hue + 10}, 50%, 50%, 0.03)`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, TAU);
            ctx.fill();
        } else if (this.mode === 5) {
            // Galaxy: radial with star specks
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.06)`);
            grad.addColorStop(0.5, `hsla(${(hue + 30) % 360}, 60%, 40%, 0.03)`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, TAU);
            ctx.fill();

            // Star specks
            for (let s = 0; s < 5; s++) {
                const sa = this._prand(bloom.edgeSeed + s * 7) * TAU;
                const sd = this._prand(bloom.edgeSeed + s * 11) * r * 0.8;
                ctx.fillStyle = `rgba(255, 255, 240, 0.15)`;
                ctx.beginPath();
                ctx.arc(x + Math.cos(sa) * sd, y + Math.sin(sa) * sd, 0.5, 0, TAU);
                ctx.fill();
            }
        } else {
            // Generic splat blob
            const alpha = this.mode === 4 ? 0.04 : 0.05;
            ctx.fillStyle = `hsla(${hue}, 65%, 55%, ${alpha})`;
            ctx.beginPath();
            // Irregular blob using edge seed
            for (let a = 0; a <= 12; a++) {
                const angle = (a / 12) * TAU;
                const noise = this._prand(bloom.edgeSeed + a * 17) * 0.4 + 0.8;
                const br = r * noise;
                const px = x + Math.cos(angle) * br;
                const py = y + Math.sin(angle) * br;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
    }

    draw(ctx, system) {
        ctx.save();

        // Persistent splatter layer
        if (this._splatCanvas && this._splatW > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = this.intensity;
            ctx.drawImage(this._splatCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';

        // Active blooms (expanding)
        for (const b of this._blooms) {
            const hue = (this.hue + (b.hueOffset || 0) + 360) % 360;
            const alpha = b.life * 0.2 * this.intensity;

            if (this.mode === 4) {
                // Neon: bright edges, dark center
                ctx.strokeStyle = `hsla(${hue}, 90%, 75%, ${alpha * 0.8})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let a = 0; a <= 16; a++) {
                    const angle = (a / 16) * TAU;
                    const noise = this._prand(b.edgeSeed + a * 17) * 0.3 + 0.85;
                    const r = b.radius * noise;
                    const px = b.x + Math.cos(angle) * r;
                    const py = b.y + Math.sin(angle) * r;
                    if (a === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();

                // Neon glow
                ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${alpha * 0.2})`;
                ctx.lineWidth = 5;
                ctx.stroke();
            } else {
                // Radial bloom
                const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
                grad.addColorStop(0, `hsla(${hue}, 60%, 55%, ${alpha * 0.5})`);
                grad.addColorStop(0.7, `hsla(${hue + 10}, 50%, 50%, ${alpha * 0.2})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, TAU);
                ctx.fill();
            }
        }

        // Drips
        for (const d of this._drips) {
            const lifeRatio = d.life / d.maxLife;
            const alpha = lifeRatio * 0.4 * this.intensity;

            // Trail
            if (d.trail.length >= 4) {
                ctx.strokeStyle = `hsla(${d.hue}, 60%, 55%, ${alpha * 0.3})`;
                ctx.lineWidth = d.size * 0.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(d.trail[0], d.trail[1]);
                for (let t = 2; t < d.trail.length; t += 2) {
                    ctx.lineTo(d.trail[t], d.trail[t + 1]);
                }
                ctx.lineTo(d.x, d.y);
                ctx.stroke();
            }

            // Drop head
            ctx.fillStyle = `hsla(${d.hue}, 65%, 60%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size * lifeRatio, 0, TAU);
            ctx.fill();
        }

        // Calligraphy stroke
        if (this._strokePoints.length > 2) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 1; i < this._strokePoints.length; i++) {
                const prev = this._strokePoints[i - 1];
                const curr = this._strokePoints[i];
                const alpha = (i / this._strokePoints.length) * 0.25 * this.intensity;
                const hue = this.mode === 4 ? (this.hue + i * 3) % 360 : this.hue;
                ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
                ctx.lineWidth = curr.size;
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(curr.x, curr.y);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
