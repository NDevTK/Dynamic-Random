/**
 * @file holographic_foil_effects.js
 * @description Iridescent holographic shimmer effect like holographic trading cards or
 * credit card security foils. The effect creates rainbow prismatic patterns that shift
 * color based on cursor position (simulating viewing angle). Clicking creates "scratch"
 * reveals that expose hidden holographic patterns beneath.
 *
 * Modes:
 * 0 - Trading Card: Diagonal stripe shimmer that shifts rainbow colors with mouse angle
 * 1 - Oil Slick: Organic blobby iridescent patches that flow and merge like oil on water
 * 2 - Diffraction Grating: Precise parallel lines creating spectral decomposition
 * 3 - Butterfly Wing: Fractal-like scales with structural color that shifts per-cell
 * 4 - Soap Film: Thin-film interference with Newton's rings expanding from click points
 * 5 - Holographic Sticker: Grid of tiny holographic cells each reflecting differently
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class HolographicFoil {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Shimmer parameters
        this._stripeAngle = 0;
        this._stripeSpacing = 20;
        this._shimmerSpeed = 1;
        this._rainbowSpread = 1;

        // Oil slick blobs
        this._blobs = [];

        // Click reveals (Newton's rings)
        this._rings = [];
        this._ringPool = [];

        // Butterfly scales
        this._scaleSize = 0;
        this._scaleRows = 0;
        this._scaleCols = 0;

        // Holographic grid cells
        this._cellSize = 0;
        this._gridPhase = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 0;
        this.intensity = 0.4 + rng() * 0.6;
        this._rings = [];
        this._blobs = [];

        this._stripeAngle = rng() * Math.PI;
        this._stripeSpacing = 12 + rng() * 30;
        this._shimmerSpeed = 0.5 + rng() * 2;
        this._rainbowSpread = 0.5 + rng() * 1.5;
        this._gridPhase = rng() * TAU;

        const W = window.innerWidth, H = window.innerHeight;

        if (this.mode === 1) {
            // Oil slick blobs
            const count = 5 + Math.floor(rng() * 8);
            for (let i = 0; i < count; i++) {
                this._blobs.push({
                    x: rng() * W,
                    y: rng() * H,
                    vx: (rng() - 0.5) * 0.5,
                    vy: (rng() - 0.5) * 0.5,
                    radius: 60 + rng() * 140,
                    phase: rng() * TAU,
                    phaseSpeed: 0.005 + rng() * 0.02,
                    hueOffset: rng() * 360,
                });
            }
        }

        if (this.mode === 3) {
            this._scaleSize = 20 + Math.floor(rng() * 20);
            this._scaleCols = Math.ceil(W / this._scaleSize) + 1;
            this._scaleRows = Math.ceil(H / (this._scaleSize * 0.866)) + 1;
        }

        if (this.mode === 5) {
            this._cellSize = 30 + Math.floor(rng() * 40);
        }
    }

    update(mx, my, isClicking, system) {
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._wasClicking = this._isClicking;
        this._isClicking = isClicking;
        this.tick++;

        // Click spawns Newton's rings
        if (this._isClicking && !this._wasClicking) {
            if (this._rings.length < 8) {
                const ring = this._ringPool.length > 0 ? this._ringPool.pop() : {};
                ring.x = mx;
                ring.y = my;
                ring.radius = 0;
                ring.maxRadius = 150 + Math.random() * 150;
                ring.life = 1;
                ring.ringCount = 5 + Math.floor(Math.random() * 8);
                this._rings.push(ring);
            }
        }

        // Update rings
        for (let i = this._rings.length - 1; i >= 0; i--) {
            const r = this._rings[i];
            r.radius += 2;
            r.life = Math.max(0, 1 - r.radius / r.maxRadius);
            if (r.life <= 0) {
                this._ringPool.push(r);
                this._rings[i] = this._rings[this._rings.length - 1];
                this._rings.pop();
            }
        }

        // Update oil blobs
        if (this.mode === 1) {
            const W = window.innerWidth, H = window.innerHeight;
            for (const b of this._blobs) {
                b.x += b.vx;
                b.y += b.vy;
                b.phase += b.phaseSpeed;
                // Mouse repulsion
                const dx = b.x - mx;
                const dy = b.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && dist > 1) {
                    b.vx += (dx / dist) * 0.1;
                    b.vy += (dy / dist) * 0.1;
                }
                b.vx *= 0.98;
                b.vy *= 0.98;
                // Wrap
                if (b.x < -b.radius) b.x = W + b.radius;
                if (b.x > W + b.radius) b.x = -b.radius;
                if (b.y < -b.radius) b.y = H + b.radius;
                if (b.y > H + b.radius) b.y = -b.radius;
            }
        }
    }

    draw(ctx, system) {
        const W = system.width;
        const H = system.height;
        const mx = this._mx;
        const my = this._my;
        // Angle from center to mouse (simulates viewing angle)
        const viewAngle = Math.atan2(my - H / 2, mx - W / 2);
        const viewDist = Math.sqrt((mx - W / 2) ** 2 + (my - H / 2) ** 2) / Math.max(W, H);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.intensity * 0.3;

        if (this.mode === 0) {
            this._drawTradingCard(ctx, W, H, viewAngle, viewDist);
        } else if (this.mode === 1) {
            this._drawOilSlick(ctx, W, H, viewAngle);
        } else if (this.mode === 2) {
            this._drawDiffraction(ctx, W, H, mx, my);
        } else if (this.mode === 3) {
            this._drawButterflyWing(ctx, W, H, mx, my, viewAngle);
        } else if (this.mode === 4) {
            this._drawSoapFilm(ctx, W, H, mx, my);
        } else if (this.mode === 5) {
            this._drawHolographicSticker(ctx, W, H, mx, my, viewAngle);
        }

        // Draw Newton's rings from clicks (all modes)
        this._drawRings(ctx);

        ctx.restore();
    }

    _drawTradingCard(ctx, W, H, viewAngle, viewDist) {
        const cos = Math.cos(this._stripeAngle);
        const sin = Math.sin(this._stripeAngle);
        const timeShift = this.tick * this._shimmerSpeed * 0.5;
        const angleShift = viewAngle * 60 * this._rainbowSpread;

        // Draw shimmer stripes
        const step = Math.max(4, Math.floor(this._stripeSpacing / 2));
        const diag = Math.sqrt(W * W + H * H);

        for (let d = -diag; d < diag * 2; d += step) {
            const proj = d + timeShift + angleShift;
            const hue = ((proj * 2) % 360 + 360) % 360;
            const brightness = 0.3 + 0.2 * Math.sin(proj * 0.1 + viewDist * 10);

            ctx.strokeStyle = `hsla(${hue}, 90%, ${50 + brightness * 30}%, ${brightness})`;
            ctx.lineWidth = step * 0.6;
            ctx.beginPath();
            const x1 = d * cos - diag * sin;
            const y1 = d * sin + diag * cos;
            const x2 = d * cos + diag * sin;
            const y2 = d * sin - diag * cos;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    _drawOilSlick(ctx, W, H, viewAngle) {
        for (const b of this._blobs) {
            const hue = (b.hueOffset + viewAngle * 30 + this.tick * 0.5) % 360;
            const pulse = 1 + 0.15 * Math.sin(b.phase);
            const r = b.radius * pulse;

            const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
            g.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.15)`);
            g.addColorStop(0.3, `hsla(${(hue + 60) % 360}, 90%, 60%, 0.1)`);
            g.addColorStop(0.6, `hsla(${(hue + 120) % 360}, 85%, 55%, 0.08)`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, TAU);
            ctx.fill();

            // Interference rings inside blob
            const ringCount = 3;
            for (let i = 1; i <= ringCount; i++) {
                const ringR = r * (i / (ringCount + 1));
                const ringHue = (hue + i * 40 + this.tick * 2) % 360;
                ctx.strokeStyle = `hsla(${ringHue}, 90%, 65%, 0.12)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(b.x, b.y, ringR, 0, TAU);
                ctx.stroke();
            }
        }
    }

    _drawDiffraction(ctx, W, H, mx, my) {
        // Parallel lines that create spectral decomposition based on mouse distance
        const lineCount = Math.floor(H / 3);
        const centerX = W / 2;
        const centerY = H / 2;

        ctx.lineWidth = 1;
        for (let i = 0; i < lineCount; i += 2) {
            const y = i * 3;
            const distToMouse = Math.abs(y - my);
            const proximity = Math.max(0, 1 - distToMouse / 300);

            // Spectral decomposition: hue shifts based on distance from mouse
            const xOffset = mx - centerX;
            const hue = ((i * 4 + xOffset * 0.3 + this.tick * this._shimmerSpeed) % 360 + 360) % 360;
            const alpha = 0.05 + proximity * 0.2;

            ctx.strokeStyle = `hsla(${hue}, 95%, 60%, ${alpha})`;
            ctx.beginPath();
            // Slight wave distortion near mouse
            const wave = proximity * Math.sin(i * 0.1 + this.tick * 0.05) * 10;
            ctx.moveTo(0, y + wave);
            ctx.lineTo(W, y - wave);
            ctx.stroke();
        }
    }

    _drawButterflyWing(ctx, W, H, mx, my, viewAngle) {
        const s = this._scaleSize;
        const halfS = s / 2;

        for (let row = 0; row < this._scaleRows; row++) {
            const yOff = row % 2 === 0 ? 0 : halfS;
            for (let col = 0; col < this._scaleCols; col++) {
                const cx = col * s + yOff;
                const cy = row * s * 0.866;

                // Distance to mouse affects hue shift
                const dx = cx - mx;
                const dy = cy - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const proximity = Math.max(0, 1 - dist / 400);

                // Each cell has unique structural color
                const cellSeed = row * 1000 + col;
                const baseHue = _prand(cellSeed) * 360;
                const hue = (baseHue + viewAngle * 40 + proximity * 60 + this.tick * 0.3) % 360;
                const sat = 70 + proximity * 25;
                const light = 30 + proximity * 30;
                const alpha = 0.03 + proximity * 0.12;

                ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
                // Draw hexagonal scale
                ctx.beginPath();
                for (let v = 0; v < 6; v++) {
                    const angle = (v / 6) * TAU - Math.PI / 6;
                    const px = cx + Math.cos(angle) * halfS;
                    const py = cy + Math.sin(angle) * halfS;
                    if (v === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    _drawSoapFilm(ctx, W, H, mx, my) {
        // Thin-film interference - base shimmer across whole screen
        const t = this.tick * 0.02;
        const gridStep = 8;

        for (let x = 0; x < W; x += gridStep) {
            for (let y = 0; y < H; y += gridStep) {
                const dx = x - mx;
                const dy = y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Interference pattern from multiple wave sources
                const wave1 = Math.sin(dist * 0.03 - t * 2);
                const wave2 = Math.sin(x * 0.02 + y * 0.01 + t);
                const interference = (wave1 + wave2) * 0.5;

                const hue = ((interference * 180 + 180 + this.hue) % 360 + 360) % 360;
                const alpha = Math.abs(interference) * 0.08;

                if (alpha > 0.01) {
                    ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
                    ctx.fillRect(x, y, gridStep, gridStep);
                }
            }
        }
    }

    _drawHolographicSticker(ctx, W, H, mx, my, viewAngle) {
        const cs = this._cellSize;
        const cols = Math.ceil(W / cs) + 1;
        const rows = Math.ceil(H / cs) + 1;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * cs;
                const y = row * cs;

                const dx = x + cs / 2 - mx;
                const dy = y + cs / 2 - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                // Each cell reflects light differently based on its position
                const cellPhase = _prand(row * 500 + col + 7) * TAU;
                const reflectAngle = angle + cellPhase + this._gridPhase;

                // Rainbow based on reflection angle relative to view
                const angleDiff = Math.abs(reflectAngle - viewAngle) % TAU;
                const hue = (angleDiff * 57.3 * 3 + this.tick * 0.5) % 360;

                // Brightness based on "catching the light"
                const catchLight = Math.cos(angleDiff) * 0.5 + 0.5;
                const proximity = Math.max(0, 1 - dist / 500);
                const alpha = (0.02 + catchLight * 0.08 + proximity * 0.05) * this.intensity;

                if (alpha > 0.01) {
                    ctx.fillStyle = `hsla(${hue}, 85%, ${45 + catchLight * 30}%, ${alpha})`;
                    ctx.fillRect(x, y, cs - 1, cs - 1);
                }
            }
        }
    }

    _drawRings(ctx) {
        for (const r of this._rings) {
            for (let i = 0; i < r.ringCount; i++) {
                const ringR = r.radius * (i + 1) / r.ringCount;
                const hue = (i * 50 + this.tick * 2 + this.hue) % 360;
                ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${r.life * 0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(r.x, r.y, ringR, 0, TAU);
                ctx.stroke();
            }
        }
    }
}
