/**
 * @file terrain_erosion_effects.js
 * @description Procedural heightmap terrain rendered as a topographic contour map
 * or 3D-perspective mesh. The cursor acts as a geological force - raising mountains,
 * carving rivers, or triggering earthquakes. Seed controls terrain type, color scheme,
 * erosion style, and geological features.
 *
 * Modes:
 * 0 - Topographic: Contour lines like a hiking map, cursor raises/lowers terrain
 * 1 - Volcanic: Lava flows from peaks, cursor triggers eruptions
 * 2 - Oceanic: Underwater terrain with water surface refraction, cursor creates waves
 * 3 - Alien Planet: Strange terrain with floating islands and inverted gravity
 * 4 - Ice World: Glacial terrain with cracking ice sheets and aurora reflections
 * 5 - Wireframe: Retro vector graphics 3D mesh perspective view
 */

export class TerrainErosion {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this._rng = Math.random;

        // Heightmap
        this._cellSize = 8;
        this._cols = 0;
        this._rows = 0;
        this._height = null;  // Float32Array - terrain height
        this._water = null;   // Float32Array - water level (for erosion)
        this._sediment = null; // Float32Array - eroded material

        // Rendering
        this._contourInterval = 0.08;
        this._colorScale = [];  // Array of {h, s, l} for height-based coloring

        // Mouse
        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._mouseSpeed = 0;
        this._prevMX = 0;
        this._prevMY = 0;

        // Geological events
        this._quakes = []; // { x, y, radius, strength, life }
        this._maxQuakes = 5;

        // Performance: pre-allocated line segments buffer
        this._lineBuffer = [];

        // Offscreen ImageData rendering (avoids per-cell fillStyle string alloc)
        this._offCanvas = null;
        this._offCtx = null;
        this._imageData = null;

