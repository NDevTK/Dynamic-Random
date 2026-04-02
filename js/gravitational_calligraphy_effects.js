/**
 * @file gravitational_calligraphy_effects.js
 * @description Mouse movements are recorded as calligraphic brush strokes that persist,
 * evolve, and interact with physics. Strokes attract/repel each other, split into
 * smaller strokes, fade organically, and bloom with color. Each seed creates a
 * different "handwriting personality" with unique brush styles, physics, and evolution.
 *
 * Modes:
 * 0 - Flowing Ink: smooth tapered strokes that pool and bleed at endpoints
 * 1 - Shattering Glass: strokes fracture into angular shards that drift apart
 * 2 - Living Vines: strokes grow tendrils and leaves, branching organically
 * 3 - Neon Traces: electric neon tubes that buzz and flicker, glow intensely
 * 4 - Smoke Ribbons: strokes dissolve into wispy turbulent smoke
 * 5 - Constellation Writer: strokes become star-connected dot patterns
 */

export class GravitationalCalligraphy {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 60;

        // Active strokes
        this.strokes = [];
        this.maxStrokes = 20;
        this._currentStroke = null;

        // Mouse tracking
        this._mx = 0;
        this._my = 0;
        this._prevMx = 0;
        this._prevMy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._isDrawing = false;
        this._drawCooldown = 0;

        // Style params
        this.brushWidth = 3;
        this.brushTaper = 0.5;
        this.strokeGravity = 0;
        this.strokeDecay = 0.998;
        this.bloomSpeed = 0;
        this.interactionRadius = 150;

        // Evolved elements (branches, shards, etc)
        this.evolvedElements = [];
        this.maxEvolved = 100;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 40 + Math.floor(rng() * 40);
        this.strokes = [];
        this.evolvedElements = [];
        this._currentStroke = null;
        this._isDrawing = false;

        this.brushWidth = 2 + rng() * 5;
        this.brushTaper = 0.3 + rng() * 0.5;
        this.strokeGravity = (rng() - 0.5) * 0.02;
        this.strokeDecay = 0.994 + rng() * 0.005;
        this.bloomSpeed = 0.005 + rng() * 0.01;
        this.interactionRadius = 100 + rng() * 100;

