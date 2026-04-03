/**
 * @file glitch_terrain_effects.js
 * @description Pseudo-3D terrain renderer with retro wireframe aesthetic and glitch
 * distortions. Terrain is procedurally generated from seed, with mouse controlling
 * camera perspective. Periodic glitch events tear and distort the landscape.
 * Click triggers a terrain quake that ripples the height map.
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

// Pre-allocated projection result to avoid object creation in hot loops
const _proj = { sx: 0, sy: 0, scale: 0 };

// Matrix rain character set (static, avoid recreating strings)
const MATRIX_CHARS = '01アイウエオカキクケコサシスセソタチツテト';

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

        // Vaporwave sun (cached gradient)
        this._sunY = 0.3;
        this._sunRadius = 0.15;
        this._sunGrad = null;
        this._sunGradW = 0;

        // Buildings for mode 2
        this._buildings = [];

        // Floating rocks for mode 3
        this._floaters = [];

        // Mouse
        this._mouseX = 0;
        this._mouseY = 0;

        // Click quake
        this._quakeIntensity = 0;
        this._quakePhase = 0;

        // Matrix rain: pre-computed column positions (avoids rng() in draw)
        this._matrixCols = [];

        // Foam particles for ocean mode
        this._foamParticles = [];
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this._scroll = 0;
        this._quakeIntensity = 0;
        this._sunGrad = null;

        // Generate seed-dependent height map
        this._generateHeightMap(rng);

        // Mode-specific setup
        switch (this.mode) {
            case 0: // Vaporwave
                this._sunY = 0.25 + rng() * 0.15;
                this._scrollSpeed = 0.3 + rng() * 0.4;
                break;
            case 1: // Digital Ocean
                this._scrollSpeed = 0.5 + rng() * 0.3;
                this._generateFoam(rng);
                break;
            case 2: // Glitch City
                this._generateBuildings(rng);
                this._scrollSpeed = 0.2 + rng() * 0.2;
                break;
            case 3: // Alien Planet
                this._generateFloaters(rng);
                this._scrollSpeed = 0.4 + rng() * 0.3;
                break;
            case 4: // Matrix
                this._scrollSpeed = 0.6 + rng() * 0.4;
                this._generateMatrixCols(rng);
                break;
            case 5: // Crystal Cavern
                this._scrollSpeed = 0.3 + rng() * 0.2;
                break;
        }

        this._glitchCooldown = 80 + Math.floor(rng() * 120);
    }

    _generateHeightMap(rng) {
        const cols = this._cols;
        const rows = this._rows;
        this._heightMap = new Float32Array(cols * rows);
        const freqs = new Float32Array(4);
        const amps = new Float32Array(4);
        const phases = new Float32Array(4);

        for (let o = 0; o < 4; o++) {
            freqs[o] = 0.05 + rng() * 0.15 * (o + 1);
            amps[o] = 1 / (o + 1);
            phases[o] = rng() * TAU;
        }

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let h = 0;
                for (let o = 0; o < 4; o++) {
                    h += Math.sin(x * freqs[o] + phases[o]) *
                         Math.cos(y * freqs[o] * 0.7 + phases[o] * 1.3) *
                         amps[o];
                }
                this._heightMap[y * cols + x] = h;
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
                lit: rng() > 0.5,
            });
        }
    }

    _generateFloaters(rng) {
        this._floaters = [];
        const count = 4 + Math.floor(rng() * 6);
        for (let i = 0; i < count; i++) {
            this._floaters.push({
                x: rng(),
                baseY: 0.1 + rng() * 0.3,
                y: 0,
                size: 0.02 + rng() * 0.04,
                bobSpeed: 0.01 + rng() * 0.02,
                bobPhase: rng() * TAU,
                hue: 100 + rng() * 160,
                vertices: this._generateRockVertices(rng),
            });
        }
    }

    _generateRockVertices(rng) {
        // Pre-compute irregular polygon vertices
        const verts = [];
        const count = 5 + Math.floor(rng() * 4);
        for (let i = 0; i < count; i++) {
            const a = (i / count) * TAU;
            const r = 0.6 + rng() * 0.4;
            verts.push({ cos: Math.cos(a) * r, sin: Math.sin(a) * r });
        }
        return verts;
    }

    _generateFoam(rng) {
        this._foamParticles = [];
        for (let i = 0; i < 30; i++) {
            this._foamParticles.push({
                x: rng(),
                row: Math.floor(rng() * this._rows * 0.3),
                speed: 0.002 + rng() * 0.005,
                size: 1 + rng() * 2,
                alpha: 0.3 + rng() * 0.4,
            });
        }
    }

    _generateMatrixCols(rng) {
        // Pre-compute matrix rain column data to avoid rng() in draw loop
        this._matrixCols = [];
        for (let i = 0; i < 40; i++) {
            this._matrixCols.push({
                x: rng(),
                speed: 1.5 + rng() * 3,
                offset: rng() * 1000,
                charIdx: Math.floor(rng() * MATRIX_CHARS.length),
                brightness: 40 + rng() * 40,
            });
        }
    }

    _getHeight(col, row) {
        const c = ((col % this._cols) + this._cols) % this._cols;
        const r = Math.max(0, Math.min(this._rows - 1, Math.floor(row)));
        return this._heightMap[r * this._cols + c] || 0;
    }

    _project(x, y, z, w, h) {
        const fov = 200;
        const dz = z + 2; // camZ = -2, so dz = z - (-2) = z + 2
        if (dz <= 0.1) return false;
        const scale = fov / dz;
        const inverted = this.mode === 5;
        _proj.sx = w / 2 + (x - this._camX) * scale;
        _proj.sy = h * this._camTilt + (y * (inverted ? -1 : 1)) * scale;
        _proj.scale = scale;
        return true;
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

        // Quake decay
        if (this._quakeIntensity > 0.01) {
            this._quakeIntensity *= 0.95;
            this._quakePhase += 0.3;
        } else {
            this._quakeIntensity = 0;
        }

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
            f.y = f.baseY + Math.sin(this.tick * f.bobSpeed + f.bobPhase) * 0.02;
        }

        // Animate foam
        for (const fp of this._foamParticles) {
            fp.x += fp.speed;
            if (fp.x > 1) fp.x -= 1;
        }
    }

    draw(ctx, system) {
        const w = system.width;
        const h = system.height;

        // Handle click events
        if (system._clickRegistered !== undefined && system._clickRegistered) {
            this._quakeIntensity = 1.5;
            this._quakePhase = 0;
        }

        ctx.save();

        const cols = this._cols;
        const rows = this._rows;
        const scrollOffset = this._scroll;
        const quakeY = this._quakeIntensity * Math.sin(this._quakePhase);

        // Vaporwave sun (mode 0) with cached gradient
        if (this.mode === 0) {
            const sunX = w / 2;
            const sunY = h * this._sunY;
            const sunR = Math.min(w, h) * this._sunRadius;

            if (!this._sunGrad || this._sunGradW !== w) {
                this._sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
                this._sunGrad.addColorStop(0, 'hsla(50, 100%, 80%, 0.8)');
                this._sunGrad.addColorStop(0.3, 'hsla(30, 100%, 60%, 0.6)');
                this._sunGrad.addColorStop(0.7, 'hsla(340, 90%, 50%, 0.3)');
                this._sunGrad.addColorStop(1, 'transparent');
                this._sunGradW = w;
            }
            ctx.fillStyle = this._sunGrad;
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, 0, TAU);
            ctx.fill();

            // Horizontal scan lines through sun
            ctx.globalCompositeOperation = 'destination-out';
            for (let i = 0; i < 8; i++) {
                const ly = sunY - sunR + (i / 8) * sunR * 2;
                const lineH = 2 + i * 0.5;
                ctx.fillStyle = `rgba(0, 0, 0, ${(0.3 + i * 0.05).toFixed(2)})`;
                ctx.fillRect(sunX - sunR, ly, sunR * 2, lineH);
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Alien planet moons (mode 3)
        if (this.mode === 3) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = `hsla(${(this.hue + 60) | 0}, 30%, 70%, 0.4)`;
            ctx.beginPath();
            ctx.arc(w * 0.2, h * 0.15, 30, 0, TAU);
            ctx.fill();
            ctx.fillStyle = `hsla(${(this.hue + 120) | 0}, 40%, 60%, 0.3)`;
            ctx.beginPath();
            ctx.arc(w * 0.75, h * 0.1, 20, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Draw wireframe terrain
        ctx.globalCompositeOperation = 'lighter';

        for (let row = 0; row < rows - 1; row++) {
            const z1 = row * 0.3 + 1;
            const z2 = (row + 1) * 0.3 + 1;
            const depthFrac = row / rows;
            const depthAlpha = Math.max(0.05, 1 - depthFrac);
            const depthHue = (this.hue + row * 2) % 360;

            // Row-based ocean wave for mode 1
            const waveOffset = this.mode === 1 ?
                Math.sin(row * 0.3 + this.tick * 0.03) * 0.3 : 0;

            // Quake offset
            const rowQuake = quakeY * Math.sin(row * 0.5 + this._quakePhase);

            // Horizontal row lines
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${depthHue | 0}, 70%, 55%, ${(depthAlpha * 0.5).toFixed(3)})`;
            ctx.lineWidth = Math.max(0.5, 2 - row * 0.05);

            for (let col = 0; col < cols; col++) {
                const scrolledCol = (col + Math.floor(scrollOffset)) % cols;
                const h1 = this._getHeight(scrolledCol, row) + waveOffset + rowQuake;

                if (!this._project((col / cols - 0.5) * 4, -h1 * 0.5, z1, w, h)) continue;

                if (col === 0) ctx.moveTo(_proj.sx, _proj.sy);
                else ctx.lineTo(_proj.sx, _proj.sy);
            }
            ctx.stroke();

            // Vertical connecting lines (every few cols for performance)
            const vertAlpha = (depthAlpha * 0.25).toFixed(3);
            ctx.strokeStyle = `hsla(${depthHue | 0}, 60%, 45%, ${vertAlpha})`;
            for (let col = 0; col < cols; col += 3) {
                const scrolledCol = (col + Math.floor(scrollOffset)) % cols;
                const h1 = this._getHeight(scrolledCol, row) + waveOffset + rowQuake;
                const h2 = this._getHeight(scrolledCol, row + 1) + waveOffset + rowQuake;
                const xNorm = (col / cols - 0.5) * 4;

                if (!this._project(xNorm, -h1 * 0.5, z1, w, h)) continue;
                const sx1 = _proj.sx, sy1 = _proj.sy;
                if (!this._project(xNorm, -h2 * 0.5, z2, w, h)) continue;

                ctx.beginPath();
                ctx.moveTo(sx1, sy1);
                ctx.lineTo(_proj.sx, _proj.sy);
                ctx.stroke();
            }
        }

        // Buildings (mode 2)
        if (this.mode === 2) {
            const cellW = w / (cols - 1);
            for (const b of this._buildings) {
                const scrolledCol = (b.col + Math.floor(scrollOffset)) % cols;
                const baseH = this._getHeight(scrolledCol, b.row);
                const z = b.row * 0.3 + 1;
                const bDepthAlpha = Math.max(0.1, 1 - b.row / rows);

                if (!this._project((b.col / cols - 0.5) * 4, -baseH * 0.5, z, w, h)) continue;
                const baseSx = _proj.sx, baseSy = _proj.sy, baseScale = _proj.scale;
                if (!this._project((b.col / cols - 0.5) * 4, -baseH * 0.5 - b.height, z, w, h)) continue;
                const topSy = _proj.sy;

                const bw = b.width * cellW * (baseScale / 200);
                ctx.strokeStyle = `hsla(${b.hue | 0}, 60%, 50%, ${(bDepthAlpha * 0.6).toFixed(2)})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(baseSx - bw / 2, topSy, bw, baseSy - topSy);

                if (b.lit) {
                    ctx.fillStyle = `hsla(50, 80%, 70%, ${(bDepthAlpha * 0.3).toFixed(2)})`;
                    const wh = (baseSy - topSy) / 4;
                    for (let wy = 0; wy < 3; wy++) {
                        ctx.fillRect(baseSx - bw * 0.3, topSy + wy * wh + wh * 0.2, bw * 0.2, wh * 0.5);
                        ctx.fillRect(baseSx + bw * 0.1, topSy + wy * wh + wh * 0.2, bw * 0.2, wh * 0.5);
                    }
                }
            }
        }

        // Floating rocks (mode 3)
        if (this.mode === 3) {
            for (const f of this._floaters) {
                const fx = f.x * w;
                const fy = f.y * h;
                const fs = f.size * Math.min(w, h);
                ctx.strokeStyle = `hsla(${f.hue | 0}, 50%, 55%, 0.5)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const verts = f.vertices;
                for (let i = 0; i < verts.length; i++) {
                    const px = fx + verts[i].cos * fs;
                    const py = fy + verts[i].sin * fs;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
                // Inner glow
                ctx.fillStyle = `hsla(${f.hue | 0}, 40%, 45%, 0.1)`;
                ctx.fill();
            }
        }

        // Foam particles (mode 1)
        if (this.mode === 1) {
            for (const fp of this._foamParticles) {
                const z = fp.row * 0.3 + 1;
                const waveH = Math.sin(fp.row * 0.3 + this.tick * 0.03) * 0.3;
                const terrainH = this._getHeight((fp.x * cols) | 0, fp.row) + waveH;
                if (!this._project((fp.x - 0.5) * 4, -terrainH * 0.5 - 0.05, z, w, h)) continue;
                ctx.beginPath();
                ctx.arc(_proj.sx, _proj.sy, fp.size, 0, TAU);
                ctx.fillStyle = `rgba(200, 230, 255, ${fp.alpha})`;
                ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';

        // Glitch effect overlay
        if (this._glitchActive) {
            for (const g of this._glitchLines) {
                if (g.duration <= 0) continue;
                const gy = g.y * h;
                const gh = g.height * h;
                const ox = g.offset * w;

                ctx.save();
                ctx.beginPath();
                ctx.rect(0, gy, w, gh);
                ctx.clip();
                ctx.drawImage(ctx.canvas, ox, 0);

                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(ox + 3, gy, w, gh);
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(ox - 3, gy, w, gh);
                ctx.restore();
            }
        }

        // Matrix rain for mode 4 (uses pre-computed columns, no rng() in draw)
        if (this.mode === 4) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.font = '10px monospace';
            ctx.globalAlpha = 0.15;
            for (const mc of this._matrixCols) {
                const x = (mc.x * w) | 0;
                const y = ((this.tick * mc.speed + mc.offset) % h) | 0;
                const ch = MATRIX_CHARS[(mc.charIdx + this.tick) % MATRIX_CHARS.length];
                ctx.fillStyle = `hsl(120, 100%, ${mc.brightness | 0}%)`;
                ctx.fillText(ch, x, y);
                // Secondary trailing char
                const y2 = (y - 14 + h) % h;
                ctx.globalAlpha = 0.08;
                ctx.fillText(MATRIX_CHARS[(mc.charIdx + this.tick + 5) % MATRIX_CHARS.length], x, y2);
                ctx.globalAlpha = 0.15;
            }
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}
