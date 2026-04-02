/**
 * @file geometric_tessellation_effects.js
 * @description Animated tessellating geometric patterns that tile the screen. Each
 * tile reacts to mouse proximity by flipping, rotating, color-shifting, or scaling.
 * The tessellation pattern, tile shape, and reaction style all vary by seed.
 *
 * Modes:
 * 0 - Hexagonal: Honeycomb tiles that ripple and breathe with cursor proximity
 * 1 - Penrose: Quasi-periodic aperiodic tiling with two rhomb types
 * 2 - Escher: Interlocking fish/bird shapes that animate between two states
 * 3 - Voronoi Shatter: Irregular shattered-glass tiles that refract light toward cursor
 * 4 - Islamic Star: Complex star-and-cross patterns that rotate and kaleidoscope
 * 5 - Truchet Maze: Connected quarter-circle arcs forming flowing maze paths
 */

const TAU = Math.PI * 2;
const SQRT3 = Math.sqrt(3);

export class GeometricTessellation {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 60;
        this.intensity = 1;
        this._rng = Math.random;

        this.tiles = [];
        this.tileSize = 40;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._mouseSpeed = 0;
        this._prevMX = 0;
        this._prevMY = 0;

        // Per-tile state
        this._tileFlip = null;
        this._tileRotation = null;
        this._tileScale = null;

        // Truchet orientations
        this._truchetOrient = null;

        // Voronoi points
        this._voronoiPoints = null;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 40 + Math.floor(rng() * 40);
        this.intensity = 0.5 + rng() * 0.6;
        this.tick = 0;

        const W = window.innerWidth, H = window.innerHeight;
        this.tileSize = 30 + Math.floor(rng() * 30);

        this.tiles = [];

        switch (this.mode) {
            case 0: this._setupHexagonal(rng, W, H); break;
            case 1: this._setupPenrose(rng, W, H); break;
            case 2: this._setupEscher(rng, W, H); break;
            case 3: this._setupVoronoi(rng, W, H); break;
            case 4: this._setupIslamicStar(rng, W, H); break;
            case 5: this._setupTruchet(rng, W, H); break;
        }