        // Mode-specific
        switch (this.mode) {
            case 0: // Flowing Ink
                this.brushWidth = 3 + rng() * 4;
                this.strokeGravity = 0.01 + rng() * 0.02;
                break;
            case 1: // Shattering Glass
                this.brushWidth = 2 + rng() * 2;
                this.strokeDecay = 0.997 + rng() * 0.002;
                break;
            case 2: // Living Vines
                this.brushWidth = 1.5 + rng() * 2;
                this.bloomSpeed = 0.01 + rng() * 0.02;
                break;
            case 3: // Neon Traces
                this.brushWidth = 2 + rng() * 3;
                break;
            case 4: // Smoke Ribbons
                this.brushWidth = 4 + rng() * 4;
                this.strokeGravity = -0.005 - rng() * 0.01; // smoke rises
                break;
            case 5: // Constellation Writer
                this.brushWidth = 1;
                break;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._prevMx = this._mx;
        this._prevMy = this._my;
        this._mx = mx;
        this._my = my;

        const dx = mx - this._prevMx;
        const dy = my - this._prevMy;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        // Drawing: track continuous movement above speed threshold
        if (this._mouseSpeed > 2) {
            if (!this._isDrawing) {
                // Start new stroke
                this._isDrawing = true;
                this._currentStroke = {
                    points: [],
                    hue: (this.hue + (Math.random() - 0.5) * 40 + 360) % 360,
                    alpha: 0.4,
                    age: 0,
                    evolved: false,
                    vx: 0,
                    vy: 0,
                };
            }

            if (this._currentStroke) {
                this._currentStroke.points.push({
                    x: mx, y: my,
                    width: this.brushWidth * (0.3 + Math.min(this._mouseSpeed / 20, 1) * 0.7),
                    speed: this._mouseSpeed,
                });

                // Cap points per stroke for performance
                if (this._currentStroke.points.length > 80) {
                    this._currentStroke.points.shift();
                }
            }
            this._drawCooldown = 8;
        } else {
            this._drawCooldown = Math.max(0, this._drawCooldown - 1);
            if (this._drawCooldown === 0 && this._isDrawing) {
                // Finish stroke
                this._isDrawing = false;
                if (this._currentStroke && this._currentStroke.points.length > 3) {
                    this.strokes.push(this._currentStroke);
                    if (this.strokes.length > this.maxStrokes) {
                        this.strokes.shift();
                    }
                }
                this._currentStroke = null;
            }
        }

        // Click: special effect on current stroke
        if (isClicking && !this._wasClicking && this._currentStroke) {
            this._currentStroke.hue = (this._currentStroke.hue + 60) % 360;
        }
        this._wasClicking = isClicking;

        // Age and evolve completed strokes
        for (let i = this.strokes.length - 1; i >= 0; i--) {
            const stroke = this.strokes[i];
            stroke.age++;
            stroke.alpha *= this.strokeDecay;

            // Apply gravity to points
            if (this.strokeGravity !== 0) {
                for (const pt of stroke.points) {
                    pt.y += this.strokeGravity * stroke.age * 0.1;
                }
            }

            // Evolve strokes (mode-specific transformations)
            if (!stroke.evolved && stroke.age > 60) {
                stroke.evolved = true;
                this._evolveStroke(stroke);
            }

            // Remove faded strokes
            if (stroke.alpha < 0.005) {
                this.strokes[i] = this.strokes[this.strokes.length - 1];
                this.strokes.pop();
            }
        }

        // Update evolved elements
        for (let i = this.evolvedElements.length - 1; i >= 0; i--) {
            const el = this.evolvedElements[i];
            el.life--;
            el.x += el.vx;
            el.y += el.vy;
            if (this.mode === 4) el.vy -= 0.02; // smoke rises

            if (el.life <= 0) {
                this.evolvedElements[i] = this.evolvedElements[this.evolvedElements.length - 1];
                this.evolvedElements.pop();
            }
        }
    }