        // Pre-computed color scale LUT: 256 entries of [r,g,b]
        this._heightLUT = null;
    }

    configure(rng, hues) {
        this._rng = rng;
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);

        this.mode = Math.floor(rng() * 6);

        this._cellSize = this.mode === 5 ? 10 : (6 + Math.floor(rng() * 5));
        const w = window.innerWidth;
        const h = window.innerHeight;
        this._cols = Math.ceil(w / this._cellSize);
        this._rows = Math.ceil(h / this._cellSize);
        const total = this._cols * this._rows;

        this._height = new Float32Array(total);
        this._water = new Float32Array(total);
        this._sediment = new Float32Array(total);

        // Generate initial terrain using diamond-square-like noise
        this._generateTerrain(rng);

        // Contour interval
        this._contourInterval = 0.06 + rng() * 0.06;

        // Color scales per mode
        this._colorScale = this._buildColorScale(rng);

        this._quakes = [];
        this._offCanvas = null;
        this._buildHeightLUT();
    }

    _buildHeightLUT() {
        // 256 pre-computed RGB values for height 0..1
        this._heightLUT = new Uint8Array(256 * 3);
        for (let i = 0; i < 256; i++) {
            const h = i / 255;
            const c = this._getHeightColor(h);
            const rgb = this._hslToRgb(c.h / 360, c.s / 100, c.l / 100);
            this._heightLUT[i * 3] = rgb[0];
            this._heightLUT[i * 3 + 1] = rgb[1];
            this._heightLUT[i * 3 + 2] = rgb[2];
        }
    }

    _hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [r * 255 | 0, g * 255 | 0, b * 255 | 0];
    }

    _ensureOffCanvas() {
        if (!this._offCanvas || this._offCanvas.width !== this._cols || this._offCanvas.height !== this._rows) {
            this._offCanvas = document.createElement('canvas');
            this._offCanvas.width = this._cols;
            this._offCanvas.height = this._rows;
            this._offCtx = this._offCanvas.getContext('2d', { alpha: true });
            this._imageData = this._offCtx.createImageData(this._cols, this._rows);
        }
    }

    _generateTerrain(rng) {
        const cols = this._cols;
        const rows = this._rows;

        // Multi-octave simplex-like noise via superimposed sine waves
        const octaves = 4 + Math.floor(rng() * 3);
        const freqs = [];
        const amps = [];
        const phases = [];
        let totalAmp = 0;
        for (let o = 0; o < octaves; o++) {
            freqs.push(0.005 * Math.pow(2, o) * (0.8 + rng() * 0.4));
            const a = 1 / Math.pow(2, o);
            amps.push(a);
            totalAmp += a;
            phases.push(rng() * Math.PI * 2);
        }

        // Directional offsets for variety
        const dirX = rng() * 10 - 5;
        const dirY = rng() * 10 - 5;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let h = 0;
                for (let o = 0; o < octaves; o++) {
                    const fx = (x + dirX) * freqs[o];
                    const fy = (y + dirY) * freqs[o];
                    h += (Math.sin(fx + phases[o]) * Math.cos(fy + phases[o] * 1.3) +
                          Math.sin(fx * 1.7 + fy * 0.7 + phases[o] * 2)) * amps[o];
                }
                // Normalize to 0-1
                this._height[y * cols + x] = (h / totalAmp + 1) * 0.5;
            }
        }

        // Mode-specific terrain modifications
        if (this.mode === 1) {
            // Volcanic: add sharp peaks
            const peakCount = 2 + Math.floor(rng() * 3);
            for (let p = 0; p < peakCount; p++) {
                const px = Math.floor(rng() * cols);
                const py = Math.floor(rng() * rows);
                const radius = 15 + rng() * 25;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = px + dx;
                        const ny = py + dy;
                        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < radius) {
                                const peak = (1 - dist / radius) * (1 - dist / radius);
                                this._height[ny * cols + nx] = Math.min(1, this._height[ny * cols + nx] + peak * 0.6);
                            }
                        }
                    }
                }
            }
        } else if (this.mode === 3) {
            // Alien: invert some regions
            for (let i = 0; i < cols * rows; i++) {
                if (Math.sin(i * 0.001 + rng() * 10) > 0.7) {
                    this._height[i] = 1 - this._height[i];
                }
            }
        } else if (this.mode === 4) {
            // Ice: flatten and add cracks
            for (let i = 0; i < cols * rows; i++) {
                this._height[i] = this._height[i] * 0.3 + 0.35; // Flatten
            }
        }
    }

    _buildColorScale(rng) {
        const h = this.hue;
        switch (this.mode) {
            case 0: // Topographic: green valleys, brown hills, white peaks
                return [
                    { h: 140, s: 40, l: 25 },
                    { h: 120, s: 50, l: 35 },
                    { h: 50, s: 40, l: 40 },
                    { h: 30, s: 30, l: 50 },
                    { h: 0, s: 10, l: 80 },
                ];
            case 1: // Volcanic: black to red to orange to yellow
                return [
                    { h: 0, s: 10, l: 8 },
                    { h: 0, s: 80, l: 25 },
                    { h: 15, s: 90, l: 40 },
                    { h: 40, s: 95, l: 55 },
                    { h: 55, s: 100, l: 70 },
                ];
            case 2: // Oceanic: deep blue to teal to sandy
                return [
                    { h: 230, s: 60, l: 15 },
                    { h: 220, s: 70, l: 25 },
                    { h: 200, s: 60, l: 35 },
                    { h: 180, s: 50, l: 45 },
                    { h: 45, s: 40, l: 60 },
                ];
            case 3: // Alien: seed-based weird colors
                return [
                    { h: h, s: 80, l: 15 },
                    { h: (h + 60) % 360, s: 70, l: 30 },
                    { h: (h + 120) % 360, s: 90, l: 45 },
                    { h: (h + 200) % 360, s: 60, l: 55 },
                    { h: (h + 300) % 360, s: 80, l: 70 },
                ];
            case 4: // Ice: whites and blues
                return [
                    { h: 210, s: 30, l: 40 },
                    { h: 200, s: 20, l: 55 },
                    { h: 195, s: 15, l: 70 },
                    { h: 190, s: 10, l: 82 },
                    { h: 180, s: 5, l: 92 },
                ];
            case 5: // Wireframe: monochrome with accent
                return [
                    { h: h, s: 80, l: 30 },
                    { h: h, s: 70, l: 45 },
                    { h: h, s: 60, l: 60 },
                    { h: h, s: 50, l: 70 },
                    { h: h, s: 40, l: 85 },
                ];
            default:
                return [{ h: 0, s: 0, l: 50 }];
        }
    }

    _getHeightColor(height) {
        const scale = this._colorScale;
        const t = Math.max(0, Math.min(1, height)) * (scale.length - 1);
        const idx = Math.floor(t);
        const frac = t - idx;
        const c0 = scale[Math.min(idx, scale.length - 1)];
        const c1 = scale[Math.min(idx + 1, scale.length - 1)];
        return {
            h: c0.h + (c1.h - c0.h) * frac,
            s: c0.s + (c1.s - c0.s) * frac,
            l: c0.l + (c1.l - c0.l) * frac,
        };
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._wasClicking = this._isClicking;
        this._isClicking = isClicking;
        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = this._mouseX;
        this._prevMY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;

        const cols = this._cols;
        const rows = this._rows;
        const cs = this._cellSize;
        const cx = Math.floor(mx / cs);
        const cy = Math.floor(my / cs);

        // Cursor modifies terrain
        const brushR = isClicking ? 8 : 4;
        const power = isClicking ? 0.015 : 0.003;
        for (let bdy = -brushR; bdy <= brushR; bdy++) {
            for (let bdx = -brushR; bdx <= brushR; bdx++) {
                const dist = Math.sqrt(bdx * bdx + bdy * bdy);
                if (dist > brushR) continue;
                const nx = cx + bdx;
                const ny = cy + bdy;
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    const idx = ny * cols + nx;
                    const falloff = (1 - dist / brushR);
                    if (isClicking) {
                        // Click raises terrain
                        this._height[idx] = Math.min(1, this._height[idx] + power * falloff);
                    } else {
                        // Hover gently ripples
                        this._height[idx] += Math.sin(this.tick * 0.1 + dist) * power * falloff * 0.3;
                    }
                }
            }
        }

        // Trigger quake on click start
        if (isClicking && !this._wasClicking && this._quakes.length < this._maxQuakes) {
            this._quakes.push({
                x: cx, y: cy,
                radius: 0, maxRadius: 30 + Math.floor(this._rng() * 20),
                strength: 0.02 + this._rng() * 0.02,
                life: 40,
            });
        }

        // Propagate quakes
        for (let q = this._quakes.length - 1; q >= 0; q--) {
            const quake = this._quakes[q];
            quake.radius += 1.5;
            quake.life--;
            if (quake.life <= 0) {
                this._quakes[q] = this._quakes[this._quakes.length - 1];
                this._quakes.pop();
                continue;
            }
            // Raise terrain in ring
            const r = Math.floor(quake.radius);
            const thickness = 3;
            for (let angle = 0; angle < 24; angle++) {
                const a = (angle / 24) * Math.PI * 2;
                const qx = Math.floor(quake.x + Math.cos(a) * r);
                const qy = Math.floor(quake.y + Math.sin(a) * r);
                if (qx >= 0 && qx < cols && qy >= 0 && qy < rows) {
                    const idx = qy * cols + qx;
                    this._height[idx] += quake.strength * (quake.life / 40);
                    this._height[idx] = Math.min(1, Math.max(0, this._height[idx]));
                }
            }
        }

        // Thermal erosion (every few frames)
        if (this.tick % 4 === 0) {
            this._erode();
        }

        // Volcanic lava flow
        if (this.mode === 1 && this.tick % 3 === 0) {
            for (let y = 1; y < rows - 1; y++) {
                const yOff = y * cols;
                for (let x = 1; x < cols - 1; x++) {
                    const idx = yOff + x;
                    if (this._height[idx] > 0.85) {
                        // Lava flows downhill
                        let lowestIdx = idx;
                        let lowestH = this._height[idx];
                        const neighbors = [idx - 1, idx + 1, idx - cols, idx + cols];
                        for (const ni of neighbors) {
                            if (this._height[ni] < lowestH) {
                                lowestH = this._height[ni];
                                lowestIdx = ni;
                            }
                        }
                        if (lowestIdx !== idx) {
                            const flow = (this._height[idx] - lowestH) * 0.05;
                            this._height[idx] -= flow;
                            this._height[lowestIdx] += flow * 0.8;
                            this._water[lowestIdx] = Math.min(1, this._water[lowestIdx] + flow);
                        }
                    }
                }
            }
            // Decay water
            for (let i = 0; i < cols * rows; i++) {
                this._water[i] *= 0.98;
            }
        }
    }

    _erode() {
        const cols = this._cols;
        const rows = this._rows;
        const height = this._height;
        const talusAngle = 0.05; // Maximum stable height difference

        // Simple thermal erosion: material slides to lower neighbors
        for (let y = 1; y < rows - 1; y++) {
            const yOff = y * cols;
            for (let x = 1; x < cols - 1; x++) {
                const idx = yOff + x;
                const h = height[idx];

                // Find steepest drop
                let maxDrop = 0;
                let dropIdx = -1;
                const neighbors = [idx - 1, idx + 1, idx - cols, idx + cols];
                for (const ni of neighbors) {
                    const drop = h - height[ni];
                    if (drop > maxDrop) {
                        maxDrop = drop;
                        dropIdx = ni;
                    }
                }

                if (maxDrop > talusAngle && dropIdx >= 0) {
                    const transfer = (maxDrop - talusAngle) * 0.25;
                    height[idx] -= transfer;
                    height[dropIdx] += transfer;
                }
            }
        }
    }

    draw(ctx, system) {
        const cols = this._cols;
        const rows = this._rows;
        const cs = this._cellSize;
        const height = this._height;

        ctx.save();

        if (this.mode === 5) {
            // Wireframe 3D perspective mesh
            this._drawWireframe(ctx);
        } else {
            this._ensureOffCanvas();

            // Render terrain to ImageData using pre-computed height LUT
            const data = this._imageData.data;
            const lut = this._heightLUT;
            const water = this._water;
            const total = cols * rows;
            const isVolcanic = this.mode === 1;

            for (let idx = 0; idx < total; idx++) {
                const pIdx = idx << 2;
                const h = height[idx];
                const hi = Math.max(0, Math.min(255, h * 255 | 0));
                const li = hi * 3;
                const wl = water[idx];

                if (isVolcanic && wl > 0.01) {
                    // Lava glow overrides terrain color
                    const lavaIntensity = Math.min(1, wl);
                    data[pIdx] = 255;
                    data[pIdx + 1] = (100 + lavaIntensity * 155) | 0;
                    data[pIdx + 2] = (40 * (1 - lavaIntensity)) | 0;
                    data[pIdx + 3] = (120 + lavaIntensity * 100) | 0;
                } else {
                    data[pIdx] = lut[li];
                    data[pIdx + 1] = lut[li + 1];
                    data[pIdx + 2] = lut[li + 2];
                    data[pIdx + 3] = 150;
                }
            }

            this._offCtx.putImageData(this._imageData, 0, 0);

            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5;
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(this._offCanvas, 0, 0, window.innerWidth, window.innerHeight);

            // Draw contour lines
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = `hsla(${this.hue}, 30%, 70%, 0.4)`;
            ctx.lineWidth = 0.8;

            const interval = this._contourInterval;
            ctx.beginPath();
            for (let y = 0; y < rows - 1; y++) {
                const yOff = y * cols;
                for (let x = 0; x < cols - 1; x++) {
                    const idx = yOff + x;
                    const h00 = height[idx];
                    const h10 = height[idx + 1];
                    const h01 = height[idx + cols];

                    // Check for contour crossing (marching squares lite)
                    const level00 = Math.floor(h00 / interval);
                    const level10 = Math.floor(h10 / interval);
                    const level01 = Math.floor(h01 / interval);

                    if (level00 !== level10) {
                        const t = ((level10 > level00 ? level10 : level00) * interval - h00) / (h10 - h00 + 0.001);
                        const lx = (x + t) * cs;
                        const ly = y * cs;
                        ctx.moveTo(lx, ly);
                        ctx.lineTo(lx, ly + cs);
                    }
                    if (level00 !== level01) {
                        const t = ((level01 > level00 ? level01 : level00) * interval - h00) / (h01 - h00 + 0.001);
                        const lx = x * cs;
                        const ly = (y + t) * cs;
                        ctx.moveTo(lx, ly);
                        ctx.lineTo(lx + cs, ly);
                    }
                }
            }
            ctx.stroke();

            // Ice mode: draw crack lines
            if (this.mode === 4) {
                ctx.strokeStyle = `hsla(195, 40%, 85%, 0.3)`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                for (let y = 2; y < rows - 2; y += 3) {
                    const yOff = y * cols;
                    for (let x = 2; x < cols - 2; x += 3) {
                        const idx = yOff + x;
                        const h = height[idx];
                        const hRight = height[idx + 1];
                        const hDown = height[idx + cols];
                        const stress = Math.abs(h - hRight) + Math.abs(h - hDown);
                        if (stress > 0.08) {
                            ctx.moveTo(x * cs, y * cs);
                            ctx.lineTo((x + 2) * cs, (y + 1) * cs);
                        }
                    }
                }
                ctx.stroke();
            }

            // Oceanic mode: water surface shimmer
            if (this.mode === 2) {
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = `hsla(200, 60%, 50%, 0.1)`;
                for (let i = 0; i < 5; i++) {
                    const waveY = (this.tick * 0.5 + i * 60) % (rows * cs);
                    ctx.fillRect(0, waveY, cols * cs, 2);
                }
            }
        }

        // Quake ripple visualization
        for (const quake of this._quakes) {
            const alpha = (quake.life / 40) * 0.3;
            ctx.strokeStyle = `hsla(${this.hue}, 60%, 60%, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(quake.x * cs, quake.y * cs, quake.radius * cs, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawWireframe(ctx) {
        const cols = this._cols;
        const rows = this._rows;
        const cs = this._cellSize;
        const height = this._height;
        const h = this.hue;

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 0.8;

        // Perspective projection parameters
        const vanishY = -100; // Vanishing point Y
        const perspScale = 0.4; // Perspective strength
        const heightScale = cs * 3; // How much height affects Y

        const step = 2;
        // Draw horizontal lines
        for (let y = 0; y < rows; y += step) {
            const yOff = y * cols;
            const rowAlpha = 0.2 + (y / rows) * 0.5;
            ctx.strokeStyle = `hsla(${h}, 60%, 60%, ${rowAlpha})`;
            ctx.beginPath();
            let started = false;
            for (let x = 0; x < cols; x += step) {
                const idx = yOff + x;
                const ht = height[idx];
                const screenX = x * cs;
                const baseY = y * cs;
                // Apply perspective: higher rows compress toward vanishing point
                const perspFactor = 1 - (y / rows) * perspScale;
                const screenY = baseY * perspFactor - ht * heightScale * perspFactor;

                if (!started) {
                    ctx.moveTo(screenX, screenY + 100);
                    started = true;
                } else {
                    ctx.lineTo(screenX, screenY + 100);
                }
            }
            ctx.stroke();
        }

        // Draw vertical lines (sparser)
        for (let x = 0; x < cols; x += step * 2) {
            ctx.strokeStyle = `hsla(${h}, 40%, 50%, 0.15)`;
            ctx.beginPath();
            let started = false;
            for (let y = 0; y < rows; y += step) {
                const idx = y * cols + x;
                const ht = height[idx];
                const screenX = x * cs;
                const baseY = y * cs;
                const perspFactor = 1 - (y / rows) * perspScale;
                const screenY = baseY * perspFactor - ht * heightScale * perspFactor;

                if (!started) {
                    ctx.moveTo(screenX, screenY + 100);
                    started = true;
                } else {
                    ctx.lineTo(screenX, screenY + 100);
                }
            }
            ctx.stroke();
        }
    }
}
