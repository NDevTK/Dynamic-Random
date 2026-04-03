/**
 * @file echo_ripple_effects.js
 * @description Interactive effect: cursor movement emits sound-like circular
 * ripples that create interference patterns where they overlap. Ripples bounce
 * off screen edges and interact with each other, producing complex wave
 * patterns. Seed controls: ripple speed, color scheme, interference style
 * (additive/subtractive/chromatic), wave shape, and decay rate.
 */

export class EchoRipple {
    constructor() {
        this.ripples = [];
        this.ripplePool = [];
        this.maxRipples = 30;
        this.interfaceStyle = 0;
        this.waveShape = 0;
        this.palette = [];
        this.spawnTimer = 0;
        this.spawnInterval = 8;
        this.lastMx = 0;
        this.lastMy = 0;
        this.edgeBounce = false;
    }

    configure(rng, palette) {
        // Interference style: 0=additive glow, 1=subtractive, 2=chromatic split, 3=concentric
        this.interfaceStyle = Math.floor(rng() * 4);
        // Wave shape: 0=circle, 1=square, 2=diamond, 3=star, 4=hex
        this.waveShape = Math.floor(rng() * 5);
        this.spawnInterval = 6 + Math.floor(rng() * 10);
        this.edgeBounce = rng() > 0.5;

        this.palette = palette && palette.length >= 3 ? palette : [
            { h: rng() * 360, s: 70 + rng() * 25, l: 55 + rng() * 15 },
            { h: rng() * 360, s: 60 + rng() * 30, l: 50 + rng() * 20 },
            { h: rng() * 360, s: 80 + rng() * 15, l: 45 + rng() * 20 },
        ];

        this.ripples = [];
        this.ripplePool = [];
    }