    _evolveStroke(stroke) {
        if (this.evolvedElements.length > this.maxEvolved) return;

        switch (this.mode) {
            case 1: { // Shattering - create angular shards from stroke
                const step = Math.max(2, Math.floor(stroke.points.length / 8));
                for (let i = 0; i < stroke.points.length - 1; i += step) {
                    const pt = stroke.points[i];
                    this.evolvedElements.push({
                        x: pt.x, y: pt.y,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5,
                        size: pt.width * 2,
                        angle: Math.random() * Math.PI * 2,
                        life: 80 + Math.random() * 60,
                        maxLife: 140,
                        hue: stroke.hue,
                        type: 'shard',
                    });
                }
                break;
            }
            case 2: { // Vines - grow tendrils from endpoints
                const endpoints = [
                    stroke.points[0],
                    stroke.points[stroke.points.length - 1],
                    stroke.points[Math.floor(stroke.points.length / 2)],
                ];
                for (const pt of endpoints) {
                    if (!pt) continue;
                    const branchAngle = Math.random() * Math.PI * 2;
                    for (let b = 0; b < 3; b++) {
                        const a = branchAngle + b * (Math.PI * 2 / 3);
                        this.evolvedElements.push({
                            x: pt.x, y: pt.y,
                            vx: Math.cos(a) * 0.3,
                            vy: Math.sin(a) * 0.3,
                            size: 3,
                            life: 120 + Math.random() * 80,
                            maxLife: 200,
                            hue: (stroke.hue + 20) % 360,
                            type: 'tendril',
                            trail: [{ x: pt.x, y: pt.y }],
                        });
                    }
                }
                break;
            }
            case 4: { // Smoke - dissolve into wisps
                const step = Math.max(1, Math.floor(stroke.points.length / 12));
                for (let i = 0; i < stroke.points.length; i += step) {
                    const pt = stroke.points[i];
                    this.evolvedElements.push({
                        x: pt.x, y: pt.y,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: -0.3 - Math.random() * 0.5,
                        size: pt.width * 3,
                        life: 100 + Math.random() * 80,
                        maxLife: 180,
                        hue: stroke.hue,
                        type: 'smoke',
                    });
                }
                break;
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw completed strokes
        for (const stroke of this.strokes) {
            this._drawStroke(ctx, stroke);
        }

        // Draw active stroke
        if (this._currentStroke && this._currentStroke.points.length > 1) {
            this._drawStroke(ctx, this._currentStroke);
        }

        // Draw evolved elements
        this._drawEvolved(ctx);

        ctx.restore();
    }

    _drawStroke(ctx, stroke) {
        const pts = stroke.points;
        if (pts.length < 2) return;
        const alpha = stroke.alpha || 0.4;

        switch (this.mode) {
            case 0: // Flowing Ink - smooth tapered line
            case 4: // Smoke Ribbons - wide soft strokes
                this._drawTaperedStroke(ctx, pts, stroke.hue, alpha);
                break;
            case 1: // Shattering Glass - angular connected segments
                this._drawAngularStroke(ctx, pts, stroke.hue, alpha);
                break;
            case 2: // Living Vines - organic curves with thickness variation
                this._drawVineStroke(ctx, pts, stroke.hue, alpha);
                break;
            case 3: // Neon Traces - glowing double-line
                this._drawNeonStroke(ctx, pts, stroke.hue, alpha);
                break;
            case 5: // Constellation Writer - dots with thin connections
                this._drawConstellationStroke(ctx, pts, stroke.hue, alpha);
                break;
        }
    }

    _drawTaperedStroke(ctx, pts, hue, alpha) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1];
            const p1 = pts[i];
            const t = i / pts.length;
            // Taper: thin at start and end, thick in middle
            const taper = Math.sin(t * Math.PI) * this.brushTaper + (1 - this.brushTaper);
            const w = p1.width * taper;
            const segAlpha = alpha * (0.5 + t * 0.5);

            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${segAlpha})`;
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        }

        // Ink pool at endpoint
        if (this.mode === 0 && pts.length > 5) {
            const last = pts[pts.length - 1];
            const poolSize = last.width * 1.5;
            const grad = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, poolSize);
            grad.addColorStop(0, `hsla(${hue}, ${this.saturation}%, 50%, ${alpha * 0.3})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(last.x, last.y, poolSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawAngularStroke(ctx, pts, hue, alpha) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${alpha * 0.7})`;
        ctx.beginPath();

        for (let i = 0; i < pts.length; i++) {
            if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
            else ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // Angular accent marks at direction changes
        for (let i = 2; i < pts.length; i += 3) {
            const p = pts[i];
            const prev = pts[i - 2];
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const angle = Math.atan2(dy, dx);
            const sz = p.width;

            ctx.strokeStyle = `hsla(${(hue + 30) % 360}, ${this.saturation}%, 70%, ${alpha * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(p.x - Math.cos(angle + 1) * sz, p.y - Math.sin(angle + 1) * sz);
            ctx.lineTo(p.x, p.y);
            ctx.lineTo(p.x - Math.cos(angle - 1) * sz, p.y - Math.sin(angle - 1) * sz);
            ctx.stroke();
        }
    }

