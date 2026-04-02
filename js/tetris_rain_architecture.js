/**
 * @file tetris_rain_architecture.js
 * @description Tetromino shapes falling and stacking, then dissolving in colorful
 * cascade waves. Mouse pushes pieces around and triggers line clears.
 * Seeds change piece palettes, fall speeds, grid sizes, dissolve patterns,
 * piece types (classic, pentomino, irregular), and gravity direction.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

const TETROMINOS = [
    // I
    [[1, 1, 1, 1]],
    // O
    [[1, 1], [1, 1]],
    // T
    [[0, 1, 0], [1, 1, 1]],
    // S
    [[0, 1, 1], [1, 1, 0]],
    // Z
    [[1, 1, 0], [0, 1, 1]],
    // L
    [[1, 0], [1, 0], [1, 1]],
    // J
    [[0, 1], [0, 1], [1, 1]],
];

const PENTOMINOS = [
    // F
    [[0, 1, 1], [1, 1, 0], [0, 1, 0]],
    // P
    [[1, 1], [1, 1], [1, 0]],
    // U
    [[1, 0, 1], [1, 1, 1]],
    // W
    [[1, 0, 0], [1, 1, 0], [0, 1, 1]],
    // X
    [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
];

export class TetrisRainArchitecture extends Architecture {
    constructor() {
        super();
        this.grid = [];
        this.fallingPieces = [];
        this.dissolveWaves = [];
        this.particles = [];
        this.particlePool = [];
        this.tick = 0;
        this.cellSize = 20;
        this.cols = 0;
        this.rows = 0;
    }

    init(system) {
        const rng = system.rng;

        this.gameStyle = Math.floor(rng() * 5);
        // 0=classic, 1=neon glow, 2=pastel soft, 3=monochrome, 4=rainbow wave

        this.pieceSet = Math.floor(rng() * 3);
        // 0=tetrominos, 1=pentominos, 2=mixed

        this.fallSpeed = 0.5 + rng() * 2;
        this.spawnRate = 0.05 + rng() * 0.1;
        this.cellSize = 15 + Math.floor(rng() * 20);
        this.dissolveStyle = Math.floor(rng() * 4);
        // 0=row clear, 1=cascade, 2=explode, 3=melt

        this.gravityDir = Math.floor(rng() * 4);
        // 0=down, 1=up, 2=left, 3=right

        this.rotationEnabled = rng() > 0.3;
        this.ghostEnabled = rng() > 0.5;
        this.trailEnabled = rng() > 0.4;
        this.dissolveThreshold = 0.6 + rng() * 0.3; // how full a row needs to be

        this.cols = Math.ceil(system.width / this.cellSize);
        this.rows = Math.ceil(system.height / this.cellSize);

        // Init grid (0 = empty, >0 = color index)
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid.push(new Uint8Array(this.cols));
        }

        this.colorCount = 7;
        this.generatePalette(rng);

        this.fallingPieces = [];
        this.dissolveWaves = [];
        this.particles = [];
        this.combo = 0;
        this.comboDisplay = 0;
        this.comboFade = 0;
        this.comboX = 0;
        this.comboY = 0;
        this.cachedMixedPieces = null;
        this.scoreFlashes = [];
    }

    generatePalette(rng) {
        this.colors = [];
        switch (this.gameStyle) {
            case 0: // Classic
                this.colors = ['#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];
                break;
            case 1: // Neon
                this.colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff4400', '#4400ff', '#ff0088'];
                break;
            case 2: // Pastel
                this.colors = ['#ffb3ba', '#bae1ff', '#baffc9', '#ffffba', '#e8baff', '#ffdfba', '#b3e6ff'];
                break;
            case 3: // Monochrome
                this.colors = ['#ffffff', '#dddddd', '#bbbbbb', '#999999', '#cccccc', '#eeeeee', '#aaaaaa'];
                break;
            case 4: { // Rainbow wave (hue-based)
                const baseHue = rng() * 360;
                for (let i = 0; i < 7; i++) {
                    this.colors.push(`hsl(${(baseHue + i * 51) % 360}, 80%, 60%)`);
                }
                break;
            }
        }
    }

    getAvailablePieces() {
        if (this.pieceSet === 0) return TETROMINOS;
        if (this.pieceSet === 1) return PENTOMINOS;
        if (!this.cachedMixedPieces) {
            this.cachedMixedPieces = TETROMINOS.concat(PENTOMINOS);
        }
        return this.cachedMixedPieces;
    }

    spawnPiece(system) {
        const pieces = this.getAvailablePieces();
        const shape = pieces[Math.floor(Math.random() * pieces.length)];
        const colorIdx = 1 + Math.floor(Math.random() * this.colorCount);
        const rotation = this.rotationEnabled ? Math.floor(Math.random() * 4) : 0;
        const rotated = this.rotatePiece(shape, rotation);

        let x, y;
        switch (this.gravityDir) {
            case 0: // down
                x = Math.floor(Math.random() * (this.cols - rotated[0].length));
                y = -rotated.length;
                break;
            case 1: // up
                x = Math.floor(Math.random() * (this.cols - rotated[0].length));
                y = this.rows;
                break;
            case 2: // left
                x = this.cols;
                y = Math.floor(Math.random() * (this.rows - rotated.length));
                break;
            case 3: // right
                x = -rotated[0].length;
                y = Math.floor(Math.random() * (this.rows - rotated.length));
                break;
        }

        this.fallingPieces.push({
            shape: rotated, x, y, colorIdx,
            speed: this.fallSpeed * (0.8 + Math.random() * 0.4),
            progress: 0,
        });
    }

    rotatePiece(shape, times) {
        let result = shape;
        for (let t = 0; t < times; t++) {
            const rows = result.length;
            const cols = result[0].length;
            const newShape = [];
            for (let c = 0; c < cols; c++) {
                const newRow = [];
                for (let r = rows - 1; r >= 0; r--) {
                    newRow.push(result[r][c]);
                }
                newShape.push(newRow);
            }
            result = newShape;
        }
        return result;
    }

    placePiece(piece) {
        const gx = Math.round(piece.x);
        const gy = Math.round(piece.y);
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (!piece.shape[r][c]) continue;
                const gr = gy + r;
                const gc = gx + c;
                if (gr >= 0 && gr < this.rows && gc >= 0 && gc < this.cols) {
                    this.grid[gr][gc] = piece.colorIdx;
                }
            }
        }
    }

    checkCollision(piece, ox, oy) {
        const gx = Math.round(piece.x + ox);
        const gy = Math.round(piece.y + oy);
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (!piece.shape[r][c]) continue;
                const gr = gy + r;
                const gc = gx + c;
                switch (this.gravityDir) {
                    case 0: if (gr >= this.rows) return true; break;
                    case 1: if (gr < 0) return true; break;
                    case 2: if (gc < 0) return true; break;
                    case 3: if (gc >= this.cols) return true; break;
                }
                if (gr >= 0 && gr < this.rows && gc >= 0 && gc < this.cols) {
                    if (this.grid[gr][gc] > 0) return true;
                }
            }
        }
        return false;
    }

    checkLines() {
        const isHorizontal = this.gravityDir === 0 || this.gravityDir === 1;

        if (isHorizontal) {
            for (let r = this.rows - 1; r >= 0; r--) {
                let filled = 0;
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] > 0) filled++;
                }
                if (filled / this.cols >= this.dissolveThreshold) {
                    this.dissolveLine(r, true);
                }
            }
        } else {
            for (let c = this.cols - 1; c >= 0; c--) {
                let filled = 0;
                for (let r = 0; r < this.rows; r++) {
                    if (this.grid[r][c] > 0) filled++;
                }
                if (filled / this.rows >= this.dissolveThreshold) {
                    this.dissolveLine(c, false);
                }
            }
        }
    }

    dissolveLine(index, isRow) {
        if (isRow) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[index][c] > 0) {
                    this.spawnDissolveParticle(c * this.cellSize, index * this.cellSize, this.grid[index][c]);
                    this.grid[index][c] = 0;
                }
            }
            // Shift rows
            if (this.gravityDir === 0) {
                for (let r = index; r > 0; r--) {
                    this.grid[r] = this.grid[r - 1].slice();
                }
                this.grid[0] = new Uint8Array(this.cols);
            } else {
                for (let r = index; r < this.rows - 1; r++) {
                    this.grid[r] = this.grid[r + 1].slice();
                }
                this.grid[this.rows - 1] = new Uint8Array(this.cols);
            }
        } else {
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[r][index] > 0) {
                    this.spawnDissolveParticle(index * this.cellSize, r * this.cellSize, this.grid[r][index]);
                    this.grid[r][index] = 0;
                }
            }
        }

        this.dissolveWaves.push({ index, isRow, progress: 0, speed: 0.05 });

        // Combo tracking
        this.combo++;
        this.comboDisplay = this.combo;
        this.comboFade = 1;
        if (isRow) {
            this.comboX = system ? system.width / 2 : 400;
            this.comboY = index * this.cellSize;
        } else {
            this.comboX = index * this.cellSize;
            this.comboY = system ? system.height / 2 : 300;
        }

        // Score flash
        if (this.scoreFlashes.length < 10) {
            this.scoreFlashes.push({
                text: this.combo > 1 ? `x${this.combo} COMBO!` : 'CLEAR!',
                x: this.comboX, y: this.comboY,
                life: 1, vy: -1.5,
                scale: this.combo > 2 ? 1.5 : 1,
            });
        }
    }

    spawnDissolveParticle(x, y, colorIdx) {
        if (this.particles.length >= 300) return; // cap particles
        const count = 3;
        for (let i = 0; i < count; i++) {
            let p = this.particlePool.length > 0 ? this.particlePool.pop() : {};
            p.x = x + this.cellSize * 0.5;
            p.y = y + this.cellSize * 0.5;
            p.vx = (Math.random() - 0.5) * 4;
            p.vy = (Math.random() - 0.5) * 4 - 1;
            p.life = 1;
            p.decay = 0.02 + Math.random() * 0.02;
            p.size = this.cellSize * 0.3 + Math.random() * this.cellSize * 0.3;
            p.colorIdx = colorIdx;
            this.particles.push(p);
        }
    }

    update(system) {
        this.tick++;

        // Spawn new pieces
        if (Math.random() < this.spawnRate && this.fallingPieces.length < 8) {
            this.spawnPiece(system);
        }

        // Update falling pieces
        for (let i = this.fallingPieces.length - 1; i >= 0; i--) {
            const piece = this.fallingPieces[i];

            // Mouse push
            const pcx = piece.x * this.cellSize + this.cellSize;
            const pcy = piece.y * this.cellSize + this.cellSize;
            const dx = pcx - mouse.x, dy = pcy - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 1) {
                const force = (150 - dist) * 0.0005;
                if (this.gravityDir === 0 || this.gravityDir === 1) {
                    piece.x += (dx / dist) * force * 5;
                } else {
                    piece.y += (dy / dist) * force * 5;
                }
            }

            // Move in gravity direction
            switch (this.gravityDir) {
                case 0: piece.y += piece.speed * 0.1; break;
                case 1: piece.y -= piece.speed * 0.1; break;
                case 2: piece.x -= piece.speed * 0.1; break;
                case 3: piece.x += piece.speed * 0.1; break;
            }

            // Check collision
            if (this.checkCollision(piece, 0, 0)) {
                // Step back
                switch (this.gravityDir) {
                    case 0: piece.y -= piece.speed * 0.1; break;
                    case 1: piece.y += piece.speed * 0.1; break;
                    case 2: piece.x += piece.speed * 0.1; break;
                    case 3: piece.x -= piece.speed * 0.1; break;
                }
                this.placePiece(piece);
                this.fallingPieces[i] = this.fallingPieces[this.fallingPieces.length - 1];
                this.fallingPieces.pop();
                this.checkLines();
            }
        }

        // Combo decay
        if (this.comboFade > 0) {
            this.comboFade -= 0.01;
            if (this.comboFade <= 0) {
                this.combo = 0;
            }
        }

        // Score flash decay
        for (let i = this.scoreFlashes.length - 1; i >= 0; i--) {
            const sf = this.scoreFlashes[i];
            sf.y += sf.vy;
            sf.life -= 0.015;
            if (sf.life <= 0) {
                this.scoreFlashes[i] = this.scoreFlashes[this.scoreFlashes.length - 1];
                this.scoreFlashes.pop();
            }
        }

        // Right-click (gravity well): clear blocks near mouse
        if (system.isGravityWell) {
            const mgc = Math.floor(mouse.x / this.cellSize);
            const mgr = Math.floor(mouse.y / this.cellSize);
            const clearRadius = 3;
            let cleared = false;
            for (let dr = -clearRadius; dr <= clearRadius; dr++) {
                for (let dc = -clearRadius; dc <= clearRadius; dc++) {
                    const r = mgr + dr, c = mgc + dc;
                    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.grid[r][c] > 0) {
                        if (Math.sqrt(dr * dr + dc * dc) <= clearRadius) {
                            this.spawnDissolveParticle(c * this.cellSize, r * this.cellSize, this.grid[r][c]);
                            this.grid[r][c] = 0;
                            cleared = true;
                        }
                    }
                }
            }
        }

        // Auto-dissolve if grid is too full
        if (this.tick % 120 === 0) {
            let totalFilled = 0;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] > 0) totalFilled++;
                }
            }
            if (totalFilled > this.rows * this.cols * 0.7) {
                // Clear random chunks
                const clearR = Math.floor(Math.random() * this.rows);
                this.dissolveLine(clearR, true);
            }
        }

        // Update dissolve waves (swap-remove for perf)
        for (let i = this.dissolveWaves.length - 1; i >= 0; i--) {
            this.dissolveWaves[i].progress += this.dissolveWaves[i].speed;
            if (this.dissolveWaves[i].progress >= 1) {
                this.dissolveWaves[i] = this.dissolveWaves[this.dissolveWaves.length - 1];
                this.dissolveWaves.pop();
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.05;
            p.vx *= 0.98;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particlePool.push(p);
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const cs = this.cellSize;

        // Draw placed blocks
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const ci = this.grid[r][c];
                if (ci === 0) continue;

                const x = c * cs;
                const y = r * cs;
                const color = this.colors[(ci - 1) % this.colors.length];

                ctx.fillStyle = color;

                if (this.gameStyle === 1) {
                    // Neon glow style
                    ctx.save();
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 8;
                    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
                    ctx.restore();
                } else {
                    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

                    // 3D bevel effect
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fillRect(x + 1, y + 1, cs - 2, 2);
                    ctx.fillRect(x + 1, y + 1, 2, cs - 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(x + 1, y + cs - 3, cs - 2, 2);
                    ctx.fillRect(x + cs - 3, y + 1, 2, cs - 2);
                }
            }
        }

        // Draw falling pieces
        for (const piece of this.fallingPieces) {
            const color = this.colors[(piece.colorIdx - 1) % this.colors.length];

            // Ghost/shadow
            if (this.ghostEnabled) {
                ctx.save();
                ctx.globalAlpha = 0.15;
                for (let r = 0; r < piece.shape.length; r++) {
                    for (let c = 0; c < piece.shape[r].length; c++) {
                        if (!piece.shape[r][c]) continue;
                        const x = (piece.x + c) * cs;
                        const y = (piece.y + r) * cs;
                        ctx.fillStyle = color;
                        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
                    }
                }
                ctx.restore();
            }

            // Trail
            if (this.trailEnabled) {
                ctx.save();
                ctx.globalAlpha = 0.1;
                for (let t = 1; t <= 3; t++) {
                    for (let r = 0; r < piece.shape.length; r++) {
                        for (let c = 0; c < piece.shape[r].length; c++) {
                            if (!piece.shape[r][c]) continue;
                            let tx = (piece.x + c) * cs;
                            let ty = (piece.y + r) * cs;
                            switch (this.gravityDir) {
                                case 0: ty -= t * cs * 0.5; break;
                                case 1: ty += t * cs * 0.5; break;
                                case 2: tx += t * cs * 0.5; break;
                                case 3: tx -= t * cs * 0.5; break;
                            }
                            ctx.fillStyle = color;
                            ctx.fillRect(tx + 1, ty + 1, cs - 2, cs - 2);
                        }
                    }
                }
                ctx.restore();
            }

            // Actual piece
            for (let r = 0; r < piece.shape.length; r++) {
                for (let c = 0; c < piece.shape[r].length; c++) {
                    if (!piece.shape[r][c]) continue;
                    const x = (piece.x + c) * cs;
                    const y = (piece.y + r) * cs;

                    if (this.gameStyle === 1) {
                        ctx.save();
                        ctx.shadowColor = color;
                        ctx.shadowBlur = 12;
                        ctx.fillStyle = color;
                        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
                        ctx.restore();
                    } else {
                        ctx.fillStyle = color;
                        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
                        ctx.fillStyle = 'rgba(255,255,255,0.25)';
                        ctx.fillRect(x + 1, y + 1, cs - 2, 2);
                        ctx.fillRect(x + 1, y + 1, 2, cs - 2);
                    }
                }
            }
        }

        // Draw dissolve wave effects
        for (const wave of this.dissolveWaves) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const alpha = (1 - wave.progress) * 0.5;
            if (wave.isRow) {
                const y = wave.index * cs;
                const grad = ctx.createLinearGradient(0, y, 0, y + cs);
                grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                grad.addColorStop(0.5, `rgba(255, 255, 200, ${alpha * 1.5})`);
                grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, y, system.width, cs);
            } else {
                const x = wave.index * cs;
                ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
                ctx.fillRect(x, 0, cs, system.height);
            }
            ctx.restore();
        }

        // Draw dissolve particles
        if (this.particles.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const p of this.particles) {
                const color = this.colors[(p.colorIdx - 1) % this.colors.length];
                ctx.globalAlpha = p.life;
                ctx.fillStyle = color;
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.life, p.size * p.life);
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }

        // Score/combo flashes
        if (this.scoreFlashes.length > 0) {
            for (const sf of this.scoreFlashes) {
                ctx.save();
                ctx.globalAlpha = sf.life;
                ctx.font = `bold ${Math.floor(18 * sf.scale)}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillStyle = this.gameStyle === 1 ? '#ffffff' :
                    (this.gameStyle === 2 ? '#ff88aa' : '#ffff00');
                if (this.gameStyle === 1) {
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = 10;
                }
                ctx.fillText(sf.text, sf.x, sf.y);
                ctx.restore();
            }
        }

        // Subtle grid lines
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let c = 0; c <= this.cols; c++) {
            ctx.moveTo(c * cs, 0);
            ctx.lineTo(c * cs, system.height);
        }
        for (let r = 0; r <= this.rows; r++) {
            ctx.moveTo(0, r * cs);
            ctx.lineTo(system.width, r * cs);
        }
        ctx.stroke();
        ctx.restore();
    }
}
