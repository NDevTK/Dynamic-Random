/**
 * @file cellular_automata_effects.js
 * @description Seed-driven cellular automata with unique rule sets per universe.
 * Cells live on a grid and evolve based on neighbor counts, producing Game of Life,
 * crystal growth, maze generation, and alien biology patterns. The cursor acts as
 * a brush that seeds new cells, and clicking triggers explosive growth or death waves.
 *
 * Modes:
 * 0 - Conway Classic: Standard B3/S23 Game of Life with colorful age-based rendering
 * 1 - Crystal Growth: Cells crystallize outward from seeds with angular facets
 * 2 - Brain: Brian's Brain 3-state automaton with firing/refractory pulses
 * 3 - Alien Biome: Custom birth/survival rules producing alien organic growth
 * 4 - Maze Runner: Maze-generating rules (B3/S12345) with pathfinding visualization
 * 5 - Lava Lamp: Smooth blob-like rules with thermal color mapping
 */

export class CellularAutomata {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this._rng = Math.random;

        // Grid
        this._cellSize = 6;
        this._cols = 0;
        this._rows = 0;
        this._grid = null;      // Current state (Uint8Array)
        this._nextGrid = null;  // Next state buffer
        this._ageGrid = null;   // Cell age for color mapping (Uint16Array)
        this._maxAge = 255;

        // Rules (as Sets for O(1) lookup)
        this._birthRule = new Set();
        this._surviveRule = new Set();
        this._states = 2; // 2 = binary, 3 = Brain's Brain

        // Offscreen canvas for efficient pixel rendering
        this._offCanvas = null;
        this._offCtx = null;
        this._imageData = null;

        // Mouse
        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Performance: only update automata every N frames
        this._updateInterval = 3;
        this._brushRadius = 3;

        // Color lookup table (avoids per-cell hslToRgb)
        this._colorLUT = null; // Uint8Array[256 * 4] for age-based coloring
        this._brainFireLUT = null; // [r,g,b] for Brain firing state
        this._brainRefractLUT = null; // [r,g,b] for Brain refractory state

