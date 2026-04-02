/**
 * @file chaos_mosaic_architecture.js
 * @description A seed-driven cellular automaton that creates living mosaic patterns.
 * Each seed generates completely different rules, color schemes, cell shapes, and
 * evolution speeds. The mouse acts as a "mutation source" — cells near the cursor
 * mutate their rules, creating ripples of change through the mosaic. Clicking
 * injects a "chaos bomb" that randomizes a region. The result is a constantly
 * evolving, never-repeating tapestry that responds to interaction.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class ChaosMosaicArchitecture extends Architecture {
    constructor() {
        super();
        this.cells = null;
        this.nextCells = null;
        this.cols = 0;
        this.rows = 0;
        this.cellSize = 0;
        this.tick = 0;
        this.baseHue = 0;
        this.ruleSet = [];
        this.colorMode = 0;
        this.cellShape = 0;
        this.evolutionSpeed = 1;
        this.mutationRadius = 0;
        this.trailEnabled = false;
        this.glowEnabled = false;
        this.symmetryMode = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        this.tick = 0;
        this.baseHue = system.hue;

        // Seed-driven cell size affects visual density
        this.cellSize = Math.floor(8 + rng() * 20);
        this.cols = Math.ceil(w / this.cellSize);
        this.rows = Math.ceil(h / this.cellSize);

        // Cell shape: 0=square, 1=circle, 2=diamond, 3=hex-ish, 4=cross
        this.cellShape = Math.floor(rng() * 5);
        // Color mode: 0=hue-wheel, 1=state-heat, 2=age-gradient, 3=neighbor-blend, 4=monochrome-pulse
        this.colorMode = Math.floor(rng() * 5);
        // Evolution speed: frames between updates
        this.evolutionSpeed = 1 + Math.floor(rng() * 4);
        this.mutationRadius = 3 + Math.floor(rng() * 8);
        this.trailEnabled = rng() > 0.5;
        this.glowEnabled = rng() > 0.6;
        // Symmetry: 0=none, 1=horizontal, 2=vertical, 3=quad, 4=radial
        this.symmetryMode = Math.floor(rng() * 5);

        // Number of cell states (more states = more complex patterns)
        this.stateCount = 3 + Math.floor(rng() * 6);

        // Generate cellular automaton rules based on seed
        // Rule: for each state, define what state it transitions to based on neighbor count
        this.ruleSet = [];
        for (let s = 0; s < this.stateCount; s++) {
            const rule = [];
            for (let n = 0; n <= 8; n++) {
                rule.push(Math.floor(rng() * this.stateCount));
            }
            this.ruleSet.push(rule);
        }

        // Survival/birth thresholds for added variety
        this.birthThreshold = 1 + Math.floor(rng() * 4);
        this.deathThreshold = Math.floor(rng() * 3);
        this.agingRate = rng() > 0.5 ? 1 : 0;

        // Initialize cell grid
        this.cells = new Uint8Array(this.cols * this.rows);
        this.nextCells = new Uint8Array(this.cols * this.rows);
        this.cellAge = new Uint16Array(this.cols * this.rows);

        // Seed initial pattern based on seed
        const patternType = Math.floor(rng() * 6);
        this._seedPattern(rng, patternType);

        // Generate seed-based color palette
        this.palette = [];
        for (let s = 0; s < this.stateCount; s++) {
            this.palette.push({
                h: (this.baseHue + s * (360 / this.stateCount) + rng() * 30) % 360,
                s: 40 + rng() * 50,
                l: 20 + rng() * 40,
            });
        }
    }

    _seedPattern(rng, patternType) {
        const cx = Math.floor(this.cols / 2);
        const cy = Math.floor(this.rows / 2);

        switch (patternType) {
            case 0: // Random scatter
                for (let i = 0; i < this.cells.length; i++) {
                    this.cells[i] = rng() > 0.6 ? Math.floor(rng() * this.stateCount) : 0;
                }
                break;
            case 1: // Central explosion
                for (let y = -10; y <= 10; y++) {
                    for (let x = -10; x <= 10; x++) {
                        if (x * x + y * y < 100) {
                            const idx = (cy + y) * this.cols + (cx + x);
                            if (idx >= 0 && idx < this.cells.length) {
                                this.cells[idx] = Math.floor(rng() * this.stateCount);
                            }
                        }
                    }
                }
                break;
            case 2: // Diagonal stripes
                for (let y = 0; y < this.rows; y++) {
                    for (let x = 0; x < this.cols; x++) {
                        this.cells[y * this.cols + x] = ((x + y) % this.stateCount);
                    }
                }
                break;
            case 3: // Concentric rings
                for (let y = 0; y < this.rows; y++) {
                    for (let x = 0; x < this.cols; x++) {
                        const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                        this.cells[y * this.cols + x] = Math.floor(dist) % this.stateCount;
                    }
                }
                break;
            case 4: // Noise clusters
                for (let i = 0; i < this.cells.length; i++) {
                    const x = i % this.cols;
                    const y = Math.floor(i / this.cols);
                    const noise = Math.sin(x * 0.3 + rng() * 10) * Math.cos(y * 0.3 + rng() * 10);
                    this.cells[i] = noise > 0 ? Math.floor(rng() * this.stateCount) : 0;
                }
                break;
            default: // Spiral seed
                for (let a = 0; a < Math.PI * 8; a += 0.1) {
                    const r = a * 2;
                    const x = cx + Math.floor(Math.cos(a) * r);
                    const y = cy + Math.floor(Math.sin(a) * r);
                    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                        this.cells[y * this.cols + x] = Math.floor(a / (Math.PI * 2) * this.stateCount) % this.stateCount;
                    }
                }
                break;
        }
    }

    update(system) {
        this.tick++;
        if (this.tick % this.evolutionSpeed !== 0) return;

        const cols = this.cols;
        const rows = this.rows;

        // Mouse mutation: cells near cursor have rules altered
        const mx = Math.floor(mouse.x / this.cellSize);
        const my = Math.floor(mouse.y / this.cellSize);
        const mr = this.mutationRadius;

        // Evolve cells
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = y * cols + x;
                const state = this.cells[idx];

                // Count neighbors of same state and total active
                let activeNeighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        let nx = x + dx;
                        let ny = y + dy;
                        // Wrap edges
                        if (nx < 0) nx = cols - 1;
                        if (nx >= cols) nx = 0;
                        if (ny < 0) ny = rows - 1;
                        if (ny >= rows) ny = 0;
                        if (this.cells[ny * cols + nx] > 0) activeNeighbors++;
                    }
                }

                // Apply rule
                let newState = this.ruleSet[state][activeNeighbors];

                // Mouse proximity mutation
                const dmx = x - mx;
                const dmy = y - my;
                if (dmx * dmx + dmy * dmy < mr * mr) {
                    // Cells near mouse evolve faster / differently
                    newState = (newState + 1) % this.stateCount;
                }

                // Apply symmetry
                if (this.symmetryMode === 1 && x < cols / 2) {
                    newState = this.nextCells[y * cols + (cols - 1 - x)] || newState;
                } else if (this.symmetryMode === 2 && y < rows / 2) {
                    newState = this.nextCells[(rows - 1 - y) * cols + x] || newState;
                }

                this.nextCells[idx] = newState;

                // Age tracking
                if (newState === state) {
                    this.cellAge[idx] = Math.min(255, this.cellAge[idx] + this.agingRate);
                } else {
                    this.cellAge[idx] = 0;
                }
            }
        }

        // Swap buffers
        const temp = this.cells;
        this.cells = this.nextCells;
        this.nextCells = temp;

        // Apply symmetry as post-pass
        if (this.symmetryMode === 3) {
            // Quad symmetry
            const halfX = Math.floor(cols / 2);
            const halfY = Math.floor(rows / 2);
            for (let y = 0; y < halfY; y++) {
                for (let x = 0; x < halfX; x++) {
                    const val = this.cells[y * cols + x];
                    this.cells[y * cols + (cols - 1 - x)] = val;
                    this.cells[(rows - 1 - y) * cols + x] = val;
                    this.cells[(rows - 1 - y) * cols + (cols - 1 - x)] = val;
                }
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const cs = this.cellSize;
        const cols = this.cols;
        const rows = this.rows;

        // Trail effect: don't fully clear, let patterns smear
        if (this.trailEnabled) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(0, 0, system.width, system.height);
        }

        // Batch draw by state for fewer style changes
        for (let state = 1; state < this.stateCount; state++) {
            const pal = this.palette[state];
            let h, s, l, a;

            if (this.colorMode === 4) {
                // Monochrome pulse
                const pulse = Math.sin(this.tick * 0.02 + state * 0.5) * 0.3 + 0.7;
                h = this.baseHue;
                s = 20;
                l = pal.l * pulse;
                a = 0.7;
            } else {
                h = this.colorMode === 0 ? (pal.h + this.tick * 0.1) % 360 : pal.h;
                s = pal.s;
                l = pal.l;
                a = 0.6;
            }

            ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${a})`;

            if (this.glowEnabled) {
                ctx.shadowColor = `hsla(${h}, ${s}%, ${l + 20}%, 0.5)`;
                ctx.shadowBlur = 4;
            }

            // Draw all cells of this state in one batch
            if (this.cellShape === 0) {
                // Squares: batch as rectangles
                ctx.beginPath();
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        if (this.cells[y * cols + x] === state) {
                            ctx.rect(x * cs, y * cs, cs - 1, cs - 1);
                        }
                    }
                }
                ctx.fill();
            } else if (this.cellShape === 1) {
                // Circles
                const halfCS = cs / 2;
                ctx.beginPath();
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        if (this.cells[y * cols + x] === state) {
                            ctx.moveTo(x * cs + cs, y * cs + halfCS);
                            ctx.arc(x * cs + halfCS, y * cs + halfCS, halfCS - 1, 0, Math.PI * 2);
                        }
                    }
                }
                ctx.fill();
            } else if (this.cellShape === 2) {
                // Diamonds
                const halfCS = cs / 2;
                ctx.beginPath();
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        if (this.cells[y * cols + x] === state) {
                            const px = x * cs + halfCS;
                            const py = y * cs + halfCS;
                            ctx.moveTo(px, py - halfCS);
                            ctx.lineTo(px + halfCS, py);
                            ctx.lineTo(px, py + halfCS);
                            ctx.lineTo(px - halfCS, py);
                            ctx.closePath();
                        }
                    }
                }
                ctx.fill();
            } else if (this.cellShape === 3) {
                // Hex-ish (offset rows)
                const halfCS = cs / 2;
                ctx.beginPath();
                for (let y = 0; y < rows; y++) {
                    const offset = (y % 2) * halfCS;
                    for (let x = 0; x < cols; x++) {
                        if (this.cells[y * cols + x] === state) {
                            const px = x * cs + halfCS + offset;
                            const py = y * cs + halfCS;
                            for (let i = 0; i < 6; i++) {
                                const angle = (i / 6) * Math.PI * 2;
                                const hx = px + Math.cos(angle) * (halfCS - 1);
                                const hy = py + Math.sin(angle) * (halfCS - 1);
                                if (i === 0) ctx.moveTo(hx, hy);
                                else ctx.lineTo(hx, hy);
                            }
                            ctx.closePath();
                        }
                    }
                }
                ctx.fill();
            } else {
                // Cross shape
                const third = cs / 3;
                ctx.beginPath();
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        if (this.cells[y * cols + x] === state) {
                            const px = x * cs;
                            const py = y * cs;
                            ctx.rect(px + third, py, third, cs);
                            ctx.rect(px, py + third, cs, third);
                        }
                    }
                }
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Age-based overlay (older cells glow brighter)
        if (this.colorMode === 2) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.15;
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const age = this.cellAge[y * cols + x];
                    if (age > 20 && this.cells[y * cols + x] > 0) {
                        const ageAlpha = Math.min(1, age / 100);
                        ctx.fillStyle = `hsla(${this.baseHue}, 60%, 80%, ${ageAlpha})`;
                        ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1);
                    }
                }
            }
            ctx.restore();
        }

        // Mouse influence visualization
        const mx = mouse.x;
        const my = mouse.y;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cursorGrad = ctx.createRadialGradient(mx, my, 0, mx, my, this.mutationRadius * this.cellSize);
        cursorGrad.addColorStop(0, `hsla(${this.baseHue}, 80%, 60%, 0.08)`);
        cursorGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cursorGrad;
        ctx.beginPath();
        ctx.arc(mx, my, this.mutationRadius * this.cellSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
