/**
 * @file glitch_memory_effects.js
 * @description The canvas "remembers" cursor paths and replays them as corrupted
 * digital afterimages. Recorded paths play back with VHS-style tracking errors,
 * data corruption artifacts, and temporal displacement effects. Each seed produces
 * different corruption styles and replay behaviors.
 *
 * Modes:
 * 0 - VHS Rewind: paths replay backwards with tracking lines and color bleed
 * 1 - Buffer Overflow: paths stack and overlap creating dense interference patterns
 * 2 - Quantum Echo: paths replay at slightly different positions each time (uncertainty)
 * 3 - Time Splice: random segments of different recorded paths merge together
 * 4 - Corruption Cascade: paths gradually decay with increasing visual corruption
 * 5 - Ghost Protocol: paths replay as barely-visible phantoms that solidify on click
 */

const TAU = Math.PI * 2;

class MemoryPath {
    constructor() {
        this.points = [];
        this.maxPoints = 100;
        this.playhead = 0;
        this.playSpeed = 1;
        this.playDirection = 1;
        this.corruption = 0;
        this.hue = 0;
        this.alpha = 0.3;
        this.offsetX = 0;
        this.offsetY = 0;
        this.glitchPhase = 0;
        this.active = false;
        this.life = 0;
        this.maxLife = 300;
        this.solidified = false;
    }

    reset() {
        this.points = [];
        this.playhead = 0;
        this.corruption = 0;
        this.alpha = 0.3;
        this.offsetX = 0;
        this.offsetY = 0;
        this.active = false;
        this.life = 0;
        this.solidified = false;
    }
}

export class GlitchMemory {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 180;
        this.saturation = 70;
        this._rng = Math.random;

        // Recording
        this._recording = true;
        this._currentPath = [];
        this._recordInterval = 3; // Record every N frames
        this._maxPathLength = 120;

        // Stored memories
        this.memories = [];
        this.memoryPool = [];
        this.maxMemories = 8;
        this._recordTimer = 0;
        this._replayTimer = 0;
        this._replayInterval = 90; // Frames between spawning replays

        // Glitch artifacts
        this._scanlineOffset = 0;
        this._trackingError = 0;
        this._colorBleed = 0;

        // Mouse tracking
        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._mouseSpeed = 0;
        this._prevMX = 0;
        this._prevMY = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this._rng = rng;

        for (const m of this.memories) this.memoryPool.push(m);
        this.memories = [];
        this._currentPath = [];

        this._replayInterval = 60 + Math.floor(rng() * 120);
        this._recordInterval = 2 + Math.floor(rng() * 3);
        this._maxPathLength = 80 + Math.floor(rng() * 80);

