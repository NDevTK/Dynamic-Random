/**
 * @file pixel_sort_glitch_effects.js
 * @description Generates glitch-art style visual strips that "sort" portions of the
 * background, creating dramatic streaks and displacement effects. Uses seed-driven
 * parameters to produce wildly different visual personalities.
 *
 * Instead of actual pixel reading (expensive), this simulates the aesthetic by drawing
 * directional gradient strips, displacement blocks, and scan-line artifacts.
 *
 * Modes:
 * 0 - Vertical Sort: Downward-streaming color strips like melting paint
 * 1 - Horizontal Tear: Horizontal displacement slices that jitter and slide
 * 2 - Diagonal Cascade: Angled strips that cascade across the screen in waves
 * 3 - Block Shuffle: Rectangular blocks that swap positions and glitch-teleport
 * 4 - Radial Shatter: Sort strips radiate outward from cursor like broken glass
 * 5 - Data Corrupt: Random byte-pattern rectangles with color channel separation
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class PixelSortGlitch {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Active glitch strips
        this.strips = [];
        this.maxStrips = 25;

        // Block glitch pieces
        this.blocks = [];
        this.maxBlocks = 15;

        // Trigger thresholds
        this._spawnTimer = 0;
        this._spawnInterval = 8;
        this._clickBurst = false;

        // Color channels for data corrupt mode
        this._channels = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 180;
        this.intensity = 0.4 + rng() * 0.5;
        this.strips = [];
        this.blocks = [];
        this._spawnInterval = 5 + Math.floor(rng() * 15);
        this._spawnTimer = 0;

        this._channels = [
            { h: this.hue, s: 80, l: 50 },
            { h: (this.hue + 120) % 360, s: 70, l: 55 },
            { h: (this.hue + 240) % 360, s: 75, l: 45 },
        ];

        // Pre-populate some strips for immediate visual
        const W = window.innerWidth;
        const H = window.innerHeight;
        const initCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < initCount; i++) {
            this._spawnStrip(rng() * W, rng() * H, i * 31);
        }
    }

    _spawnStrip(x, y, seed) {
        if (this.strips.length >= this.maxStrips) return;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const pr = (s) => _prand(seed + s);

        const strip = {};
        strip.life = 20 + pr(1) * 40;
        strip.maxLife = strip.life;

        if (this.mode === 0) {
            // Vertical strips
            strip.x = x;
            strip.y = y;
            strip.w = 2 + pr(2) * 15;
            strip.h = 30 + pr(3) * 200;
            strip.vy = 2 + pr(4) * 6;
            strip.vx = 0;
        } else if (this.mode === 1) {
            // Horizontal tears
            strip.x = 0;
            strip.y = y;
            strip.w = W * (0.3 + pr(2) * 0.7);
            strip.h = 1 + pr(3) * 6;
            strip.vx = (pr(4) - 0.5) * 20;
            strip.vy = 0;
        } else if (this.mode === 2) {
            // Diagonal cascade
            strip.x = x;
            strip.y = -50;
            strip.w = 3 + pr(2) * 10;
            strip.h = 40 + pr(3) * 150;
            strip.angle = 0.3 + pr(5) * 0.7;
            strip.speed = 3 + pr(4) * 5;
            strip.vx = Math.cos(strip.angle) * strip.speed;
            strip.vy = Math.sin(strip.angle) * strip.speed;
        } else if (this.mode === 3) {
            // Block shuffle
            const blockW = 30 + pr(2) * 80;
            const blockH = 20 + pr(3) * 60;
            strip.x = x - blockW / 2;
            strip.y = y - blockH / 2;
            strip.w = blockW;
            strip.h = blockH;
            strip.targetX = pr(4) * W;
            strip.targetY = pr(5) * H;
            strip.vx = (strip.targetX - strip.x) * 0.05;
            strip.vy = (strip.targetY - strip.y) * 0.05;
        } else if (this.mode === 4) {
            // Radial from cursor
            const angle = pr(2) * TAU;
            const len = 40 + pr(3) * 200;
            strip.x = this._mx;
            strip.y = this._my;
            strip.angle = angle;
            strip.len = len;
            strip.w = 1 + pr(4) * 4;
            strip.speed = 4 + pr(5) * 8;
            strip.vx = Math.cos(angle) * strip.speed;
            strip.vy = Math.sin(angle) * strip.speed;
            strip.h = len;
        } else {
            // Data corrupt blocks
            strip.x = x - 20;
            strip.y = y - 10;
            strip.w = 10 + pr(2) * 60;
            strip.h = 5 + pr(3) * 30;
            strip.channel = Math.floor(pr(4) * 3);
            strip.vx = (pr(5) - 0.5) * 4;
            strip.vy = (pr(6) - 0.5) * 2;
        }

        strip.hue = (this.hue + pr(7) * 60 - 30 + 360) % 360;
        strip.seed = seed;
        this.strips.push(strip);
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Click burst
        if (isClicking && !this._wasClicking) {
            const count = 5 + Math.floor(_prand(this.tick * 37) * 8);
            for (let i = 0; i < count; i++) {
                this._spawnStrip(mx + (_prand(this.tick + i * 11) - 0.5) * 100,
                    my + (_prand(this.tick + i * 17) - 0.5) * 100,
                    this.tick * 7 + i * 41);
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Auto-spawn based on mouse movement
        this._spawnTimer++;
        if (this._spawnTimer >= this._spawnInterval || this._mouseSpeed > 10) {
            this._spawnTimer = 0;
            if (this._mouseSpeed > 3) {
                this._spawnStrip(mx, my, this.tick * 13);
            } else {
                const W = window.innerWidth;
                const H = window.innerHeight;
                this._spawnStrip(_prand(this.tick * 23) * W, _prand(this.tick * 29) * H, this.tick * 19);
            }
        }

        // Update strips
        for (let i = this.strips.length - 1; i >= 0; i--) {
            const s = this.strips[i];
            s.x += s.vx || 0;
            s.y += s.vy || 0;
            s.life--;

            // Mode 3: decelerate toward target
            if (this.mode === 3) {
                s.vx *= 0.95;
                s.vy *= 0.95;
            }

            if (s.life <= 0) {
                this.strips[i] = this.strips[this.strips.length - 1];
                this.strips.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();

        if (this.mode === 0) this._drawVerticalSort(ctx);
        else if (this.mode === 1) this._drawHorizontalTear(ctx);
        else if (this.mode === 2) this._drawDiagonalCascade(ctx);
        else if (this.mode === 3) this._drawBlockShuffle(ctx);
        else if (this.mode === 4) this._drawRadialShatter(ctx);
        else if (this.mode === 5) this._drawDataCorrupt(ctx);

        ctx.restore();
    }

    _drawVerticalSort(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.strips) {
            const ratio = s.life / s.maxLife;
            const alpha = ratio * 0.2 * this.intensity;

            // Gradient strip going downward
            const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
            grad.addColorStop(0, `hsla(${s.hue}, 70%, 60%, ${alpha})`);
            grad.addColorStop(0.5, `hsla(${(s.hue + 20) % 360}, 80%, 70%, ${alpha * 1.5})`);
            grad.addColorStop(1, `hsla(${s.hue}, 60%, 50%, 0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(s.x, s.y, s.w, s.h);
        }
    }

    _drawHorizontalTear(ctx) {
        for (const s of this.strips) {
            const ratio = s.life / s.maxLife;
            const alpha = ratio * 0.15 * this.intensity;

            // Displacement: draw a colored rectangle with slight offset
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `hsla(${s.hue}, 80%, 55%, ${alpha})`;
            ctx.fillRect(s.x, s.y, s.w, s.h);

            // Scan line accent
            ctx.fillStyle = `hsla(${(s.hue + 180) % 360}, 90%, 85%, ${alpha * 0.5})`;
            ctx.fillRect(s.x, s.y + s.h / 2, s.w, 1);
        }
    }

    _drawDiagonalCascade(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.strips) {
            const ratio = s.life / s.maxLife;
            const alpha = ratio * 0.2 * this.intensity;
            const angle = s.angle || 0.5;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(angle);
            const grad = ctx.createLinearGradient(0, 0, 0, s.h);
            grad.addColorStop(0, `hsla(${s.hue}, 75%, 65%, ${alpha})`);
            grad.addColorStop(1, `hsla(${s.hue}, 60%, 50%, 0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(-s.w / 2, 0, s.w, s.h);
            ctx.restore();
        }
    }

    _drawBlockShuffle(ctx) {
        for (const s of this.strips) {
            const ratio = s.life / s.maxLife;
            const alpha = ratio * 0.12 * this.intensity;

            // Glitchy block outline
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `hsla(${s.hue}, 80%, 65%, ${alpha * 2})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(s.x, s.y, s.w, s.h);

            // Fill with semi-transparent color
            ctx.fillStyle = `hsla(${s.hue}, 60%, 50%, ${alpha * 0.5})`;
            ctx.fillRect(s.x, s.y, s.w, s.h);

            // Horizontal scan artifacts inside block
            const scanCount = Math.floor(s.h / 4);
            for (let j = 0; j < scanCount; j++) {
                const scanY = s.y + j * 4;
                const scanAlpha = _prand(s.seed + j * 7) * alpha * 0.8;
                if (scanAlpha > 0.01) {
                    ctx.fillStyle = `hsla(${(s.hue + j * 5) % 360}, 70%, 70%, ${scanAlpha})`;
                    ctx.fillRect(s.x, scanY, s.w, 2);
                }
            }
        }
    }

    _drawRadialShatter(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.strips) {
            const ratio = s.life / s.maxLife;
            const alpha = ratio * 0.25 * this.intensity;
            const angle = s.angle || 0;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(angle);

            const grad = ctx.createLinearGradient(0, 0, s.len || 100, 0);
            grad.addColorStop(0, `hsla(${s.hue}, 85%, 70%, ${alpha})`);
            grad.addColorStop(0.3, `hsla(${(s.hue + 15) % 360}, 80%, 65%, ${alpha * 0.7})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, -s.w / 2, s.len || 100, s.w);

            ctx.restore();
        }
    }

    _drawDataCorrupt(ctx) {
        for (const s of this.strips) {
            const ratio = s.life / s.maxLife;
            const alpha = ratio * 0.2 * this.intensity;
            const ch = this._channels[s.channel || 0];

            // Color channel separated block
            ctx.globalCompositeOperation = 'lighter';

            // Main channel
            ctx.fillStyle = `hsla(${ch.h}, ${ch.s}%, ${ch.l}%, ${alpha})`;
            ctx.fillRect(s.x, s.y, s.w, s.h);

            // Offset "ghost" of another channel
            const offset = Math.sin(this.tick * 0.3 + s.seed) * 5;
            const ghost = this._channels[(s.channel + 1) % 3];
            ctx.fillStyle = `hsla(${ghost.h}, ${ghost.s}%, ${ghost.l}%, ${alpha * 0.3})`;
            ctx.fillRect(s.x + offset, s.y - 2, s.w, s.h);

            // Binary noise pattern
            const noiseCount = Math.floor(s.w / 3);
            for (let n = 0; n < noiseCount; n++) {
                if (_prand(s.seed + n * 3 + this.tick) > 0.6) {
                    ctx.fillStyle = `hsla(${ch.h}, 90%, 90%, ${alpha * 0.4})`;
                    ctx.fillRect(s.x + n * 3, s.y, 2, s.h);
                }
            }
        }
    }
}