    update(mx, my, isClicking) {
        const dx = mx - this.lastMx;
        const dy = my - this.lastMy;
        const speed = Math.sqrt(dx * dx + dy * dy);

        this.spawnTimer++;

        // Emit ripples from cursor movement
        if (speed > 2 && this.spawnTimer >= this.spawnInterval && this.ripples.length < this.maxRipples) {
            this.spawnTimer = 0;
            this._spawn(mx, my, 0.8 + speed * 0.03, false);
        }

        // Click creates a strong ripple
        if (isClicking && this.ripples.length < this.maxRipples) {
            this._spawn(mx, my, 3, true);
        }

        this.lastMx = mx;
        this.lastMy = my;

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed;
            r.alpha -= r.decay;

            // Edge bounce: spawn a reflected ripple
            if (this.edgeBounce && !r.bounced && r.alpha > 0.1) {
                const sw = window.innerWidth;
                const sh = window.innerHeight;
                if (r.x - r.radius < 0 || r.x + r.radius > sw ||
                    r.y - r.radius < 0 || r.y + r.radius > sh) {
                    r.bounced = true;
                    if (this.ripples.length < this.maxRipples) {
                        // Reflect from nearest edge
                        let bx = r.x, by = r.y;
                        if (r.x - r.radius < 0) bx = -r.x;
                        else if (r.x + r.radius > sw) bx = sw * 2 - r.x;
                        if (r.y - r.radius < 0) by = -r.y;
                        else if (r.y + r.radius > sh) by = sh * 2 - r.y;
                        this._spawn(bx, by, r.speed * 0.8, false, r.alpha * 0.5);
                    }
                }
            }

            if (r.alpha <= 0) {
                if (this.ripplePool.length < this.maxRipples) this.ripplePool.push(r);
                this.ripples[i] = this.ripples[this.ripples.length - 1];
                this.ripples.pop();
            }
        }
    }

    _spawn(x, y, speed, isBurst, startAlpha) {
        let r = this.ripplePool.length > 0 ? this.ripplePool.pop() : {};
        r.x = x;
        r.y = y;
        r.radius = isBurst ? 5 : 1;
        r.speed = speed;
        r.alpha = startAlpha || (isBurst ? 0.7 : 0.4);
        r.decay = isBurst ? 0.003 : 0.005 + Math.random() * 0.003;
        r.colorIdx = Math.floor(Math.random() * this.palette.length);
        r.lineWidth = isBurst ? 3 : 1 + Math.random() * 1.5;
        r.bounced = false;
        this.ripples.push(r);
    }

    draw(ctx, system) {
        if (this.ripples.length === 0) return;

        const interference = this.interfaceStyle;

        if (interference === 0) {
            ctx.globalCompositeOperation = 'lighter';
        } else if (interference === 1) {
            ctx.globalCompositeOperation = 'difference';
        }

        for (const r of this.ripples) {
            if (r.alpha <= 0.01) continue;
            const c = this.palette[r.colorIdx];

            if (interference === 2) {
                // Chromatic split: draw R, G, B channels offset
                const offset = r.radius * 0.02;
                ctx.globalCompositeOperation = 'lighter';
                for (let ch = 0; ch < 3; ch++) {
                    const ox = Math.cos(ch * Math.PI * 2 / 3) * offset;
                    const oy = Math.sin(ch * Math.PI * 2 / 3) * offset;
                    const colors = ['rgba(255,50,50,', 'rgba(50,255,50,', 'rgba(50,50,255,'];
                    ctx.strokeStyle = colors[ch] + (r.alpha * 0.5) + ')';
                    ctx.lineWidth = r.lineWidth;
                    this._drawShape(ctx, r.x + ox, r.y + oy, r.radius);
                }
                continue;
            }

            ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${r.alpha})`;
            ctx.lineWidth = r.lineWidth;

            if (interference === 3) {
                // Concentric: draw multiple rings
                const rings = 3;
                for (let j = 0; j < rings; j++) {
                    const ringR = r.radius - j * 8;
                    if (ringR > 0) {
                        ctx.globalAlpha = r.alpha * (1 - j * 0.3);
                        this._drawShape(ctx, r.x, r.y, ringR);
                    }
                }
                ctx.globalAlpha = 1;
            } else {
                this._drawShape(ctx, r.x, r.y, r.radius);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        // Draw interference highlight points where ripples overlap
        if (this.ripples.length >= 2) {
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < this.ripples.length; i++) {
                for (let j = i + 1; j < this.ripples.length; j++) {
                    const a = this.ripples[i];
                    const b = this.ripples[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Check if ripples intersect
                    if (dist < a.radius + b.radius && dist > Math.abs(a.radius - b.radius)) {
                        // Calculate intersection points
                        const t = (dist * dist + a.radius * a.radius - b.radius * b.radius) / (2 * dist);
                        const h = Math.sqrt(Math.max(0, a.radius * a.radius - t * t));
                        const px = a.x + (dx / dist) * t;
                        const py = a.y + (dy / dist) * t;
                        const ix1 = px + (-dy / dist) * h;
                        const iy1 = py + (dx / dist) * h;
                        const ix2 = px - (-dy / dist) * h;
                        const iy2 = py + (-dx / dist) * h;

                        const interAlpha = Math.min(a.alpha, b.alpha) * 0.4;
                        if (interAlpha > 0.02) {
                            const c = this.palette[0];
                            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 20}%, ${interAlpha})`;
                            ctx.beginPath();
                            ctx.arc(ix1, iy1, 3, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(ix2, iy2, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    _drawShape(ctx, x, y, radius) {
        ctx.beginPath();
        if (this.waveShape === 0) {
            ctx.arc(x, y, radius, 0, Math.PI * 2);
        } else if (this.waveShape === 1) {
            // Square
            ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
        } else if (this.waveShape === 2) {
            // Diamond
            ctx.moveTo(x, y - radius);
            ctx.lineTo(x + radius, y);
            ctx.lineTo(x, y + radius);
            ctx.lineTo(x - radius, y);
            ctx.closePath();
        } else if (this.waveShape === 3) {
            // Star
            const points = 5;
            for (let i = 0; i <= points * 2; i++) {
                const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? radius : radius * 0.5;
                const px = x + Math.cos(angle) * r;
                const py = y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else {
            // Hex
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        ctx.stroke();
    }
}
