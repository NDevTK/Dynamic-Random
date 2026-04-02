/**
 * @file kaleidoscope_mirror_effects.js
 * @description Interactive kaleidoscope that mirrors cursor movements into
 * seed-randomized symmetrical patterns. Supports 3-12 fold symmetry,
 * multiple drawing styles (ribbons, crystals, mandalas), and color cycling.
 * Mouse movement paints; clicks create burst patterns.
 */

export class KaleidoscopeMirror {
    constructor() {
        this.segments = 6;
        this.drawStyle = 0;       // 0=ribbon, 1=crystal, 2=mandala, 3=dotfield, 4=spirograph
        this.colorMode = 0;       // 0=rainbow, 1=monochrome, 2=complementary, 3=analogous, 4=triadic
        this.baseHue = 0;
        this.secondaryHue = 180;
        this.lineWidth = 2;
        this.trailFade = 0.985;
        this.rotationSpeed = 0;
        this.rotationOffset = 0;
        this.mirrorX = true;
        this.mirrorY = false;
        this.pulseOnBeat = false;
        this.glowIntensity = 0;
        this.centerDrift = false;  // whether center point slowly moves

        // Internal state
        this._points = [];
        this._maxPoints = 120;
        this._pointWriteIdx = 0;
        this._pointCount = 0;
        this._bursts = [];
        this._burstPool = [];
        this._prevX = 0;
        this._prevY = 0;
        this._canvas = null;
        this._ctx = null;
        this._tick = 0;
        this._cx = 0;
        this._cy = 0;
        this._baseCx = 0;
        this._baseCy = 0;
        this._fadeCounter = 0;
        this._mouseSpeed = 0;

        // Pre-allocated for burst RNG
        this._burstSeed = 0;
    }

    configure(rng, hues) {
        this.segments = 3 + Math.floor(rng() * 10);   // 3-12 fold symmetry
        this.drawStyle = Math.floor(rng() * 5);
        this.colorMode = Math.floor(rng() * 5);
        this.baseHue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this.secondaryHue = hues.length > 1 ? hues[1].h : (this.baseHue + 120) % 360;
        this.lineWidth = 1 + rng() * 4;
        this.trailFade = 0.975 + rng() * 0.02;
        this.rotationSpeed = (rng() - 0.5) * 0.015;
        this.mirrorX = rng() > 0.3;
        this.mirrorY = rng() > 0.6;
        this.pulseOnBeat = rng() > 0.5;
        this.glowIntensity = rng() > 0.4 ? 3 + rng() * 12 : 0;
        this.centerDrift = rng() > 0.6;
        this.rotationOffset = 0;

        // Ring buffer for points
        this._points = new Array(this._maxPoints);
        for (let i = 0; i < this._maxPoints; i++) {
            this._points[i] = { x: 0, y: 0, px: 0, py: 0, speed: 0, tick: 0 };
        }
        this._pointWriteIdx = 0;
        this._pointCount = 0;
        this._bursts = [];
        this._tick = 0;
        this._fadeCounter = 0;
        this._burstSeed = Math.floor(rng() * 65536);

        // Create persistent offscreen canvas for accumulation
        if (!this._canvas) {
            this._canvas = document.createElement('canvas');
            this._ctx = this._canvas.getContext('2d', { alpha: true });
        }
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;
        this._baseCx = this._canvas.width / 2;
        this._baseCy = this._canvas.height / 2;
        this._cx = this._baseCx;
        this._cy = this._baseCy;
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    // Tick-based pseudo-random to avoid Math.random()
    _prand(seed) {
        const x = ((seed * 2654435761) ^ (seed * 2246822519)) >>> 0;
        return (x & 0x7FFFFFFF) / 0x7FFFFFFF;
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
            case 4: // triadic
                h = (this.baseHue + Math.floor(progress * 3) * 120) % 360;
                s = 75; l = 55;
                break;
            default:
                h = this.baseHue; s = 60; l = 50;
        }
        return `hsla(${h | 0}, ${s}%, ${l}%, ${alpha.toFixed(3)})`;
    }