        this._tileFlip = new Float32Array(this.tiles.length);
        this._tileRotation = new Float32Array(this.tiles.length);
        this._tileScale = new Float32Array(this.tiles.length);
        for (let i = 0; i < this.tiles.length; i++) {
            this._tileScale[i] = 1;
        }
    }

    _setupHexagonal(rng, W, H) {
        const s = this.tileSize;
        const h = s * SQRT3 / 2;
        const cols = Math.ceil(W / (s * 1.5)) + 2;
        const rows = Math.ceil(H / h) + 2;

        for (let r = -1; r < rows; r++) {
            for (let c = -1; c < cols; c++) {
                const x = c * s * 1.5;
                const y = r * h * 2 + (c % 2 === 0 ? 0 : h);
                this.tiles.push({
                    x, y, type: 'hex', size: s,
                    hueOffset: rng() * 30 - 15,
                    reactStyle: Math.floor(rng() * 3), // 0=scale, 1=rotate, 2=brighten
                });
            }
        }
    }

    _setupPenrose(rng, W, H) {
        // Simplified Penrose-like pattern using two rhombus types
        const s = this.tileSize * 1.2;
        const cx = W / 2, cy = H / 2;
        const golden = (1 + Math.sqrt(5)) / 2;

        // Generate from a fivefold symmetric grid
        for (let k = 0; k < 5; k++) {
            const angle = (k / 5) * TAU;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const spacing = s * 0.8;
            const count = Math.ceil(Math.max(W, H) / spacing) + 2;

            for (let i = -count; i < count; i++) {
                const ox = cx + cos * i * spacing;
                const oy = cy + sin * i * spacing;
                if (ox > -s && ox < W + s && oy > -s && oy < H + s) {
                    this.tiles.push({
                        x: ox, y: oy,
                        type: i % 2 === 0 ? 'thin' : 'thick',
                        angle: angle,
                        size: s * 0.4,
                        hueOffset: k * 20 + rng() * 10,
                        reactStyle: Math.floor(rng() * 3),
                    });
                }
            }
        }
    }

    _setupEscher(rng, W, H) {
        const s = this.tileSize * 1.5;
        const cols = Math.ceil(W / s) + 2;
        const rows = Math.ceil(H / s) + 2;

        for (let r = -1; r < rows; r++) {
            for (let c = -1; c < cols; c++) {
                const isAlt = (r + c) % 2 === 0;
                this.tiles.push({
                    x: c * s, y: r * s,
                    type: isAlt ? 'bird' : 'fish',
                    size: s,
                    hueOffset: isAlt ? 0 : 60,
                    morphPhase: rng() * TAU,
                    morphSpeed: 0.01 + rng() * 0.02,
                    reactStyle: Math.floor(rng() * 3),
                });
            }
        }
    }

    _setupVoronoi(rng, W, H) {
        const count = 40 + Math.floor(rng() * 40);
        this._voronoiPoints = [];
        for (let i = 0; i < count; i++) {
            this._voronoiPoints.push({
                x: rng() * W,
                y: rng() * H,
                vx: (rng() - 0.5) * 0.3,
                vy: (rng() - 0.5) * 0.3,
            });
            this.tiles.push({
                x: this._voronoiPoints[i].x,
                y: this._voronoiPoints[i].y,
                type: 'voronoi',
                size: 0,
                hueOffset: rng() * 60,
                reactStyle: Math.floor(rng() * 3),
            });
        }
    }

    _setupIslamicStar(rng, W, H) {
        const s = this.tileSize * 2;
        const cols = Math.ceil(W / s) + 2;
        const rows = Math.ceil(H / s) + 2;

        for (let r = -1; r < rows; r++) {
            for (let c = -1; c < cols; c++) {
                this.tiles.push({
                    x: c * s + (r % 2 === 0 ? 0 : s / 2),
                    y: r * s,
                    type: 'star',
                    points: 6 + Math.floor(rng() * 3) * 2, // 6, 8, or 10 pointed
                    size: s * 0.45,
                    innerRatio: 0.3 + rng() * 0.3,
                    hueOffset: (r * 10 + c * 10) % 60,
                    reactStyle: Math.floor(rng() * 3),
                });
            }
        }
    }

    _setupTruchet(rng, W, H) {
        const s = this.tileSize;
        const cols = Math.ceil(W / s) + 2;
        const rows = Math.ceil(H / s) + 2;
        this._truchetOrient = [];

        for (let r = -1; r < rows; r++) {
            for (let c = -1; c < cols; c++) {
                const orient = rng() < 0.5 ? 0 : 1; // Two orientations
                this._truchetOrient.push(orient);
                this.tiles.push({
                    x: c * s, y: r * s,
                    type: 'truchet',
                    orient,
                    size: s,
                    hueOffset: (r * 5 + c * 7) % 60,
                    reactStyle: Math.floor(rng() * 3),
                });
            }
        }
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
            // Click: send a ripple wave from click point
            for (let i = 0; i < this.tiles.length; i++) {
                const t = this.tiles[i];
                const tdx = t.x - mx, tdy = t.y - my;
                const dist = Math.sqrt(tdx * tdx + tdy * tdy);
                if (dist < 300) {
                    this._tileFlip[i] = (1 - dist / 300) * Math.PI;
                    this._tileRotation[i] += (1 - dist / 300) * 0.5;
                }
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Update tile states based on cursor proximity
        const interactRadius = isClicking ? 250 : 150;
        for (let i = 0; i < this.tiles.length; i++) {
            const t = this.tiles[i];
            const tdx = t.x - mx, tdy = t.y - my;
            const dist = Math.sqrt(tdx * tdx + tdy * tdy);

            // Proximity reaction
            if (dist < interactRadius) {
                const influence = (1 - dist / interactRadius);
                if (t.reactStyle === 0) {
                    this._tileScale[i] += (1 + influence * 0.5 - this._tileScale[i]) * 0.1;
                } else if (t.reactStyle === 1) {
                    this._tileRotation[i] += influence * 0.03;
                } else {
                    // Brighten handled in draw
                }
            }

            // Decay
            this._tileFlip[i] *= 0.92;
            this._tileScale[i] += (1 - this._tileScale[i]) * 0.05;
        }

        // Voronoi: move points slowly
        if (this.mode === 3 && this._voronoiPoints) {
            const W = window.innerWidth, H = window.innerHeight;
            for (let i = 0; i < this._voronoiPoints.length; i++) {
                const vp = this._voronoiPoints[i];
                // Cursor repels nearby points
                const vdx = vp.x - mx, vdy = vp.y - my;
                const vdist = Math.sqrt(vdx * vdx + vdy * vdy) || 1;
                if (vdist < 200) {
                    vp.vx += (vdx / vdist) * 0.1 * (1 - vdist / 200);
                    vp.vy += (vdy / vdist) * 0.1 * (1 - vdist / 200);
                }
                vp.x += vp.vx;
                vp.y += vp.vy;
                vp.vx *= 0.98;
                vp.vy *= 0.98;
                if (vp.x < 0 || vp.x > W) vp.vx *= -1;
                if (vp.y < 0 || vp.y > H) vp.vy *= -1;
                this.tiles[i].x = vp.x;
                this.tiles[i].y = vp.y;
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const mx = this._mouseX, my = this._mouseY;
        const interactRadius = this._isClicking ? 250 : 150;

        for (let i = 0; i < this.tiles.length; i++) {
            const t = this.tiles[i];
            // Cull offscreen tiles
            if (t.x < -this.tileSize * 2 || t.x > system.width + this.tileSize * 2 ||
                t.y < -this.tileSize * 2 || t.y > system.height + this.tileSize * 2) continue;

            const tdx = t.x - mx, tdy = t.y - my;
            const dist = Math.sqrt(tdx * tdx + tdy * tdy);
            const proximity = dist < interactRadius ? (1 - dist / interactRadius) : 0;

            const hue = (this.hue + t.hueOffset + this.tick * 0.1) % 360;
            const baseLightness = 40 + (t.reactStyle === 2 ? proximity * 30 : 0);
            const baseAlpha = (0.04 + proximity * 0.12 + Math.abs(this._tileFlip[i]) * 0.08) * this.intensity;

            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(this._tileRotation[i]);
            const sc = this._tileScale[i];
            ctx.scale(sc, sc);

            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, ${baseLightness}%, ${baseAlpha})`;
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${baseLightness}%, ${baseAlpha * 0.3})`;
            ctx.lineWidth = 0.5 + proximity;

            switch (t.type) {
                case 'hex':
                    this._drawHex(ctx, t.size * 0.45);
                    break;
                case 'thin':
                case 'thick':
                    this._drawRhombus(ctx, t.size, t.type === 'thin' ? 0.3 : 0.6, t.angle || 0);
                    break;
                case 'bird':
                case 'fish':
                    this._drawEscher(ctx, t);
                    break;
                case 'voronoi':
                    this._drawVoronoiCell(ctx, t, i, proximity);
                    break;
                case 'star':
                    this._drawStar(ctx, t);
                    break;
                case 'truchet':
                    this._drawTruchet(ctx, t, proximity);
                    break;
            }

            ctx.restore();
        }

        ctx.restore();
    }

    _drawHex(ctx, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * TAU - Math.PI / 6;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawRhombus(ctx, size, ratio, angle) {
        const w = size, h = size * ratio;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    _drawEscher(ctx, tile) {
        const s = tile.size * 0.4;
        const morph = Math.sin(this.tick * (tile.morphSpeed || 0.01) + (tile.morphPhase || 0));
        const curve = s * 0.3 * morph;

        ctx.beginPath();
        ctx.moveTo(-s, -s);
        ctx.quadraticCurveTo(-s + curve, 0, -s, s);
        ctx.quadraticCurveTo(0, s + curve, s, s);
        ctx.quadraticCurveTo(s - curve, 0, s, -s);
        ctx.quadraticCurveTo(0, -s - curve, -s, -s);
        ctx.fill();
        ctx.stroke();
    }

    _drawVoronoiCell(ctx, tile, index, proximity) {
        // Draw as a point with emanating lines
        const r = 3 + proximity * 8;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();

        // Rays toward neighboring points
        if (this._voronoiPoints && proximity > 0.1) {
            const vp = this._voronoiPoints[index];
            if (!vp) return;
            for (let j = 0; j < this._voronoiPoints.length; j++) {
                if (j === index) continue;
                const other = this._voronoiPoints[j];
                const dx = other.x - vp.x, dy = other.y - vp.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 150) {
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(dx * 0.45, dy * 0.45);
                    ctx.stroke();
                }
            }
        }
    }

    _drawStar(ctx, tile) {
        const pts = tile.points || 8;
        const outer = tile.size;
        const inner = tile.size * (tile.innerRatio || 0.4);

        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
            const angle = (i / (pts * 2)) * TAU - Math.PI / 2;
            const r = i % 2 === 0 ? outer : inner;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawTruchet(ctx, tile, proximity) {
        const s = tile.size / 2;
        const orient = tile.orient;
        const arcR = s;

        ctx.lineWidth = 1 + proximity * 2;

        if (orient === 0) {
            // Top-left to bottom-right arcs
            ctx.beginPath();
            ctx.arc(-s, -s, arcR, 0, Math.PI / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(s, s, arcR, Math.PI, Math.PI * 1.5);
            ctx.stroke();
        } else {
            // Top-right to bottom-left arcs
            ctx.beginPath();
            ctx.arc(s, -s, arcR, Math.PI / 2, Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-s, s, arcR, Math.PI * 1.5, TAU);
            ctx.stroke();
        }
    }
}