    _drawVineStroke(ctx, pts, hue, alpha) {
        // Main vine
        ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 45%, ${alpha * 0.5})`;
        ctx.lineWidth = this.brushWidth * 0.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const cur = pts[i];
            const cpx = (prev.x + cur.x) / 2;
            const cpy = (prev.y + cur.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
        }
        ctx.stroke();

        // Small leaf dots along the vine
        for (let i = 0; i < pts.length; i += 4) {
            const p = pts[i];
            const leafSize = 2 + Math.sin(i + this.tick * 0.05) * 1;
            ctx.fillStyle = `hsla(${(hue + 30) % 360}, ${this.saturation + 10}%, 50%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(
                p.x + Math.sin(i * 0.5 + this.tick * 0.02) * 5,
                p.y + Math.cos(i * 0.5 + this.tick * 0.02) * 5,
                leafSize, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    _drawNeonStroke(ctx, pts, hue, alpha) {
        // Outer glow
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = `hsla(${hue}, ${this.saturation + 20}%, 50%, ${alpha * 0.15})`;
        ctx.lineWidth = this.brushWidth * 3;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // Core bright line
        ctx.strokeStyle = `hsla(${hue}, ${this.saturation + 20}%, 80%, ${alpha * 0.5})`;
        ctx.lineWidth = this.brushWidth * 0.5;
        ctx.stroke();

        // Flicker effect
        if (Math.random() > 0.9) {
            ctx.strokeStyle = `hsla(${hue}, 90%, 95%, ${alpha * 0.7})`;
            ctx.lineWidth = this.brushWidth * 0.3;
            ctx.stroke();
        }
    }

    _drawConstellationStroke(ctx, pts, hue, alpha) {
        // Star dots
        const step = Math.max(1, Math.floor(pts.length / 15));
        const starPts = [];

        for (let i = 0; i < pts.length; i += step) {
            starPts.push(pts[i]);
        }

        // Connections
        ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha * 0.15})`;
        ctx.lineWidth = 0.5;
        for (let i = 1; i < starPts.length; i++) {
            ctx.beginPath();
            ctx.moveTo(starPts[i - 1].x, starPts[i - 1].y);
            ctx.lineTo(starPts[i].x, starPts[i].y);
            ctx.stroke();
        }

        // Stars
        for (let i = 0; i < starPts.length; i++) {
            const p = starPts[i];
            const twinkle = 0.5 + Math.sin(this.tick * 0.1 + i * 1.5) * 0.3;

            // Glow
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 70%, ${alpha * twinkle * 0.2})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 90%, ${alpha * twinkle * 0.4})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawEvolved(ctx) {
        for (const el of this.evolvedElements) {
            const lifeFrac = el.life / el.maxLife;
            const alpha = lifeFrac * 0.25;

            switch (el.type) {
                case 'shard': {
                    const sz = el.size * lifeFrac;
                    ctx.save();
                    ctx.translate(el.x, el.y);
                    ctx.rotate(el.angle + this.tick * 0.02);
                    ctx.strokeStyle = `hsla(${el.hue}, ${this.saturation}%, 65%, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(-sz, -sz * 0.3);
                    ctx.lineTo(sz, 0);
                    ctx.lineTo(-sz * 0.5, sz * 0.5);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.restore();
                    break;
                }
                case 'tendril': {
                    // Record trail
                    if (el.trail) {
                        el.trail.push({ x: el.x, y: el.y });
                        if (el.trail.length > 20) el.trail.shift();

                        ctx.strokeStyle = `hsla(${el.hue}, ${this.saturation}%, 50%, ${alpha * 0.5})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(el.trail[0].x, el.trail[0].y);
                        for (let i = 1; i < el.trail.length; i++) {
                            ctx.lineTo(el.trail[i].x, el.trail[i].y);
                        }
                        ctx.stroke();
                    }

                    // Tip
                    ctx.fillStyle = `hsla(${(el.hue + 20) % 360}, ${this.saturation + 10}%, 55%, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(el.x, el.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'smoke': {
                    const smokeSize = el.size * (1.5 - lifeFrac * 0.5);
                    const grad = ctx.createRadialGradient(el.x, el.y, 0, el.x, el.y, smokeSize);
                    grad.addColorStop(0, `hsla(${el.hue}, 20%, 50%, ${alpha * 0.3})`);
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(el.x, el.y, smokeSize, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
            }
        }
    }
}
