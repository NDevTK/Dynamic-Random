/**
 * @file sonic_terrain_effects.js
 * @description A 3D-perspective wireframe terrain that deforms in real-time based on
 * cursor position. The terrain creates valleys where the cursor hovers and ridges
 * where clicks occur. Waves propagate outward from interaction points.
 *
 * Modes:
 * 0 - Ocean: Gentle sine waves, cursor creates wake, blue palette
 * 1 - Mountain: Perlin-like peaks, cursor carves valleys, earth tones
 * 2 - Sound Visualizer: Terrain height driven by cursor speed, neon colors
 * 3 - Tectonic: Plates shift and crack, cursor triggers earthquakes
 * 4 - Liquid Mirror: Reflective surface, cursor creates ripples, chrome colors
 * 5 - Alien Planet: Bizarre terrain with color-shifting crystalline structures
 */

const TAU = Math.PI * 2;

export class SonicTerrain {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this._heightMap = null;
        this._velocityMap = null;
        this._cols = 0;
        this._rows = 0;
        this._cellSize = 20;
        this._perspective = 0.6;
        this._viewAngle = 0.65; // tilt angle
        this._hue = 200;
        this._hue2 = 30;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._intensity = 1;
        this._damping = 0.97;
        this._waveSpeed = 0.3;
        this._baseAmplitude = 0;
        this._clickWaves = [];
    }

    configure(rng, hues) {
        this.tick = 0;
        this.mode = Math.floor(rng() * 6);
        this._clickWaves = [];

        this._hue = hues.length > 0 ? hues[0].h : this._getModeDefaultHue(rng);
        this._hue2 = hues.length > 1 ? hues[1].h : (this._hue + 120) % 360;
        this._intensity = 0.5 + rng() * 0.5;
        this._perspective = 0.4 + rng() * 0.4;
        this._viewAngle = 0.5 + rng() * 0.3;
        this._damping = 0.95 + rng() * 0.035;
        this._waveSpeed = 0.2 + rng() * 0.3;
        this._cellSize = 15 + Math.floor(rng() * 15);

        const W = window.innerWidth;
        const H = window.innerHeight;

        this._cols = Math.ceil(W / this._cellSize) + 2;
        this._rows = Math.ceil(H / (this._cellSize * this._viewAngle)) + 10;

        const size = this._cols * this._rows;
        this._heightMap = new Float32Array(size);
        this._velocityMap = new Float32Array(size);

        // Mode-specific initial terrain
        if (this.mode === 1) {
            // Mountain: initial noise
            for (let i = 0; i < size; i++) {
                const col = i % this._cols;
                const row = Math.floor(i / this._cols);
                this._heightMap[i] = (Math.sin(col * 0.2) * Math.cos(row * 0.15) + Math.sin(col * 0.07 + row * 0.05)) * 15;
            }
        } else if (this.mode === 5) {
            // Alien: crystalline initial state
            for (let i = 0; i < size; i++) {
                const col = i % this._cols;
                const row = Math.floor(i / this._cols);
                const crystal = Math.abs(Math.sin(col * 0.3) * Math.cos(row * 0.2)) * 20;
                this._heightMap[i] = crystal > 12 ? crystal : 0;
            }
        }

        this._baseAmplitude = this.mode === 0 ? 8 + rng() * 12 : 5 + rng() * 10;
    }

    _getModeDefaultHue(rng) {
        switch (this.mode) {
            case 0: return 200 + Math.floor(rng() * 30); // Ocean blue
            case 1: return 30 + Math.floor(rng() * 30);  // Earth
            case 2: return Math.floor(rng() * 360);       // Neon anything
            case 3: return 15 + Math.floor(rng() * 20);  // Tectonic red
            case 4: return 200 + Math.floor(rng() * 40); // Chrome blue
            case 5: return Math.floor(rng() * 360);       // Alien
            default: return 200;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        const clickJust = isClicking && !this._wasClicking;
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        if (!this._heightMap) return;

        const cols = this._cols;
        const rows = this._rows;
        const cs = this._cellSize;
        const heights = this._heightMap;
        const velocities = this._velocityMap;
        const damping = this._damping;
        const waveSpeed = this._waveSpeed;

        // Click waves
        if (clickJust) {
            this._clickWaves.push({ x: mx, y: my, radius: 0, strength: 30, active: true });
            if (this._clickWaves.length > 5) this._clickWaves.shift();
        }

        // Cursor influence on height map
        const gridMX = Math.floor(mx / cs);
        const gridMY = Math.floor(my / (cs * this._viewAngle));
        const influenceRadius = 4;

        for (let dr = -influenceRadius; dr <= influenceRadius; dr++) {
            for (let dc = -influenceRadius; dc <= influenceRadius; dc++) {
                const c = gridMX + dc;
                const r = gridMY + dr;
                if (c >= 0 && c < cols && r >= 0 && r < rows) {
                    const dist = Math.sqrt(dr * dr + dc * dc);
                    if (dist < influenceRadius) {
                        const influence = (1 - dist / influenceRadius);
                        const idx = r * cols + c;

                        if (this.mode === 0) {
                            // Ocean: cursor creates depression (wake)
                            velocities[idx] -= influence * 0.5;
                        } else if (this.mode === 1) {
                            // Mountain: cursor carves
                            if (isClicking) {
                                heights[idx] -= influence * 0.8;
                            } else {
                                velocities[idx] += influence * this._mouseSpeed * 0.02;
                            }
                        } else if (this.mode === 2) {
                            // Sound: cursor speed = height
                            velocities[idx] += influence * this._mouseSpeed * 0.1;
                        } else if (this.mode === 3) {
                            // Tectonic: cursor pushes up
                            if (isClicking) {
                                velocities[idx] += influence * 3;
                            }
                        } else if (this.mode === 4) {
                            // Mirror: ripple
                            velocities[idx] += influence * 1.5 * Math.sin(this.tick * 0.3);
                        } else {
                            // Alien: grow crystals
                            velocities[idx] += influence * 0.8;
                        }
                    }
                }
            }
        }

        // Click wave propagation
        for (const w of this._clickWaves) {
            if (!w.active) continue;
            w.radius += 3;
            w.strength *= 0.98;
            if (w.strength < 0.1) { w.active = false; continue; }

            const wGridX = Math.floor(w.x / cs);
            const wGridY = Math.floor(w.y / (cs * this._viewAngle));
            const wRadius = Math.min(15, Math.floor(w.radius / cs)); // Cap to avoid huge loops

            for (let dr = -wRadius - 1; dr <= wRadius + 1; dr++) {
                for (let dc = -wRadius - 1; dc <= wRadius + 1; dc++) {
                    const c = wGridX + dc;
                    const r = wGridY + dr;
                    if (c >= 0 && c < cols && r >= 0 && r < rows) {
                        const dist = Math.sqrt(dr * dr + dc * dc) * cs;
                        const ringDist = Math.abs(dist - w.radius);
                        if (ringDist < cs * 2) {
                            const force = (1 - ringDist / (cs * 2)) * w.strength * 0.1;
                            velocities[r * cols + c] += force;
                        }
                    }
                }
            }
        }

        // Wave simulation (2D wave equation)
        // In-place update: velocities first, then apply to heights
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                const idx = r * cols + c;
                // Laplacian (neighbors average minus center)
                const laplacian = (
                    heights[idx - 1] + heights[idx + 1] +
                    heights[idx - cols] + heights[idx + cols]
                ) * 0.25 - heights[idx];

                velocities[idx] += laplacian * waveSpeed;
                velocities[idx] *= damping;

                // Mode 0: base sine waves
                if (this.mode === 0) {
                    const baseWave = Math.sin(c * 0.15 + this.tick * 0.03) *
                        Math.cos(r * 0.1 + this.tick * 0.02) * this._baseAmplitude * 0.1;
                    velocities[idx] += (baseWave - heights[idx]) * 0.005;
                }
            }
        }

        // Apply velocities to heights
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                const idx = r * cols + c;
                heights[idx] += velocities[idx];
            }
        }
    }

    draw(ctx, system) {
        if (!this._heightMap) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const W = system.width;
        const H = system.height;
        const cols = this._cols;
        const rows = this._rows;
        const cs = this._cellSize;
        const heights = this._heightMap;
        const hue = this._hue;
        const hue2 = this._hue2;
        const intensity = this._intensity;
        const viewAngle = this._viewAngle;
        const perspective = this._perspective;

        ctx.lineWidth = 0.6;
        ctx.lineCap = 'round';

        // Project 3D grid to 2D with perspective
        const vanishY = H * 0.3;
        const vanishX = W * 0.5;

        // Shaded fill strips between adjacent rows (gives depth/body to terrain)
        for (let r = 0; r < rows - 2; r += 2) {
            const rp0 = r / rows;
            const rp1 = (r + 2) / rows;
            const ps0 = 0.3 + rp0 * 0.7;
            const ps1 = 0.3 + rp1 * 0.7;
            const sy0Base = vanishY + (r * cs * viewAngle) * ps0;
            const sy1Base = vanishY + ((r + 2) * cs * viewAngle) * ps1;

            if (sy0Base > H + 50 || sy1Base < -50) continue;

            // Sample average height for fill color
            const midIdx = (r + 1) * cols + Math.floor(cols / 2);
            const midHeight = heights[midIdx] || 0;
            let fillHue;
            if (this.mode === 2) fillHue = (hue + r * 3 + this.tick * 0.5) % 360;
            else if (this.mode === 5) fillHue = (hue + r * 5) % 360;
            else fillHue = (hue + rp0 * 30) % 360;

            const fillAlpha = (0.01 + rp0 * 0.03 + Math.abs(midHeight) * 0.001) * intensity;
            ctx.fillStyle = `hsla(${fillHue}, 50%, 30%, ${fillAlpha})`;

            ctx.beginPath();
            // Top edge
            for (let c = 0; c < cols; c += 2) {
                const sx = vanishX + (c * cs - W / 2) * ps0;
                const sy = sy0Base - heights[r * cols + c] * ps0;
                if (c === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            // Bottom edge (reversed)
            for (let c = cols - 1; c >= 0; c -= 2) {
                const sx = vanishX + (c * cs - W / 2) * ps1;
                const sy = sy1Base - heights[(r + 2) * cols + Math.min(c, cols - 1)] * ps1;
                ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Wireframe horizontal lines
        for (let r = 0; r < rows - 1; r++) {
            const rowProgress = r / rows;
            const perspectiveScale = 0.3 + rowProgress * 0.7;
            const screenY = vanishY + (r * cs * viewAngle) * perspectiveScale;

            if (screenY < -50 || screenY > H + 50) continue;

            ctx.beginPath();
            let hasStarted = false;

            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const height = heights[idx];

                const screenX = vanishX + (c * cs - W / 2) * perspectiveScale;
                const sy = screenY - height * perspectiveScale;

                if (screenX < -50 || screenX > W + 50) {
                    hasStarted = false;
                    continue;
                }

                if (!hasStarted) {
                    ctx.moveTo(screenX, sy);
                    hasStarted = true;
                } else {
                    ctx.lineTo(screenX, sy);
                }
            }

            const depthAlpha = (0.05 + rowProgress * 0.15) * intensity;
            let lineHue;
            if (this.mode === 2) {
                lineHue = (hue + r * 3 + this.tick * 0.5) % 360;
            } else if (this.mode === 4) {
                // Mirror mode: higher saturation, chrome-like gradient
                lineHue = (hue + Math.sin(r * 0.1 + this.tick * 0.01) * 30) % 360;
            } else if (this.mode === 5) {
                lineHue = (hue + r * 5) % 360;
            } else {
                lineHue = (hue + rowProgress * 30) % 360;
            }

            const sat = this.mode === 4 ? 30 : 60; // Chrome desaturated
            const light = this.mode === 4 ? 70 + rowProgress * 20 : 50 + rowProgress * 20;
            ctx.strokeStyle = `hsla(${lineHue}, ${sat}%, ${light}%, ${depthAlpha})`;
            ctx.stroke();
        }

        // Vertical lines for depth (every other column)
        for (let c = 0; c < cols; c += 2) {
            ctx.beginPath();
            let hasStarted = false;

            for (let r = 0; r < rows; r++) {
                const rowProgress = r / rows;
                const perspectiveScale = 0.3 + rowProgress * 0.7;
                const screenY = vanishY + (r * cs * viewAngle) * perspectiveScale;
                const screenX = vanishX + (c * cs - W / 2) * perspectiveScale;
                const idx = r * cols + c;
                const height = heights[idx];
                const sy = screenY - height * perspectiveScale;

                if (screenY < -50 || screenY > H + 50 || screenX < -50 || screenX > W + 50) {
                    hasStarted = false;
                    continue;
                }

                if (!hasStarted) {
                    ctx.moveTo(screenX, sy);
                    hasStarted = true;
                } else {
                    ctx.lineTo(screenX, sy);
                }
            }

            const colProgress = c / cols;
            const alpha = (this.mode === 4 ? 0.06 : 0.04) * intensity;
            ctx.strokeStyle = `hsla(${(hue2 + colProgress * 20) % 360}, 50%, 55%, ${alpha})`;
            ctx.stroke();
        }

        // Mode 4: mirror reflection — draw inverted faint copy below terrain
        if (this.mode === 4) {
            ctx.globalAlpha = 0.15 * intensity;
            for (let r = 0; r < rows - 1; r += 2) {
                const rowProgress = r / rows;
                const perspectiveScale = 0.3 + rowProgress * 0.7;
                const screenY = vanishY + (r * cs * viewAngle) * perspectiveScale;
                if (screenY < -50 || screenY > H + 50) continue;

                ctx.beginPath();
                for (let c = 0; c < cols; c++) {
                    const height = heights[r * cols + c];
                    const screenX = vanishX + (c * cs - W / 2) * perspectiveScale;
                    // Mirror: reflect height below the baseline
                    const sy = screenY + height * perspectiveScale * 0.5;
                    if (c === 0) ctx.moveTo(screenX, sy);
                    else ctx.lineTo(screenX, sy);
                }
                const mirrorHue = (hue + rowProgress * 20) % 360;
                ctx.strokeStyle = `hsla(${mirrorHue}, 30%, 65%, ${0.08})`;
                ctx.lineWidth = 0.4;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Highlight peaks and valleys (every other cell)
        for (let r = 1; r < rows - 1; r += 2) {
            const rowProgress = r / rows;
            const perspectiveScale = 0.3 + rowProgress * 0.7;
            const screenY = vanishY + (r * cs * viewAngle) * perspectiveScale;

            for (let c = 1; c < cols - 1; c += 2) {
                const idx = r * cols + c;
                const height = heights[idx];
                const absH = Math.abs(height);

                if (absH < 8) continue;

                const screenX = vanishX + (c * cs - W / 2) * perspectiveScale;
                const sy = screenY - height * perspectiveScale;

                if (screenX < 0 || screenX > W || sy < 0 || sy > H) continue;

                const peakAlpha = Math.min(0.2, absH * 0.008) * intensity;
                const peakHue = height > 0 ? hue2 : hue;
                ctx.fillStyle = `hsla(${peakHue}, 70%, 70%, ${peakAlpha})`;
                ctx.beginPath();
                ctx.arc(screenX, sy, 1.5 + absH * 0.05, 0, TAU);
                ctx.fill();
            }
        }

        // Cursor glow indicator on terrain surface
        const gridMX = Math.floor(this._mx / cs);
        const gridMY = Math.floor(this._my / (cs * viewAngle));
        if (gridMX >= 0 && gridMX < cols && gridMY >= 0 && gridMY < rows) {
            const rp = gridMY / rows;
            const ps = 0.3 + rp * 0.7;
            const cursorH = heights[gridMY * cols + gridMX];
            const sx = vanishX + (gridMX * cs - W / 2) * ps;
            const sy = vanishY + (gridMY * cs * viewAngle) * ps - cursorH * ps;
            ctx.fillStyle = `hsla(${hue2}, 80%, 75%, ${0.15 * intensity})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, TAU);
            ctx.fill();
            ctx.fillStyle = `hsla(${hue2}, 80%, 75%, ${0.04 * intensity})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 25, 0, TAU);
            ctx.fill();
        }

        // Mode 3: fault line rings
        if (this.mode === 3) {
            ctx.strokeStyle = `hsla(${hue2}, 80%, 60%, ${0.15 * intensity})`;
            ctx.lineWidth = 1.5;
            for (const w of this._clickWaves) {
                if (!w.active) continue;
                ctx.beginPath();
                ctx.arc(w.x, w.y * 0.5 + vanishY * 0.5, w.radius * 0.3, 0, TAU);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