        // Stagnation detection
        this._lastPopulation = 0;
        this._stagnantFrames = 0;
    }

    configure(rng, hues) {
        this._rng = rng;
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);

        this.mode = Math.floor(rng() * 6);

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Adjust cell size per mode
        switch (this.mode) {
            case 0: this._cellSize = 4 + Math.floor(rng() * 4); break;
            case 1: this._cellSize = 5 + Math.floor(rng() * 3); break;
            case 2: this._cellSize = 4 + Math.floor(rng() * 3); break;
            case 3: this._cellSize = 5 + Math.floor(rng() * 4); break;
            case 4: this._cellSize = 3 + Math.floor(rng() * 3); break;
            case 5: this._cellSize = 6 + Math.floor(rng() * 4); break;
        }

        this._cols = Math.ceil(w / this._cellSize);
        this._rows = Math.ceil(h / this._cellSize);
        const total = this._cols * this._rows;
        this._grid = new Uint8Array(total);
        this._nextGrid = new Uint8Array(total);
        this._ageGrid = new Uint16Array(total);

        // Set rules per mode
        this._birthRule.clear();
        this._surviveRule.clear();
        this._states = 2;
        this._updateInterval = 3;
        this._brushRadius = 3;

        switch (this.mode) {
            case 0: // Conway Classic
                this._birthRule.add(3);
                this._surviveRule.add(2);
                this._surviveRule.add(3);
                this._updateInterval = 3;
                break;
            case 1: // Crystal Growth
                // Custom crystallization rule - grow from fewer neighbors
                this._birthRule.add(1);
                this._birthRule.add(3);
                this._surviveRule.add(1);
                this._surviveRule.add(2);
                this._surviveRule.add(3);
                this._surviveRule.add(4);
                this._updateInterval = 2;
                break;
            case 2: // Brain
                this._states = 3; // 0=dead, 1=firing, 2=refractory
                this._birthRule.add(2);
                this._surviveRule.clear(); // Firing always -> refractory -> dead
                this._updateInterval = 2;
                break;
            case 3: // Alien Biome - random rules
                {
                    const birthCount = 1 + Math.floor(rng() * 3);
                    for (let i = 0; i < birthCount; i++) {
                        this._birthRule.add(1 + Math.floor(rng() * 7));
                    }
                    const surviveCount = 1 + Math.floor(rng() * 4);
                    for (let i = 0; i < surviveCount; i++) {
                        this._surviveRule.add(1 + Math.floor(rng() * 7));
                    }
                    this._updateInterval = 2 + Math.floor(rng() * 3);
                }
                break;
            case 4: // Maze Runner
                this._birthRule.add(3);
                this._surviveRule.add(1);
                this._surviveRule.add(2);
                this._surviveRule.add(3);
                this._surviveRule.add(4);
                this._surviveRule.add(5);
                this._updateInterval = 4;
                break;
            case 5: // Lava Lamp
                this._birthRule.add(3);
                this._birthRule.add(6);
                this._birthRule.add(7);
                this._birthRule.add(8);
                this._surviveRule.add(3);
                this._surviveRule.add(4);
                this._surviveRule.add(5);
                this._surviveRule.add(6);
                this._surviveRule.add(7);
                this._surviveRule.add(8);
                this._cellSize = Math.max(this._cellSize, 6);
                this._updateInterval = 2;
                break;
        }

        // Recalculate grid dims with final cell size
        this._cols = Math.ceil(w / this._cellSize);
        this._rows = Math.ceil(h / this._cellSize);
        const newTotal = this._cols * this._rows;
        if (newTotal !== total) {
            this._grid = new Uint8Array(newTotal);
            this._nextGrid = new Uint8Array(newTotal);
            this._ageGrid = new Uint16Array(newTotal);
        }

        // Seed initial pattern based on mode
        this._seedInitialPattern(rng);

        // Build color LUT
        this._buildColorLUT();

        // Reset stagnation detection
        this._lastPopulation = 0;
        this._stagnantFrames = 0;

        // Prepare offscreen canvas
        this._offCanvas = null;
    }

    _buildColorLUT() {
        const h = this.hue;
        // Pre-compute 256 RGBA entries for age-based coloring
        this._colorLUT = new Uint8Array(256 * 4);
        for (let age = 0; age < 256; age++) {
            const ageFrac = age / 255;
            let cellHue, sat, light;

            if (this.mode === 5) {
                cellHue = (h + ageFrac * 60) % 360;
                sat = 90;
                light = 30 + ageFrac * 40;
            } else if (this.mode === 1) {
                cellHue = (h + 180 - ageFrac * 120) % 360;
                sat = 60 + ageFrac * 30;
                light = 40 + ageFrac * 30;
            } else {
                cellHue = (h + ageFrac * 120) % 360;
                sat = 70;
                light = 40 + ageFrac * 30;
            }

            const rgb = this._hslToRgb(cellHue / 360, sat / 100, light / 100);
            const idx = age * 4;
            this._colorLUT[idx] = rgb[0];
            this._colorLUT[idx + 1] = rgb[1];
            this._colorLUT[idx + 2] = rgb[2];
            this._colorLUT[idx + 3] = 100 + Math.floor(ageFrac * 100);
        }

        // Brain state colors
        this._brainFireLUT = this._hslToRgb(h / 360, 0.8, 0.7);
        this._brainRefractLUT = this._hslToRgb(((h + 60) % 360) / 360, 0.5, 0.3);
    }

    _seedInitialPattern(rng) {
        const total = this._cols * this._rows;

        if (this.mode === 1) {
            // Crystal: seed a few points
            const seeds = 3 + Math.floor(rng() * 5);
            for (let s = 0; s < seeds; s++) {
                const x = Math.floor(rng() * this._cols);
                const y = Math.floor(rng() * this._rows);
                this._grid[y * this._cols + x] = 1;
            }
        } else if (this.mode === 4) {
            // Maze: seed center block
            const cx = Math.floor(this._cols / 2);
            const cy = Math.floor(this._rows / 2);
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < this._cols && ny >= 0 && ny < this._rows) {
                        this._grid[ny * this._cols + nx] = 1;
                    }
                }
            }
        } else {
            // Random fill ~15-30%
            const density = 0.15 + rng() * 0.15;
            for (let i = 0; i < total; i++) {
                this._grid[i] = rng() < density ? 1 : 0;
            }
        }
    }

    _ensureOffCanvas() {
        const w = this._cols * this._cellSize;
        const h = this._rows * this._cellSize;
        if (!this._offCanvas || this._offCanvas.width !== w || this._offCanvas.height !== h) {
            this._offCanvas = document.createElement('canvas');
            this._offCanvas.width = this._cols;
            this._offCanvas.height = this._rows;
            this._offCtx = this._offCanvas.getContext('2d', { alpha: true });
            this._imageData = this._offCtx.createImageData(this._cols, this._rows);
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._wasClicking = this._isClicking;
        this._isClicking = isClicking;
        this._mouseX = mx;
        this._mouseY = my;

        // Paint cells under cursor
        const cx = Math.floor(mx / this._cellSize);
        const cy = Math.floor(my / this._cellSize);
        const r = this._brushRadius;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy > r * r) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < this._cols && ny >= 0 && ny < this._rows) {
                    const idx = ny * this._cols + nx;
                    if (this._grid[idx] === 0) {
                        this._grid[idx] = 1;
                        this._ageGrid[idx] = 0;
                    }
                }
            }
        }

        // Click: explosive burst of life or death
        if (isClicking && !this._wasClicking) {
            const burstR = 8 + Math.floor(this._rng() * 6);
            for (let dy = -burstR; dy <= burstR; dy++) {
                for (let dx = -burstR; dx <= burstR; dx++) {
                    if (dx * dx + dy * dy > burstR * burstR) continue;
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < this._cols && ny >= 0 && ny < this._rows) {
                        const idx = ny * this._cols + nx;
                        // Alternate between giving life and death based on tick
                        this._grid[idx] = (this.tick % 2 === 0) ? 1 : 0;
                        this._ageGrid[idx] = 0;
                    }
                }
            }
        }

        // Step automata
        if (this.tick % this._updateInterval === 0) {
            this._step();

            // Stagnation detection: auto-reseed when population dies or is static
            if (this.tick % (this._updateInterval * 30) === 0) {
                let pop = 0;
                const grid = this._grid;
                const total = this._cols * this._rows;
                for (let i = 0; i < total; i++) {
                    if (grid[i] > 0) pop++;
                }
                if (pop === this._lastPopulation) {
                    this._stagnantFrames++;
                } else {
                    this._stagnantFrames = 0;
                }
                this._lastPopulation = pop;

                // If population is 0 or stagnant for too long, reseed
                if (pop === 0 || this._stagnantFrames > 10) {
                    this._stagnantFrames = 0;
                    // Inject some random life near cursor
                    const seedCX = Math.floor(mx / this._cellSize);
                    const seedCY = Math.floor(my / this._cellSize);
                    const seedR = 10;
                    for (let sdy = -seedR; sdy <= seedR; sdy++) {
                        for (let sdx = -seedR; sdx <= seedR; sdx++) {
                            if (sdx * sdx + sdy * sdy > seedR * seedR) continue;
                            const snx = seedCX + sdx;
                            const sny = seedCY + sdy;
                            if (snx >= 0 && snx < this._cols && sny >= 0 && sny < this._rows) {
                                const pr = ((this.tick * 2654435761 + snx * 1597334677 + sny) >>> 0) / 4294967296;
                                if (pr < 0.4) {
                                    this._grid[sny * this._cols + snx] = 1;
                                    this._ageGrid[sny * this._cols + snx] = 0;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    _step() {
        const cols = this._cols;
        const rows = this._rows;
        const grid = this._grid;
        const next = this._nextGrid;
        const age = this._ageGrid;

        if (this._states === 3) {
            // Brian's Brain: firing->refractory->dead, dead with 2 firing neighbors->firing
            for (let y = 0; y < rows; y++) {
                const yOff = y * cols;
                for (let x = 0; x < cols; x++) {
                    const idx = yOff + x;
                    const state = grid[idx];
                    if (state === 1) {
                        next[idx] = 2; // firing -> refractory
                        age[idx] = Math.min(this._maxAge, age[idx] + 4); // Track firing history
                    } else if (state === 2) {
                        next[idx] = 0; // refractory -> dead
                        // Don't reset age - let it decay slowly for visual history
                        age[idx] = Math.max(0, age[idx] - 1);
                    } else {
                        // Count firing neighbors
                        let count = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = (x + dx + cols) % cols;
                                const ny = (y + dy + rows) % rows;
                                if (grid[ny * cols + nx] === 1) count++;
                            }
                        }
                        next[idx] = this._birthRule.has(count) ? 1 : 0;
                    }
                }
            }
        } else {
            // Standard 2-state automata
            for (let y = 0; y < rows; y++) {
                const yOff = y * cols;
                for (let x = 0; x < cols; x++) {
                    const idx = yOff + x;
                    let count = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = (x + dx + cols) % cols;
                            const ny = (y + dy + rows) % rows;
                            if (grid[ny * cols + nx] > 0) count++;
                        }
                    }
                    if (grid[idx] > 0) {
                        next[idx] = this._surviveRule.has(count) ? 1 : 0;
                        if (next[idx]) age[idx] = Math.min(this._maxAge, age[idx] + 1);
                        else age[idx] = 0;
                    } else {
                        next[idx] = this._birthRule.has(count) ? 1 : 0;
                        if (next[idx]) age[idx] = 1;
                    }
                }
            }
        }

        // Swap buffers
        this._grid = next;
        this._nextGrid = grid;
    }

    draw(ctx, system) {
        this._ensureOffCanvas();

        const cols = this._cols;
        const rows = this._rows;
        const grid = this._grid;
        const age = this._ageGrid;
        const data = this._imageData.data;
        const lut = this._colorLUT;
        const isBrain = this._states === 3;
        const fireR = this._brainFireLUT[0], fireG = this._brainFireLUT[1], fireB = this._brainFireLUT[2];
        const refR = this._brainRefractLUT[0], refG = this._brainRefractLUT[1], refB = this._brainRefractLUT[2];
        const total = cols * rows;

        // Write pixel data using pre-computed color LUT
        for (let idx = 0; idx < total; idx++) {
            const pIdx = idx << 2; // idx * 4
            const state = grid[idx];

            if (state === 0) {
                // Dead cells: show faint ghost for Brain mode (firing history)
                if (isBrain && age[idx] > 0) {
                    const ghostAlpha = Math.min(60, age[idx]);
                    data[pIdx] = refR;
                    data[pIdx + 1] = refG;
                    data[pIdx + 2] = refB;
                    data[pIdx + 3] = ghostAlpha;
                } else {
                    data[pIdx] = 0;
                    data[pIdx + 1] = 0;
                    data[pIdx + 2] = 0;
                    data[pIdx + 3] = 0;
                }
            } else if (isBrain) {
                if (state === 1) {
                    data[pIdx] = fireR;
                    data[pIdx + 1] = fireG;
                    data[pIdx + 2] = fireB;
                    data[pIdx + 3] = 200;
                } else {
                    data[pIdx] = refR;
                    data[pIdx + 1] = refG;
                    data[pIdx + 2] = refB;
                    data[pIdx + 3] = 120;
                }
            } else {
                // Use pre-computed color LUT indexed by age
                const ageVal = Math.min(255, age[idx]);
                const lutIdx = ageVal << 2; // ageVal * 4
                data[pIdx] = lut[lutIdx];
                data[pIdx + 1] = lut[lutIdx + 1];
                data[pIdx + 2] = lut[lutIdx + 2];
                data[pIdx + 3] = lut[lutIdx + 3];
            }
        }

        this._offCtx.putImageData(this._imageData, 0, 0);

        // Draw scaled to screen
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        ctx.imageSmoothingEnabled = this.mode === 5; // Smooth for lava, crisp for others
        ctx.drawImage(this._offCanvas, 0, 0, window.innerWidth, window.innerHeight);
        ctx.restore();
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
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
}
