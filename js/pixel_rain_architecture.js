/**
 * @file pixel_rain_architecture.js
 * @description Matrix-style character rain with seed-driven character sets,
 *   colors, speeds, column density, and special effects.
 *   Mouse interaction creates ripples in the rain. Click causes glitch bursts.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class PixelRainArchitecture extends Architecture {
    constructor() {
        super();
        this.columns = [];
        this.tick = 0;
        this.charSet = '';
        this.fontSize = 14;
        this.palette = null;
        this.fadeAlpha = 0.05;
        this.direction = 'down'; // down, up, left, right
        this.ripples = [];
        this.density = 1;
        this.speedRange = [1, 3];
        this.glitchChance = 0;
        this._rainCanvas = null;
        this._rainCtx = null;
    }

    init(system) {
        const rng = system.rng;
        this.tick = 0;
        this.ripples = [];

        // Seed-driven character sets
        const charSets = [
            'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ', // Katakana
            '01001101010011100010110101',                    // Binary
            '∀∂∃∅∇∈∉∋∏∑−∗√∝∞∠∧∨∩∪∫≈≠≡≤≥⊂⊃⊄⊆⊇', // Math
            'αβγδεζηθικλμνξοπρσςτυφχψω', // Greek
            '☽★☆✦✧⊹⋆✶✸✹✺✻✼❂✡',          // Stars/symbols
            '♠♣♥♦♤♧♡♢⚀⚁⚂⚃⚄⚅',           // Cards/dice
            '░▒▓█▄▀▐▌▆▇▅▃▂',             // Block elements
            '⟁⟐⟑⬡⬢⬣⎔◇◈◆▲△▽▼',           // Geometric
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', // Latin
            '⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟', // Braille
        ];
        this.charSet = charSets[Math.floor(rng() * charSets.length)];

        // Mix in a second character set sometimes
        if (rng() > 0.6) {
            const extra = charSets[Math.floor(rng() * charSets.length)];
            this.charSet += extra;
        }

        this.fontSize = 10 + Math.floor(rng() * 12);
        this.fadeAlpha = 0.03 + rng() * 0.08;
        this.density = 0.5 + rng() * 0.5;
        this.speedRange = [0.5 + rng() * 1.5, 2 + rng() * 3];
        this.glitchChance = 0.001 + rng() * 0.005;

        // Direction
        const dirs = ['down', 'down', 'down', 'up', 'left', 'right']; // bias toward down
        this.direction = dirs[Math.floor(rng() * dirs.length)];

        // Color palette
        const baseHue = system.hue;
        const style = Math.floor(rng() * 4);
        if (style === 0) {
            // Classic green matrix
            this.palette = { h: 120, s: 100, l: 50, headL: 90 };
        } else if (style === 1) {
            // Hue-matched
            this.palette = { h: baseHue, s: 80 + rng() * 20, l: 45 + rng() * 15, headL: 85 + rng() * 15 };
        } else if (style === 2) {
            // Cyan/blue cyber
            this.palette = { h: 180 + rng() * 40, s: 90, l: 50, headL: 90 };
        } else {
            // Hot (red/orange)
            this.palette = { h: rng() * 30, s: 100, l: 50, headL: 95 };
        }

        // Rain canvas for persistence
        this._rainCanvas = document.createElement('canvas');
        this._rainCanvas.width = system.width;
        this._rainCanvas.height = system.height;
        this._rainCtx = this._rainCanvas.getContext('2d');
        this._rainCtx.fillStyle = '#000';
        this._rainCtx.fillRect(0, 0, system.width, system.height);

        // Initialize columns
        this._initColumns(system);
    }

    _initColumns(system) {
        const rng = system.rng;
        this.columns = [];

        const isHorizontal = this.direction === 'left' || this.direction === 'right';
        const span = isHorizontal ? system.height : system.width;
        const depth = isHorizontal ? system.width : system.height;
        const colCount = Math.floor(span / this.fontSize);

        for (let i = 0; i < colCount; i++) {
            if (rng() > this.density) continue; // skip some columns based on density

            const speed = this.speedRange[0] + rng() * (this.speedRange[1] - this.speedRange[0]);
            const length = 5 + Math.floor(rng() * 25);

            this.columns.push({
                index: i,
                pos: Math.floor(rng() * depth / this.fontSize) * this.fontSize,
                speed: speed,
                length: length,
                chars: [],
                changeTimer: 0,
                changeRate: 2 + Math.floor(rng() * 6)
            });

            // Pre-fill characters
            const col = this.columns[this.columns.length - 1];
            for (let j = 0; j < length; j++) {
                col.chars.push(this.charSet[Math.floor(rng() * this.charSet.length)]);
            }
        }
    }

    update(system) {
        this.tick++;
        const rng = system.rng;
        const isHorizontal = this.direction === 'left' || this.direction === 'right';
        const depth = isHorizontal ? system.width : system.height;

        // Update column positions
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i];
            const advance = col.speed * system.speedMultiplier;

            if (this.direction === 'down' || this.direction === 'right') {
                col.pos += advance;
                if (col.pos - col.length * this.fontSize > depth) {
                    col.pos = -col.length * this.fontSize;
                    col.speed = this.speedRange[0] + rng() * (this.speedRange[1] - this.speedRange[0]);
                }
            } else {
                col.pos -= advance;
                if (col.pos + col.length * this.fontSize < 0) {
                    col.pos = depth + col.length * this.fontSize;
                    col.speed = this.speedRange[0] + rng() * (this.speedRange[1] - this.speedRange[0]);
                }
            }

            // Randomly change characters
            col.changeTimer++;
            if (col.changeTimer >= col.changeRate) {
                col.changeTimer = 0;
                const idx = Math.floor(rng() * col.length);
                col.chars[idx] = this.charSet[Math.floor(rng() * this.charSet.length)];
            }
        }

        // Mouse ripple
        if (this.tick % 3 === 0) {
            const speed = Math.abs(mouse.x - (this._lastMX || mouse.x)) + Math.abs(mouse.y - (this._lastMY || mouse.y));
            if (speed > 5) {
                this.ripples.push({ x: mouse.x, y: mouse.y, radius: 0, maxRadius: 100 + speed * 3, life: 1 });
            }
            this._lastMX = mouse.x;
            this._lastMY = mouse.y;
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += 3;
            r.life = 1 - r.radius / r.maxRadius;
            if (r.life <= 0) {
                this.ripples[i] = this.ripples[this.ripples.length - 1];
                this.ripples.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const rctx = this._rainCtx;
        const p = this.palette;
        const fs = this.fontSize;
        const isHorizontal = this.direction === 'left' || this.direction === 'right';

        // Fade old characters on rain canvas
        rctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
        rctx.fillRect(0, 0, system.width, system.height);

        rctx.font = `${fs}px monospace`;
        rctx.textAlign = 'center';

        // Draw characters
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i];

            for (let j = 0; j < col.length; j++) {
                const charIdx = j;
                const brightness = 1 - (j / col.length);
                const isHead = j === 0;

                let x, y;
                if (isHorizontal) {
                    x = col.pos - j * fs * (this.direction === 'right' ? 1 : -1);
                    y = col.index * fs + fs;
                } else {
                    x = col.index * fs + fs / 2;
                    y = col.pos - j * fs * (this.direction === 'down' ? 1 : -1);
                }

                // Check ripple influence
                let rippleBoost = 0;
                for (let r = 0; r < this.ripples.length; r++) {
                    const rp = this.ripples[r];
                    const dx = x - rp.x;
                    const dy = y - rp.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (Math.abs(dist - rp.radius) < 20) {
                        rippleBoost = Math.max(rippleBoost, rp.life * 0.5);
                    }
                }

                const lightness = isHead ? p.headL : p.l * brightness + rippleBoost * 30;
                const alpha = isHead ? 1 : brightness * 0.8 + rippleBoost;

                // Glitch: randomly highlight chars
                const isGlitch = Math.random() < this.glitchChance;

                if (isGlitch) {
                    rctx.fillStyle = `hsla(${p.h + 180}, 100%, 90%, 1)`;
                    rctx.shadowBlur = 10;
                    rctx.shadowColor = `hsl(${p.h + 180}, 100%, 70%)`;
                } else {
                    rctx.fillStyle = `hsla(${p.h}, ${p.s}%, ${lightness}%, ${alpha})`;
                    rctx.shadowBlur = isHead ? 8 : 0;
                    rctx.shadowColor = isHead ? `hsl(${p.h}, ${p.s}%, ${p.headL}%)` : 'transparent';
                }

                rctx.fillText(col.chars[charIdx], x, y);
                rctx.shadowBlur = 0;
            }
        }

        // Draw rain canvas to main
        ctx.drawImage(this._rainCanvas, 0, 0);

        // Draw ripple rings
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.ripples.length; i++) {
            const r = this.ripples[i];
            ctx.strokeStyle = `hsla(${p.h}, ${p.s}%, ${p.headL}%, ${r.life * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
