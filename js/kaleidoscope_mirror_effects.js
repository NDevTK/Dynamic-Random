/**
 * @file kaleidoscope_mirror_effects.js
 * @description Interactive kaleidoscope that mirrors cursor movements into
 * seed-randomized symmetrical patterns. Supports 3-12 fold symmetry,
 * multiple drawing styles (ribbons, crystals, mandalas), and color cycling.
 * Mouse movement paints; clicks create burst patterns; right-click clears.
 */

export class KaleidoscopeMirror {
    constructor() {
        this.segments = 6;
        this.drawStyle = 0;       // 0=ribbon, 1=crystal, 2=mandala, 3=dotfield
        this.colorMode = 0;       // 0=rainbow, 1=monochrome, 2=complementary, 3=analogous
        this.baseHue = 0;
        this.lineWidth = 2;
        this.trailFade = 0.985;
        this.rotationSpeed = 0;
        this.rotationOffset = 0;
        this.mirrorX = true;
        this.mirrorY = false;
        this.pulseOnBeat = false;
        this.glowIntensity = 0;

        // Internal state
        this._points = [];
        this._maxPoints = 120;
        this._bursts = [];
        this._burstPool = [];
        this._prevX = 0;
        this._prevY = 0;
        this._canvas = null;
        this._ctx = null;
        this._tick = 0;
        this._cx = 0;
        this._cy = 0;
        this._fadeCounter = 0;
    }

