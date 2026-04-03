/**
 * @file time_lapse_painter_effects.js
 * @description Abstract paintings that evolve over time. The mouse is a brush that
 * leaves permanent marks on an accumulating canvas. Seed picks painting style and
 * palette behavior. Each produces wildly different visual results.
 *
 * Modes (seed-selected):
 * 0 - Impressionist: thick layered brush strokes that blend and overlap
 * 1 - Pointillist: tiny colored dots that build up into shimmering fields
 * 2 - Drip Art: gravity-pulled paint drips from mouse position and ceiling
 * 3 - Ink Wash: watercolor-like blobs that bleed and diffuse
 * 4 - Geometric Abstraction: rigid shapes that tessellate from cursor
 */

const TAU = Math.PI * 2;

export class TimeLapsePainter {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 30;
        this.saturation = 70;
        this._rng = Math.random;

        // Offscreen canvas for accumulating the painting
        this._paintCanvas = null;
        this._paintCtx = null;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMX = 0;
        this._prevMY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Style parameters
        this._brushSize = 8;
        this._opacity = 0.3;
        this._palette = [];
        this._colorIndex = 0;
        this._autoStrokes = [];
        this._maxAutoStrokes = 50;
        this._drips = [];
        this._maxDrips = 40;
        this._fadeRate = 0.002;