    update(mx, my, isClicking) {
        this._tick++;
        this.rotationOffset += this.rotationSpeed;

        if (!this._canvas) return;
        if (this._canvas.width !== window.innerWidth || this._canvas.height !== window.innerHeight) {
            this._canvas.width = window.innerWidth;
            this._canvas.height = window.innerHeight;
            this._baseCx = this._canvas.width / 2;
            this._baseCy = this._canvas.height / 2;
        }

        // Drifting center point for more organic patterns
        if (this.centerDrift) {
            this._cx = this._baseCx + Math.sin(this._tick * 0.003) * 50;
            this._cy = this._baseCy + Math.cos(this._tick * 0.004) * 30;
        }

        const dx = mx - this._prevX;
        const dy = my - this._prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        this._mouseSpeed = speed;

        // Ring buffer insertion (avoids shift() O(n) cost)
        if (speed > 1) {
            const p = this._points[this._pointWriteIdx];
            p.x = mx; p.y = my; p.px = this._prevX; p.py = this._prevY;
            p.speed = speed; p.tick = this._tick;
            this._pointWriteIdx = (this._pointWriteIdx + 1) % this._maxPoints;
            if (this._pointCount < this._maxPoints) this._pointCount++;
        }

        // Bursts on click - using tick-based pseudo-random
        if (isClicking && this._tick % 4 === 0) {
            this._burstSeed += 7;
            const burstCount = 8 + (this._prand(this._burstSeed) * 8) | 0;
            for (let i = 0; i < burstCount; i++) {
                const seed = this._burstSeed * 31 + i;
                const angle = (i / burstCount) * Math.PI * 2;
                const spd = 2 + this._prand(seed) * 6;
                let b = this._burstPool.length > 0 ? this._burstPool.pop() : {};
                b.x = mx; b.y = my;
                b.vx = Math.cos(angle) * spd;
                b.vy = Math.sin(angle) * spd;
                b.life = 40 + this._prand(seed + 1) * 30;
                b.maxLife = b.life;
                b.size = 1 + this._prand(seed + 2) * 3;
                b.hueShift = this._prand(seed + 3) * 60;
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
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = `rgba(0,0,0,${(1 - this.trailFade).toFixed(4)})`;
            ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
            ctx.globalCompositeOperation = 'source-over';
        }

        // Draw new segments onto accumulation canvas
        this._drawToAccumCanvas();
    }

    _drawToAccumCanvas() {
        if (this._pointCount < 2) return;

        const ctx = this._ctx;
        const cx = this._cx;
        const cy = this._cy;
        const angleStep = (Math.PI * 2) / this.segments;
        const mirrors = (this.mirrorX ? 2 : 1) * (this.mirrorY ? 2 : 1);

        ctx.globalCompositeOperation = 'lighter';

        // Get the latest point from ring buffer
        const latestIdx = (this._pointWriteIdx - 1 + this._maxPoints) % this._maxPoints;
        const p = this._points[latestIdx];
        const progress = (this._tick % 200) / 200;
        // Speed-responsive alpha and width
        const speedFactor = Math.min(1, p.speed * 0.02);
        const alpha = Math.min(0.6, speedFactor * 0.5 + 0.05);
        const dynamicWidth = this.lineWidth * (0.5 + speedFactor * 1.5);
        const color = this._getColor(progress, alpha);

        if (this.glowIntensity > 0) {
            ctx.shadowBlur = this.glowIntensity * (0.5 + speedFactor);
            ctx.shadowColor = color;
        }

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = dynamicWidth;
        ctx.lineCap = 'round';

        const relX1 = p.px - cx;
        const relY1 = p.py - cy;
        const relX2 = p.x - cx;
        const relY2 = p.y - cy;

        // Draw all segments with minimal save/restore (single transform batch)
        for (let s = 0; s < this.segments; s++) {
            const angle = s * angleStep + this.rotationOffset;

            for (let m = 0; m < mirrors; m++) {
                const flipX = (this.mirrorX && (m & 1)) ? -1 : 1;
                const flipY = (this.mirrorY && (m >> 1)) ? -1 : 1;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle);
                ctx.scale(flipX, flipY);

                if (this.drawStyle === 0) {
                    // Ribbon
                    ctx.beginPath();
                    ctx.moveTo(relX1, relY1);
                    ctx.lineTo(relX2, relY2);
                    ctx.stroke();
                } else if (this.drawStyle === 1) {
                    // Crystal - connected triangles
                    const fillColor = this._getColor(progress, alpha * 0.3);
                    ctx.beginPath();
                    ctx.moveTo(relX1, relY1);
                    ctx.lineTo(relX2, relY2);
                    ctx.lineTo(relX2 * 0.8, relY1 * 0.8);
                    ctx.closePath();
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                    ctx.strokeStyle = color;
                    ctx.stroke();
                } else if (this.drawStyle === 2) {
                    // Mandala - arcs from center
                    const dist = Math.sqrt(relX2 * relX2 + relY2 * relY2);
                    if (dist > 2) {
                        ctx.beginPath();
                        ctx.arc(0, 0, dist, Math.atan2(relY1, relX1), Math.atan2(relY2, relX2));
                        ctx.stroke();
                    }
                } else if (this.drawStyle === 3) {
                    // Dotfield with size variation
                    const dotSize = dynamicWidth * (0.5 + speedFactor * 2);
                    ctx.beginPath();
                    ctx.arc(relX2, relY2, dotSize, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Spirograph - bezier curves through history
                    const prevIdx = (this._pointWriteIdx - 2 + this._maxPoints) % this._maxPoints;
                    if (this._pointCount >= 3) {
                        const pp = this._points[prevIdx];
                        const cpx = (pp.x - cx) * 0.5 + relX1 * 0.5;
                        const cpy = (pp.y - cy) * 0.5 + relY1 * 0.5;
                        ctx.beginPath();
                        ctx.moveTo(relX1, relY1);
                        ctx.quadraticCurveTo(cpx, cpy, relX2, relY2);
                        ctx.stroke();
                    } else {
                        ctx.beginPath();
                        ctx.moveTo(relX1, relY1);
                        ctx.lineTo(relX2, relY2);
                        ctx.stroke();
                    }
                }

                ctx.restore();
            }
        }

        // Draw bursts in kaleidoscope pattern
        if (this._bursts.length > 0) {
            for (const b of this._bursts) {
                const bAlpha = (b.life / b.maxLife) * 0.5;
                const bColor = this._getColor(b.hueShift / 60, bAlpha);
                const bSize = b.size * (b.life / b.maxLife);

                for (let s = 0; s < this.segments; s++) {
                    const angle = s * angleStep + this.rotationOffset;
                    for (let m = 0; m < mirrors; m++) {
                        const flipX = (this.mirrorX && (m & 1)) ? -1 : 1;
                        const flipY = (this.mirrorY && (m >> 1)) ? -1 : 1;

                        ctx.save();
                        ctx.translate(cx, cy);
                        ctx.rotate(angle);
                        ctx.scale(flipX, flipY);

                        ctx.fillStyle = bColor;
                        ctx.beginPath();
                        ctx.arc(b.x - cx, b.y - cy, bSize, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.restore();
                    }
                }
            }
        }

        // Reset shadow
        if (this.glowIntensity > 0) {
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    draw(ctx, system) {
        if (!this._canvas || this._canvas.width === 0) return;

        // Pulse effect on fast mouse movement
        const pulse = this.pulseOnBeat ? Math.sin(this._tick * 0.1) * 0.05 * Math.min(1, this._mouseSpeed * 0.01) : 0;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7 + pulse;
        ctx.drawImage(this._canvas, 0, 0);
        ctx.restore();
    }
}