        // Mode-specific config
        switch (this.mode) {
            case 0: // VHS
                this._trackingError = 0.3 + rng() * 0.7;
                this._colorBleed = 2 + rng() * 6;
                break;
            case 1: // Buffer overflow
                this._replayInterval = 30 + Math.floor(rng() * 40);
                this.maxMemories = 12;
                break;
            case 2: // Quantum echo
                this._replayInterval = 50 + Math.floor(rng() * 60);
                break;
            case 4: // Corruption cascade
                this._replayInterval = 80 + Math.floor(rng() * 80);
                break;
            case 5: // Ghost protocol
                this._replayInterval = 40 + Math.floor(rng() * 60);
                break;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;

        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = mx;
        this._prevMY = my;

        // Click events
        if (isClicking && !this._wasClicking) {
            if (this.mode === 5) {
                // Solidify nearby ghosts
                for (const m of this.memories) {
                    if (!m.active) continue;
                    const pi = Math.floor(m.playhead);
                    if (pi >= 0 && pi < m.points.length) {
                        const p = m.points[pi];
                        const ddx = mx - (p.x + m.offsetX);
                        const ddy = my - (p.y + m.offsetY);
                        if (ddx * ddx + ddy * ddy < 10000) {
                            m.solidified = true;
                            m.alpha = 0.6;
                        }
                    }
                }
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Record cursor path when moving
        this._recordTimer++;
        if (this._recordTimer >= this._recordInterval && this._mouseSpeed > 1) {
            this._recordTimer = 0;
            this._currentPath.push({ x: mx, y: my, speed: this._mouseSpeed });
            if (this._currentPath.length > this._maxPathLength) {
                this._currentPath.shift();
            }
        }

        // Spawn replay memories
        this._replayTimer++;
        if (this._replayTimer >= this._replayInterval && this._currentPath.length > 10) {
            this._replayTimer = 0;
            this._spawnMemory();
        }

        // Update active memories
        for (let i = this.memories.length - 1; i >= 0; i--) {
            const m = this.memories[i];
            if (!m.active) continue;

            m.life--;
            m.playhead += m.playSpeed * m.playDirection;

            // Mode-specific updates
            switch (this.mode) {
                case 0: // VHS - tracking errors
                    m.glitchPhase += 0.1;
                    if (Math.sin(m.glitchPhase) > 0.9) {
                        m.offsetX = (this._rng() - 0.5) * 20 * this._trackingError;
                    }
                    break;
                case 2: // Quantum echo - position uncertainty grows
                    m.offsetX += (this._rng() - 0.5) * 2;
                    m.offsetY += (this._rng() - 0.5) * 2;
                    break;
                case 3: // Time splice - jump to random positions
                    if (this.tick % 15 === 0 && this._rng() > 0.7) {
                        m.playhead = Math.floor(this._rng() * m.points.length);
                    }
                    break;
                case 4: // Corruption cascade
                    m.corruption += 0.002;
                    break;
            }

            // Loop or die
            if (m.playhead >= m.points.length || m.playhead < 0) {
                if (this.mode === 0) {
                    m.playDirection *= -1;
                    m.playhead = Math.max(0, Math.min(m.points.length - 1, m.playhead));
                } else {
                    m.playhead = 0;
                }
            }

            // Fade out
            if (m.life < 60 && !m.solidified) {
                m.alpha = Math.max(0, m.alpha - 0.005);
            }

            if (m.life <= 0 || m.alpha <= 0) {
                m.active = false;
                this.memoryPool.push(m);
                this.memories[i] = this.memories[this.memories.length - 1];
                this.memories.pop();
            }
        }
    }

    _spawnMemory() {
        if (this.memories.length >= this.maxMemories) return;

        const m = this.memoryPool.length > 0 ? this.memoryPool.pop() : new MemoryPath();
        m.reset();
        m.points = this._currentPath.slice(); // Clone current path
        m.active = true;
        m.life = 200 + Math.floor(this._rng() * 200);
        m.maxLife = m.life;
        m.hue = (this.hue + (this._rng() - 0.5) * 60 + 360) % 360;
        m.playSpeed = 0.5 + this._rng() * 1.5;
        m.glitchPhase = this._rng() * TAU;

        switch (this.mode) {
            case 0: // VHS
                m.playDirection = -1;
                m.playhead = m.points.length - 1;
                m.alpha = 0.25;
                break;
            case 1: // Buffer overflow
                m.offsetX = (this._rng() - 0.5) * 30;
                m.offsetY = (this._rng() - 0.5) * 30;
                m.alpha = 0.15;
                break;
            case 2: // Quantum echo
                m.alpha = 0.2;
                break;
            case 3: // Time splice
                m.playSpeed = 1 + this._rng() * 2;
                m.alpha = 0.25;
                break;
            case 4: // Corruption
                m.alpha = 0.3;
                m.corruption = this._rng() * 0.3;
                break;
            case 5: // Ghost protocol
                m.alpha = 0.05 + this._rng() * 0.08;
                break;
        }

        this.memories.push(m);
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const m of this.memories) {
            if (!m.active || m.points.length < 2) continue;

            const pi = Math.floor(m.playhead);
            const ox = m.offsetX;
            const oy = m.offsetY;

            // VHS scanline effect
            if (this.mode === 0) {
                const scanY = (this.tick * 2 + m.glitchPhase * 100) % system.height;
                ctx.fillStyle = `hsla(${m.hue}, 50%, 50%, 0.02)`;
                ctx.fillRect(ox, scanY, system.width, 2);
            }

            // Draw the replayed path
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Determine visible range
            const trailLen = Math.min(30, m.points.length);
            const start = Math.max(0, pi - trailLen);
            const end = Math.min(m.points.length - 1, pi);

            if (start >= end) continue;

            // Corruption: skip/repeat segments
            if (this.mode === 4 && m.corruption > 0.3) {
                // Draw corrupted blocks
                for (let i = start; i < end; i += 2) {
                    const p = m.points[i];
                    if (!p) continue;
                    const corrupt = m.corruption * 20;
                    const bx = p.x + ox + (this._rng() > 0.8 ? (this._rng() - 0.5) * corrupt * 3 : 0);
                    const by = p.y + oy;
                    const bw = 5 + this._rng() * corrupt;
                    const bh = 2 + this._rng() * 4;
                    ctx.fillStyle = `hsla(${m.hue + this._rng() * 60}, ${this.saturation}%, 60%, ${m.alpha * 0.5})`;
                    ctx.fillRect(bx, by, bw, bh);
                }
            }

            // Main trail rendering
            ctx.beginPath();
            let px = m.points[start].x + ox;
            let py = m.points[start].y + oy;
            ctx.moveTo(px, py);

            for (let i = start + 1; i <= end; i++) {
                const p = m.points[i];
                let x = p.x + ox;
                let y = p.y + oy;

                // Mode-specific distortion
                if (this.mode === 0 && Math.sin(m.glitchPhase + i * 0.3) > 0.85) {
                    x += this._colorBleed * 3;
                }
                if (this.mode === 4) {
                    x += Math.sin(i * 0.5 + this.tick * 0.1) * m.corruption * 10;
                }

                ctx.lineTo(x, y);
            }

            const fadeProgress = (end - start) > 0 ? 1 : 0;
            ctx.strokeStyle = `hsla(${m.hue}, ${this.saturation}%, 60%, ${m.alpha * fadeProgress})`;
            ctx.stroke();

            // Color bleed for VHS mode (offset red/blue channels)
            if (this.mode === 0 && this._colorBleed > 1) {
                ctx.beginPath();
                ctx.moveTo(m.points[start].x + ox + this._colorBleed, m.points[start].y + oy);
                for (let i = start + 1; i <= end; i++) {
                    ctx.lineTo(m.points[i].x + ox + this._colorBleed, m.points[i].y + oy);
                }
                ctx.strokeStyle = `hsla(0, 80%, 60%, ${m.alpha * 0.3})`;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(m.points[start].x + ox - this._colorBleed, m.points[start].y + oy);
                for (let i = start + 1; i <= end; i++) {
                    ctx.lineTo(m.points[i].x + ox - this._colorBleed, m.points[i].y + oy);
                }
                ctx.strokeStyle = `hsla(240, 80%, 60%, ${m.alpha * 0.3})`;
                ctx.stroke();
            }

            // Playhead indicator
            if (pi >= 0 && pi < m.points.length) {
                const hp = m.points[pi];
                const hx = hp.x + ox;
                const hy = hp.y + oy;

                // Glitch cursor
                const cursorAlpha = m.alpha * 0.8;
                ctx.fillStyle = `hsla(${m.hue}, 90%, 80%, ${cursorAlpha})`;
                if (this.mode === 4 && m.corruption > 0.5) {
                    // Corrupted cursor - scattered pixels
                    for (let p = 0; p < 5; p++) {
                        const px2 = hx + (this._rng() - 0.5) * m.corruption * 40;
                        const py2 = hy + (this._rng() - 0.5) * m.corruption * 40;
                        ctx.fillRect(px2, py2, 3, 3);
                    }
                } else {
                    ctx.beginPath();
                    ctx.arc(hx, hy, 4, 0, TAU);
                    ctx.fill();
                }

                // Ghost mode: solidified aura
                if (m.solidified) {
                    const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 30);
                    grad.addColorStop(0, `hsla(${m.hue}, 90%, 80%, 0.15)`);
                    grad.addColorStop(1, `hsla(${m.hue}, 90%, 80%, 0)`);
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(hx, hy, 30, 0, TAU);
                    ctx.fill();
                }
            }
        }

        // Buffer overflow mode: interference pattern overlay
        if (this.mode === 1 && this.memories.length > 3) {
            const intAlpha = 0.02;
            ctx.fillStyle = `hsla(${this.hue}, 30%, 50%, ${intAlpha})`;
            for (let y = 0; y < system.height; y += 4) {
                if (Math.sin(y * 0.1 + this.tick * 0.05) > 0.5) {
                    ctx.fillRect(0, y, system.width, 1);
                }
            }
        }

        ctx.restore();
    }
}