    configure(rng, hues) {
        this.segments = 3 + Math.floor(rng() * 10);   // 3-12 fold symmetry
        this.drawStyle = Math.floor(rng() * 4);
        this.colorMode = Math.floor(rng() * 4);
        this.baseHue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this.lineWidth = 1 + rng() * 4;
        this.trailFade = 0.975 + rng() * 0.02;
        this.rotationSpeed = (rng() - 0.5) * 0.01;
        this.mirrorX = rng() > 0.3;
        this.mirrorY = rng() > 0.6;
        this.pulseOnBeat = rng() > 0.5;
        this.glowIntensity = rng() * 15;
        this.rotationOffset = 0;

        this._points = [];
        this._bursts = [];
        this._tick = 0;
        this._fadeCounter = 0;

        // Create persistent offscreen canvas for accumulation
        if (!this._canvas) {
            this._canvas = document.createElement('canvas');
            this._ctx = this._canvas.getContext('2d', { alpha: true });
        }
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;
        this._cx = this._canvas.width / 2;
        this._cy = this._canvas.height / 2;
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    _getColor(progress, alpha) {
        const t = this._tick;
        let h, s, l;
        switch (this.colorMode) {
            case 0: // rainbow cycling
                h = (this.baseHue + t * 0.5 + progress * 120) % 360;
                s = 70; l = 60;
                break;
            case 1: // monochrome with luminance variation
                h = this.baseHue;
                s = 30 + progress * 40;
                l = 40 + progress * 30;
                break;
            case 2: // complementary
                h = (progress > 0.5 ? this.baseHue : (this.baseHue + 180) % 360);
                s = 70; l = 55;
                break;
            case 3: // analogous
                h = (this.baseHue + progress * 60 - 30 + 360) % 360;
                s = 65; l = 55;
                break;
            default:
                h = this.baseHue; s = 60; l = 50;
        }
        return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
    }

    update(mx, my, isClicking) {
        this._tick++;
        this.rotationOffset += this.rotationSpeed;

        if (!this._canvas) return;
        if (this._canvas.width !== window.innerWidth || this._canvas.height !== window.innerHeight) {
            this._canvas.width = window.innerWidth;
            this._canvas.height = window.innerHeight;
            this._cx = this._canvas.width / 2;
            this._cy = this._canvas.height / 2;
        }

        const dx = mx - this._prevX;
        const dy = my - this._prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        if (speed > 1) {
            this._points.push({ x: mx, y: my, px: this._prevX, py: this._prevY, speed, tick: this._tick });
            if (this._points.length > this._maxPoints) {
                this._points.shift();
            }
        }

        // Bursts on click
        if (isClicking && this._tick % 4 === 0) {
            const burstCount = 8 + Math.floor(Math.random() * 8);
            for (let i = 0; i < burstCount; i++) {
                const angle = (i / burstCount) * Math.PI * 2;
                const spd = 2 + Math.random() * 6;
                let b = this._burstPool.length > 0 ? this._burstPool.pop() : {};
                b.x = mx; b.y = my;
                b.vx = Math.cos(angle) * spd;
                b.vy = Math.sin(angle) * spd;
                b.life = 40 + Math.random() * 30;
                b.maxLife = b.life;
                b.size = 1 + Math.random() * 3;
                this._bursts.push(b);
            }
        }

        // Update bursts
        for (let i = this._bursts.length - 1; i >= 0; i--) {
            const b = this._bursts[i];
            b.x += b.vx; b.y += b.vy;
            b.vx *= 0.96; b.vy *= 0.96;
            b.life--;
            if (b.life <= 0) {
                this._burstPool.push(b);
                this._bursts[i] = this._bursts[this._bursts.length - 1];
                this._bursts.pop();
            }
        }

        this._prevX = mx;
        this._prevY = my;

        // Fade the accumulation canvas periodically
        this._fadeCounter++;
        if (this._fadeCounter % 3 === 0) {
            const ctx = this._ctx;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.trailFade})`;
            ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
            ctx.restore();
        }

        // Draw new segments onto accumulation canvas
        this._drawToAccumCanvas();
    }

    _drawToAccumCanvas() {
        const ctx = this._ctx;
        const cx = this._cx;
        const cy = this._cy;
        const angleStep = (Math.PI * 2) / this.segments;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.glowIntensity > 0) {
            ctx.shadowBlur = this.glowIntensity;
        }

        // Draw latest point segments in kaleidoscope pattern
        const len = this._points.length;
        if (len >= 2) {
            const p = this._points[len - 1];
            const progress = (this._tick % 200) / 200;
            const alpha = Math.min(0.6, p.speed * 0.03);
            const color = this._getColor(progress, alpha);

            if (this.glowIntensity > 0) {
                ctx.shadowColor = color;
            }

            for (let s = 0; s < this.segments; s++) {
                const angle = s * angleStep + this.rotationOffset;
                const mirrors = this.mirrorX ? 2 : 1;

                for (let m = 0; m < mirrors; m++) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(angle);
                    if (m === 1) ctx.scale(-1, 1);

                    const relX1 = p.px - cx;
                    const relY1 = p.py - cy;
                    const relX2 = p.x - cx;
                    const relY2 = p.y - cy;

                    ctx.strokeStyle = color;
                    ctx.lineWidth = this.lineWidth;
                    ctx.lineCap = 'round';

                    if (this.drawStyle === 0) {
                        // Ribbon
                        ctx.beginPath();
                        ctx.moveTo(relX1, relY1);
                        ctx.lineTo(relX2, relY2);
                        ctx.stroke();
                    } else if (this.drawStyle === 1) {
                        // Crystal - connected triangles
                        ctx.beginPath();
                        ctx.moveTo(relX1, relY1);
                        ctx.lineTo(relX2, relY2);
                        ctx.lineTo(relX2 * 0.8, relY1 * 0.8);
                        ctx.closePath();
                        ctx.fillStyle = this._getColor(progress, alpha * 0.3);
                        ctx.fill();
                        ctx.stroke();
                    } else if (this.drawStyle === 2) {
                        // Mandala - arcs
                        const dist = Math.sqrt(relX2 * relX2 + relY2 * relY2);
                        ctx.beginPath();
                        ctx.arc(0, 0, dist, Math.atan2(relY1, relX1), Math.atan2(relY2, relX2));
                        ctx.stroke();
                    } else {
                        // Dotfield
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(relX2, relY2, this.lineWidth * 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.restore();
                }
            }
        }

        // Draw bursts in kaleidoscope pattern
        for (const b of this._bursts) {
            const alpha = (b.life / b.maxLife) * 0.5;
            const color = this._getColor(b.life / b.maxLife, alpha);

            for (let s = 0; s < this.segments; s++) {
                const angle = s * angleStep + this.rotationOffset;
                const mirrors = this.mirrorX ? 2 : 1;
                for (let m = 0; m < mirrors; m++) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(angle);
                    if (m === 1) ctx.scale(-1, 1);

                    const relX = b.x - cx;
                    const relY = b.y - cy;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(relX, relY, b.size * (b.life / b.maxLife), 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }
            }
        }

        ctx.restore();
    }

    draw(ctx, system) {
        if (!this._canvas || this._canvas.width === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(this._canvas, 0, 0);
        ctx.restore();
    }
}