        // Geometry mode
        this._geoShapes = [];
        this._maxGeoShapes = 60;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 5);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this._rng = rng;
        this._autoStrokes = [];
        this._drips = [];
        this._geoShapes = [];

        // Build color palette (5-8 colors)
        this._palette = [];
        const paletteSize = 5 + Math.floor(rng() * 4);
        for (let i = 0; i < paletteSize; i++) {
            this._palette.push({
                h: (this.hue + rng() * 90 - 45 + 360) % 360,
                s: 40 + rng() * 50,
                l: 35 + rng() * 35,
            });
        }

        this._brushSize = 4 + rng() * 12;
        this._opacity = 0.15 + rng() * 0.25;
        this._fadeRate = 0.001 + rng() * 0.003;

        // Create offscreen paint canvas
        const W = window.innerWidth, H = window.innerHeight;
        if (!this._paintCanvas) {
            this._paintCanvas = document.createElement('canvas');
            this._paintCtx = this._paintCanvas.getContext('2d');
        }
        this._paintCanvas.width = W;
        this._paintCanvas.height = H;
        this._paintCtx.clearRect(0, 0, W, H);

        // Seed auto-strokes (background painting that happens autonomously)
        for (let i = 0; i < 10; i++) {
            this._autoStrokes.push(this._makeAutoStroke(rng, W, H));
        }
    }

    _makeAutoStroke(rng, W, H) {
        const base = {
            x: rng() * W,
            y: rng() * H,
            vx: (rng() - 0.5) * 2,
            vy: (rng() - 0.5) * 2,
            life: 100 + Math.floor(rng() * 200),
            color: this._palette[Math.floor(rng() * this._palette.length)],
            size: this._brushSize * (0.5 + rng()),
            wobble: rng() * 0.1,
            wobblePhase: rng() * TAU,
        };
        // Mode-specific behaviors
        switch (this.mode) {
            case 0: // Impressionist: longer arcs, bigger strokes
                base.vx *= 1.5;
                base.vy *= 0.3;
                base.size *= 1.5;
                base.life = 200 + Math.floor(rng() * 300);
                break;
            case 1: // Pointillist: jittery small dots
                base.vx = (rng() - 0.5) * 0.5;
                base.vy = (rng() - 0.5) * 0.5;
                base.size *= 0.3;
                base.wobble = 0.2 + rng() * 0.3;
                break;
            case 2: // Drip: downward bias
                base.vy = 0.5 + rng() * 1.5;
                base.vx *= 0.2;
                break;
            case 3: // Ink wash: slow spreading blobs
                base.vx *= 0.3;
                base.vy *= 0.3;
                base.size *= 2;
                base.life = 300 + Math.floor(rng() * 200);
                break;
            case 4: // Geometric: straight lines
                const angle = rng() * TAU;
                base.vx = Math.cos(angle) * 1.5;
                base.vy = Math.sin(angle) * 1.5;
                base.wobble = 0;
                break;
        }
        return base;
    }

    update(mx, my, isClicking) {
        this.tick++;
        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = this._mouseX;
        this._prevMY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;

        if (isClicking && !this._wasClicking) {
            this._colorIndex = (this._colorIndex + 1) % this._palette.length;

            // Ink wash: splash effect on click
            if (this.mode === 3 && pCtx) {
                const splashColor = this._palette[this._colorIndex];
                pCtx.globalCompositeOperation = 'source-over';
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TAU + this._pr(i + 200) * 0.5;
                    const r = 20 + this._pr(i + 210) * 40;
                    const sz = 5 + this._pr(i + 220) * 15;
                    pCtx.fillStyle = `hsla(${splashColor.h}, ${splashColor.s}%, ${splashColor.l}%, ${this._opacity * 0.25})`;
                    pCtx.beginPath();
                    pCtx.arc(mx + Math.cos(a) * r, my + Math.sin(a) * r, sz, 0, TAU);
                    pCtx.fill();
                }
                // Central splash
                pCtx.fillStyle = `hsla(${splashColor.h}, ${splashColor.s}%, ${splashColor.l}%, ${this._opacity * 0.4})`;
                pCtx.beginPath();
                pCtx.arc(mx, my, 12 + this._pr(230) * 10, 0, TAU);
                pCtx.fill();
            }

            if (this.mode === 2) {
                // Drip mode: spawn drips from click
                for (let i = 0; i < 5; i++) {
                    if (this._drips.length < this._maxDrips) {
                        this._drips.push({
                            x: mx + (this._rng() - 0.5) * 20,
                            y: my,
                            vy: 0.5 + this._rng() * 1.5,
                            size: 2 + this._rng() * 4,
                            color: this._palette[Math.floor(this._rng() * this._palette.length)],
                            life: 150 + Math.floor(this._rng() * 100),
                        });
                    }
                }
            }

            if (this.mode === 4 && this._geoShapes.length < this._maxGeoShapes) {
                // Geometric: spawn shape at click
                const sides = 3 + Math.floor(this._rng() * 5);
                this._geoShapes.push({
                    x: mx, y: my,
                    size: 10 + this._rng() * 30,
                    rotation: this._rng() * TAU,
                    rotSpeed: (this._rng() - 0.5) * 0.02,
                    sides,
                    color: this._palette[this._colorIndex],
                    life: 200 + Math.floor(this._rng() * 200),
                    maxLife: 400,
                    growth: 0.2 + this._rng() * 0.5,
                });
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        const W = window.innerWidth, H = window.innerHeight;
        const pCtx = this._paintCtx;
        if (!pCtx) return;

        // Fade existing painting slightly
        if (this.tick % 3 === 0) {
            pCtx.fillStyle = `rgba(0, 0, 0, ${this._fadeRate})`;
            pCtx.fillRect(0, 0, W, H);
        }

        // Mouse painting (when moving)
        if (this._mouseSpeed > 1) {
            const color = this._palette[this._colorIndex];
            switch (this.mode) {
                case 0: this._paintImpressionist(pCtx, mx, my, color); break;
                case 1: this._paintPointillist(pCtx, mx, my, color); break;
                case 2: this._paintDripSource(pCtx, mx, my, color); break;
                case 3: this._paintInkWash(pCtx, mx, my, color); break;
                case 4: this._paintGeometric(pCtx, mx, my, color); break;
            }
        }

        // Auto-strokes (background painting)
        for (let i = this._autoStrokes.length - 1; i >= 0; i--) {
            const s = this._autoStrokes[i];
            s.x += s.vx + Math.sin(this.tick * s.wobble + s.wobblePhase) * 0.5;
            s.y += s.vy + Math.cos(this.tick * s.wobble * 1.3 + s.wobblePhase) * 0.5;
            s.life--;

            // Auto stroke paint
            pCtx.globalCompositeOperation = 'source-over';
            pCtx.fillStyle = `hsla(${s.color.h}, ${s.color.s}%, ${s.color.l}%, ${this._opacity * 0.3})`;
            pCtx.beginPath();
            pCtx.arc(s.x, s.y, s.size * 0.5, 0, TAU);
            pCtx.fill();

            if (s.life <= 0 || s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) {
                this._autoStrokes[i] = this._makeAutoStroke(this._rng, W, H);
            }
        }

        // Update drips
        for (let i = this._drips.length - 1; i >= 0; i--) {
            const d = this._drips[i];
            d.y += d.vy;
            d.vy += 0.05; // Gravity
            d.life--;

            // Paint drip trail
            pCtx.globalCompositeOperation = 'source-over';
            pCtx.fillStyle = `hsla(${d.color.h}, ${d.color.s}%, ${d.color.l}%, ${this._opacity * 0.5})`;
            pCtx.beginPath();
            pCtx.arc(d.x, d.y, d.size, 0, TAU);
            pCtx.fill();

            if (d.life <= 0 || d.y > H + 20) {
                this._drips[i] = this._drips[this._drips.length - 1];
                this._drips.pop();
            }
        }

        // Update geometric shapes
        for (let i = this._geoShapes.length - 1; i >= 0; i--) {
            const g = this._geoShapes[i];
            g.rotation += g.rotSpeed;
            g.size += g.growth;
            g.life--;

            // Paint shape
            const alpha = (g.life / g.maxLife) * this._opacity * 0.4;
            pCtx.strokeStyle = `hsla(${g.color.h}, ${g.color.s}%, ${g.color.l}%, ${alpha})`;
            pCtx.lineWidth = 1;
            pCtx.beginPath();
            for (let s = 0; s <= g.sides; s++) {
                const a = g.rotation + (s / g.sides) * TAU;
                const px = g.x + Math.cos(a) * g.size;
                const py = g.y + Math.sin(a) * g.size;
                if (s === 0) pCtx.moveTo(px, py);
                else pCtx.lineTo(px, py);
            }
            pCtx.stroke();

            if (g.life <= 0) {
                this._geoShapes[i] = this._geoShapes[this._geoShapes.length - 1];
                this._geoShapes.pop();
            }
        }

        // Spawn ceiling drips in drip mode
        if (this.mode === 2 && this.tick % 30 === 0 && this._drips.length < this._maxDrips) {
            this._drips.push({
                x: this._rng() * W,
                y: 0,
                vy: 0.5 + this._rng() * 1,
                size: 1.5 + this._rng() * 3,
                color: this._palette[Math.floor(this._rng() * this._palette.length)],
                life: 200 + Math.floor(this._rng() * 150),
            });
        }
    }

    // Tick-based pseudo-random to avoid advancing universe-level seeded RNG
    _pr(offset) {
        return ((this.tick * 2654435761 + offset * 284837) >>> 0) / 4294967296;
    }

    _paintImpressionist(pCtx, mx, my, color) {
        const size = this._brushSize * (0.5 + this._mouseSpeed * 0.05);
        pCtx.save();
        pCtx.globalCompositeOperation = 'source-over';
        pCtx.translate(mx, my);
        pCtx.rotate(Math.atan2(my - this._prevMY, mx - this._prevMX));

        // Thick brush stroke (elongated ellipse)
        pCtx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${this._opacity})`;
        pCtx.beginPath();
        pCtx.ellipse(0, 0, size * 1.5, size * 0.4, 0, 0, TAU);
        pCtx.fill();

        // Texture lines within stroke
        pCtx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l + 15}%, ${this._opacity * 0.3})`;
        pCtx.lineWidth = 0.5;
        for (let i = -2; i <= 2; i++) {
            pCtx.beginPath();
            pCtx.moveTo(-size, i * size * 0.15);
            pCtx.lineTo(size, i * size * 0.15 + (this._pr(i + 50) - 0.5) * 2);
            pCtx.stroke();
        }

        // Secondary cross-hatch strokes for more painterly texture
        if (this._mouseSpeed > 4) {
            pCtx.globalAlpha = 0.3;
            const crossColor = this._palette[(this._colorIndex + 1) % this._palette.length];
            pCtx.strokeStyle = `hsla(${crossColor.h}, ${crossColor.s}%, ${crossColor.l}%, ${this._opacity * 0.2})`;
            pCtx.lineWidth = 0.3;
            for (let i = -1; i <= 1; i++) {
                pCtx.beginPath();
                pCtx.moveTo(i * size * 0.3, -size * 0.3);
                pCtx.lineTo(i * size * 0.3 + size * 0.1, size * 0.3);
                pCtx.stroke();
            }
            pCtx.globalAlpha = 1;
        }

        pCtx.restore();
    }

    _paintPointillist(pCtx, mx, my, color) {
        pCtx.globalCompositeOperation = 'source-over';
        const dotCount = 3 + Math.floor(this._mouseSpeed * 0.3);
        for (let i = 0; i < dotCount; i++) {
            const angle = this._pr(i * 3) * TAU;
            const dist = this._pr(i * 3 + 1) * this._brushSize * 2;
            const dotColor = this._palette[Math.floor(this._pr(i * 3 + 2) * this._palette.length)];
            const size = 1 + this._pr(i * 3 + 3) * 2;

            pCtx.fillStyle = `hsla(${dotColor.h}, ${dotColor.s}%, ${dotColor.l}%, ${this._opacity * 0.6})`;
            pCtx.beginPath();
            pCtx.arc(
                mx + Math.cos(angle) * dist,
                my + Math.sin(angle) * dist,
                size, 0, TAU
            );
            pCtx.fill();
        }
    }

    _paintDripSource(pCtx, mx, my, color) {
        pCtx.globalCompositeOperation = 'source-over';
        pCtx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${this._opacity * 0.4})`;
        pCtx.beginPath();
        pCtx.arc(mx, my, this._brushSize * 0.5, 0, TAU);
        pCtx.fill();

        // Spawn small drips from cursor
        if (this._mouseSpeed > 2 && this._drips.length < this._maxDrips) {
            this._drips.push({
                x: mx + (this._pr(100) - 0.5) * 10,
                y: my,
                vy: 0.3 + this._pr(101) * 0.8,
                size: 1 + this._pr(102) * 2,
                color: color,
                life: 100 + Math.floor(this._pr(103) * 100),
            });
        }
    }

    _paintInkWash(pCtx, mx, my, color) {
        pCtx.globalCompositeOperation = 'source-over';

        // Watercolor blob: multiple overlapping transparent circles
        const blobCount = 3 + Math.floor(this._mouseSpeed * 0.2);
        for (let i = 0; i < blobCount; i++) {
            const angle = this._pr(i * 4) * TAU;
            const dist = this._pr(i * 4 + 1) * this._brushSize;
            const blobSize = this._brushSize * (0.5 + this._pr(i * 4 + 2) * 1);
            const alpha = this._opacity * 0.15;

            pCtx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`;
            pCtx.beginPath();
            pCtx.arc(
                mx + Math.cos(angle) * dist,
                my + Math.sin(angle) * dist,
                blobSize, 0, TAU
            );
            pCtx.fill();
        }

        // Ink bleed: color spreads outward from recent strokes
        if (this._mouseSpeed > 3) {
            const bleedAlpha = this._opacity * 0.05;
            pCtx.fillStyle = `hsla(${color.h}, ${color.s - 10}%, ${color.l + 10}%, ${bleedAlpha})`;
            pCtx.beginPath();
            pCtx.arc(mx, my, this._brushSize * 2, 0, TAU);
            pCtx.fill();
        }
    }

    _paintGeometric(pCtx, mx, my, color) {
        if (this._mouseSpeed < 2) return;
        // Draw small geometric shapes along cursor path
        pCtx.globalCompositeOperation = 'source-over';
        const sides = 3 + (Math.floor(this.tick / 30) % 5);
        const size = 3 + this._mouseSpeed * 0.5;
        const rotation = this.tick * 0.05;

        pCtx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${this._opacity * 0.5})`;
        pCtx.lineWidth = 0.5;
        pCtx.beginPath();
        for (let s = 0; s <= sides; s++) {
            const a = rotation + (s / sides) * TAU;
            const px = mx + Math.cos(a) * size;
            const py = my + Math.sin(a) * size;
            if (s === 0) pCtx.moveTo(px, py);
            else pCtx.lineTo(px, py);
        }
        pCtx.stroke();
    }

    draw(ctx, system) {
        if (!this._paintCanvas) return;

        ctx.save();

        // Draw the accumulated painting onto the main canvas
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(this._paintCanvas, 0, 0);

        // Draw active drips with glow
        ctx.globalAlpha = 1;
        for (const d of this._drips) {
            const alpha = (d.life / 250) * 0.4;
            ctx.fillStyle = `hsla(${d.color.h}, ${d.color.s}%, ${d.color.l + 20}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size * 1.5, 0, TAU);
            ctx.fill();
        }

        // Draw active auto-strokes with glow
        for (const s of this._autoStrokes) {
            if (s.life < 50) continue;
            const alpha = (s.life / 300) * 0.15;
            ctx.fillStyle = `hsla(${s.color.h}, ${s.color.s}%, ${s.color.l + 15}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, TAU);
            ctx.fill();
        }

        // Cursor brush preview
        const color = this._palette[this._colorIndex];
        if (color) {
            ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l + 20}%, 0.2)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this._mouseX, this._mouseY, this._brushSize, 0, TAU);
            ctx.stroke();
        }

        ctx.restore();
    }
}
