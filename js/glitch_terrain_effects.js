/**
 * @file glitch_terrain_effects.js
 * @description Pseudo-3D terrain renderer with retro wireframe aesthetic and glitch
 * distortions. Terrain is procedurally generated from seed, with mouse controlling
 * camera perspective. Periodic glitch events tear and distort the landscape.
 *
 * Modes:
 * 0 - Vaporwave Sunset: Purple/pink gradient terrain with retro sun
 * 1 - Digital Ocean: Undulating wave terrain with foam particles
 * 2 - Glitch City: Rectangular buildings rising from terrain with glitch artifacts
 * 3 - Alien Planet: Extreme terrain with floating rocks and dual moons
 * 4 - Matrix Rain Terrain: Terrain made of falling character streams
 * 5 - Crystal Cavern: Inverted terrain (ceiling) with stalactite formations
 */

const TAU = Math.PI * 2;

export class GlitchTerrain {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 280;
        this._rng = Math.random;

        // Terrain grid
        this._cols = 60;
        this._rows = 40;
        this._heightMap = null;

        // Camera
        this._camX = 0;
        this._camY = 0;
        this._camTilt = 0.6;
        this._targetTilt = 0.6;
        this._scroll = 0;
        this._scrollSpeed = 0.5;

        // Glitch state
        this._glitchActive = false;
        this._glitchTimer = 0;
        this._glitchCooldown = 120;
        this._glitchLines = [];

        // Vaporwave sun
        this._sunY = 0.3;
        this._sunRadius = 0.15;

        // Buildings for mode 2
        this._buildings = [];

        // Floating rocks for mode 3
        this._floaters = [];

        // Mouse
        this._mouseX = 0;
        this._mouseY = 0;

        // Color scheme
        this._terrainColor1 = '';
        this._terrainColor2 = '';
        this._skyColor = '';
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this._scroll = 0;

        // Generate seed-dependent height map
        this._generateHeightMap(rng);

        // Mode-specific setup
        switch (this.mode) {
            case 0: // Vaporwave
                this._terrainColor1 = `hsl(${280 + rng() * 40}, 80%, 50%)`;
                this._terrainColor2 = `hsl(${320 + rng() * 40}, 90%, 60%)`;
                this._skyColor = `hsl(${260 + rng() * 30}, 70%, 15%)`;
                this._sunY = 0.25 + rng() * 0.15;
                this._scrollSpeed = 0.3 + rng() * 0.4;
                break;
            case 1: // Digital Ocean
                this._terrainColor1 = `hsl(${190 + rng() * 30}, 70%, 40%)`;
                this._terrainColor2 = `hsl(${210 + rng() * 20}, 80%, 60%)`;
                this._scrollSpeed = 0.5 + rng() * 0.3;
                break;
            case 2: // Glitch City
                this._generateBuildings(rng);
                this._terrainColor1 = `hsl(${this.hue}, 60%, 30%)`;
                this._terrainColor2 = `hsl(${this.hue}, 70%, 50%)`;
                this._scrollSpeed = 0.2 + rng() * 0.2;
                break;
            case 3: // Alien Planet
                this._generateFloaters(rng);
                this._terrainColor1 = `hsl(${100 + rng() * 60}, 50%, 30%)`;
                this._terrainColor2 = `hsl(${140 + rng() * 60}, 60%, 50%)`;
                this._scrollSpeed = 0.4 + rng() * 0.3;
                break;
            case 4: // Matrix
                this._terrainColor1 = `hsl(120, 100%, 30%)`;
                this._terrainColor2 = `hsl(120, 100%, 60%)`;
                this._scrollSpeed = 0.6 + rng() * 0.4;
                break;
            case 5: // Crystal Cavern
                this._terrainColor1 = `hsl(${200 + rng() * 60}, 50%, 40%)`;
                this._terrainColor2 = `hsl(${220 + rng() * 40}, 60%, 60%)`;
                this._scrollSpeed = 0.3 + rng() * 0.2;
                break;
        }

        this._glitchCooldown = 80 + Math.floor(rng() * 120);
    }

    _generateHeightMap(rng) {
        // Multi-octave noise approximation using sin combinations
        this._heightMap = new Float32Array(this._cols * this._rows);
        const freqs = [];
        const amps = [];
        const phases = [];
        const octaves = 4;

        for (let o = 0; o < octaves; o++) {
            freqs.push(0.05 + rng() * 0.15 * (o + 1));
            amps.push(1 / (o + 1));
            phases.push(rng() * TAU);
        }

        for (let y = 0; y < this._rows; y++) {
            for (let x = 0; x < this._cols; x++) {
                let h = 0;
                for (let o = 0; o < octaves; o++) {
                    h += Math.sin(x * freqs[o] + phases[o]) *
                         Math.cos(y * freqs[o] * 0.7 + phases[o] * 1.3) *
                         amps[o];
                }
                this._heightMap[y * this._cols + x] = h;
            }
        }
    }

    _generateBuildings(rng) {
        this._buildings = [];
        const count = 8 + Math.floor(rng() * 12);
        for (let i = 0; i < count; i++) {
            this._buildings.push({
                col: Math.floor(rng() * this._cols),
                row: Math.floor(rng() * (this._rows * 0.5)) + this._rows * 0.2,
                width: 1 + Math.floor(rng() * 3),
                height: 0.5 + rng() * 2,
                hue: this.hue + rng() * 40,
                lit: rng() > 0.5, // Windows lit?
            });
        }
    }

    _generateFloaters(rng) {
        this._floaters = [];
        const count = 4 + Math.floor(rng() * 6);
        for (let i = 0; i < count; i++) {
            this._floaters.push({
                x: rng(),
                y: 0.1 + rng() * 0.3,
                size: 0.02 + rng() * 0.04,
                bobSpeed: 0.01 + rng() * 0.02,
                bobPhase: rng() * TAU,
                hue: 100 + rng() * 160,
            });
        }
    }

    _getHeight(col, row) {
        const c = ((col % this._cols) + this._cols) % this._cols;
        const r = Math.max(0, Math.min(this._rows - 1, Math.floor(row)));
        return this._heightMap[r * this._cols + c] || 0;
    }

    _project(x, y, z, w, h) {
        // Simple perspective projection
        const fov = 200;
        const camZ = -2;
        const dz = z - camZ;
        if (dz <= 0.1) return null;
        const scale = fov / dz;
        const inverted = this.mode === 5;
        const yMult = inverted ? -1 : 1;
        return {
            sx: w / 2 + (x - this._camX) * scale,
            sy: h * this._camTilt + (y * yMult) * scale,
            scale,
        };
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;

        this._mouseX = system.mouse ? system.mouse.x / w : 0.5;
        this._mouseY = system.mouse ? system.mouse.y / h : 0.5;

        // Camera follows mouse
        this._camX += (this._mouseX - 0.5) * 0.02;
        this._targetTilt = 0.5 + this._mouseY * 0.3;
        this._camTilt += (this._targetTilt - this._camTilt) * 0.05;

        // Scroll terrain
        this._scroll += this._scrollSpeed;

        // Glitch timing
        this._glitchTimer++;
        if (this._glitchTimer >= this._glitchCooldown) {
            this._glitchTimer = 0;
            this._glitchActive = true;
            this._glitchLines = [];
            const lineCount = 3 + Math.floor(this._rng() * 5);
            for (let i = 0; i < lineCount; i++) {
                this._glitchLines.push({
                    y: this._rng(),
                    height: 0.01 + this._rng() * 0.05,
                    offset: (this._rng() - 0.5) * 0.1,
                    duration: 5 + Math.floor(this._rng() * 10),
                });
            }
        }

        // Decay glitch
        if (this._glitchActive) {
            let anyActive = false;
            for (const g of this._glitchLines) {
                g.duration--;
                if (g.duration > 0) anyActive = true;
            }
            if (!anyActive) this._glitchActive = false;
        }

        // Animate floating rocks
        for (const f of this._floaters) {
            f.y = f.y + Math.sin(this.tick * f.bobSpeed + f.bobPhase) * 0.0005;
        }
    }

    draw(ctx, system) {
        const w = system.width;
        const h = system.height;

        ctx.save();

        // Draw terrain as wireframe grid
        const cols = this._cols;
        const rows = this._rows;
        const scrollOffset = this._scroll;

        // Vaporwave sun (mode 0)
        if (this.mode === 0) {
            const sunX = w / 2;
            const sunY = h * this._sunY;
            const sunR = Math.min(w, h) * this._sunRadius;

            const grad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
            grad.addColorStop(0, 'hsla(50, 100%, 80%, 0.8)');
            grad.addColorStop(0.3, 'hsla(30, 100%, 60%, 0.6)');
            grad.addColorStop(0.7, 'hsla(340, 90%, 50%, 0.3)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, 0, TAU);
            ctx.fill();

            // Horizontal scan lines through sun
            ctx.globalCompositeOperation = 'destination-out';
            for (let i = 0; i < 8; i++) {
                const ly = sunY - sunR + (i / 8) * sunR * 2;
                const lineH = 2 + i * 0.5;
                ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + i * 0.05})`;
                ctx.fillRect(sunX - sunR, ly, sunR * 2, lineH);
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Alien planet moons (mode 3)
        if (this.mode === 3) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = `hsla(${this.hue + 60}, 30%, 70%, 0.4)`;
            ctx.beginPath();
            ctx.arc(w * 0.2, h * 0.15, 30, 0, TAU);
            ctx.fill();
            ctx.fillStyle = `hsla(${this.hue + 120}, 40%, 60%, 0.3)`;
            ctx.beginPath();
            ctx.arc(w * 0.75, h * 0.1, 20, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Draw wireframe terrain
        ctx.globalCompositeOperation = 'lighter';
        const cellW = w / (cols - 1);

        for (let row = 0; row < rows - 1; row++) {
            const z1 = row * 0.3 + 1;
            const z2 = (row + 1) * 0.3 + 1;

            // Depth-based alpha and color
            const depthAlpha = Math.max(0.05, 1 - row / rows);
            const depthHue = (this.hue + row * 2) % 360;

            // Row-based ocean wave for mode 1
            const waveOffset = this.mode === 1 ?
                Math.sin(row * 0.3 + this.tick * 0.03) * 0.3 : 0;

            ctx.beginPath();
            ctx.strokeStyle = `hsla(${depthHue}, 70%, 55%, ${depthAlpha * 0.5})`;
            ctx.lineWidth = Math.max(0.5, 2 - row * 0.05);

            for (let col = 0; col < cols; col++) {
                const scrolledCol = (col + Math.floor(scrollOffset)) % cols;
                const h1 = this._getHeight(scrolledCol, row) + waveOffset;

                const p = this._project(
                    (col / cols - 0.5) * 4,
                    -h1 * 0.5,
                    z1,
                    w, h
                );

                if (!p) continue;

                if (col === 0) ctx.moveTo(p.sx, p.sy);
                else ctx.lineTo(p.sx, p.sy);
            }
            ctx.stroke();

            // Vertical connecting lines (every few cols for performance)
            for (let col = 0; col < cols; col += 3) {
                const scrolledCol = (col + Math.floor(scrollOffset)) % cols;
                const h1 = this._getHeight(scrolledCol, row) + waveOffset;
                const h2 = this._getHeight(scrolledCol, row + 1) + waveOffset;

                const p1 = this._project((col / cols - 0.5) * 4, -h1 * 0.5, z1, w, h);
                const p2 = this._project((col / cols - 0.5) * 4, -h2 * 0.5, z2, w, h);

                if (!p1 || !p2) continue;

                ctx.beginPath();
                ctx.moveTo(p1.sx, p1.sy);
                ctx.lineTo(p2.sx, p2.sy);
                ctx.strokeStyle = `hsla(${depthHue}, 60%, 45%, ${depthAlpha * 0.25})`;
                ctx.stroke();
            }
        }

        // Buildings (mode 2)
        if (this.mode === 2) {
            for (const b of this._buildings) {
                const scrolledCol = (b.col + Math.floor(scrollOffset)) % cols;
                const baseH = this._getHeight(scrolledCol, b.row);
                const z = b.row * 0.3 + 1;
                const depthAlpha = Math.max(0.1, 1 - b.row / rows);

                const base = this._project((b.col / cols - 0.5) * 4, -baseH * 0.5, z, w, h);
                const top = this._project((b.col / cols - 0.5) * 4, -baseH * 0.5 - b.height, z, w, h);

                if (!base || !top) continue;

                const bw = b.width * cellW * (base.scale / 200);
                ctx.strokeStyle = `hsla(${b.hue}, 60%, 50%, ${depthAlpha * 0.6})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(base.sx - bw / 2, top.sy, bw, base.sy - top.sy);

                // Lit windows
                if (b.lit) {
                    ctx.fillStyle = `hsla(50, 80%, 70%, ${depthAlpha * 0.3})`;
                    const wh = (base.sy - top.sy) / 4;
                    for (let wy = 0; wy < 3; wy++) {
                        ctx.fillRect(base.sx - bw * 0.3, top.sy + wy * wh + wh * 0.2, bw * 0.2, wh * 0.5);
                        ctx.fillRect(base.sx + bw * 0.1, top.sy + wy * wh + wh * 0.2, bw * 0.2, wh * 0.5);
                    }
                }
            }
        }

        // Floating rocks (mode 3)
        for (const f of this._floaters) {
            const fx = f.x * w;
            const fy = f.y * h;
            const fs = f.size * Math.min(w, h);
            ctx.strokeStyle = `hsla(${f.hue}, 50%, 55%, 0.5)`;
            ctx.lineWidth = 1;
            // Draw as irregular polygon
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * TAU;
                const r = fs * (0.7 + Math.sin(a * 3) * 0.3);
                const px = fx + Math.cos(a) * r;
                const py = fy + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';

        // Glitch effect overlay
        if (this._glitchActive) {
            for (const g of this._glitchLines) {
                if (g.duration <= 0) continue;
                const gy = g.y * h;
                const gh = g.height * h;
                const ox = g.offset * w;

                // Slice and offset
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, gy, w, gh);
                ctx.clip();
                ctx.drawImage(ctx.canvas, ox, 0);

                // Color channel split
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(ox + 3, gy, w, gh);
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(ox - 3, gy, w, gh);
                ctx.restore();
            }
        }

        // Matrix rain for mode 4
        if (this.mode === 4) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.font = '10px monospace';
            ctx.globalAlpha = 0.15;
            const chars = '01アイウエオカキクケコ';
            for (let i = 0; i < 30; i++) {
                const x = (this._rng() * w) | 0;
                const y = ((this.tick * 2 + i * 37) % h) | 0;
                const ch = chars[Math.floor(this._rng() * chars.length)];
                ctx.fillStyle = `hsl(120, 100%, ${40 + this._rng() * 40}%)`;
                ctx.fillText(ch, x, y);
            }
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}
