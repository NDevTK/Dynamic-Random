/**
 * @file ascii_rain_effects.js
 * @description Falling character streams inspired by the Matrix digital rain but with
 * seed-varied character sets, speeds, colors, and behaviors. Each universe gets a
 * unique "language" of falling symbols.
 *
 * Modes:
 * 0 - Matrix Classic: Green/white katakana-style falling columns with bright heads
 * 1 - Binary Waterfall: 0s and 1s in cascading waves with blue electric highlights
 * 2 - Runic Cascade: Norse/mystic rune-like symbols falling with golden trails
 * 3 - Emoji Storm: Tiny emojis/symbols cascading with colorful splash effects
 * 4 - Code Leak: Programming symbols ({};=>()) dripping from top like liquid code
 * 5 - Alien Transmission: Unknown glyphs that morph as they fall, pulsing with signal
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

// Character sets for different modes
const CHAR_SETS = [
    // 0: Matrix/Katakana-inspired
    '\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD\u30BF\u30C1\u30C4\u30C6\u30C8\u30CA\u30CB\u30CC\u30CD\u30CE\u30CF\u30D2\u30D5\u30D8\u30DB\u30DE\u30DF\u30E0\u30E1\u30E2\u30E4\u30E6\u30E8\u30E9\u30EA\u30EB\u30EC\u30ED\u30EF\u30F2\u30F3',
    // 1: Binary
    '01',
    // 2: Runic
    '\u16A0\u16A1\u16A2\u16A3\u16A4\u16A5\u16A6\u16A8\u16A9\u16AA\u16AB\u16AC\u16AD\u16AE\u16AF\u16B0\u16B1\u16B2\u16B3\u16B4\u16B5\u16B6\u16B7\u16B8\u16B9\u16BA\u16BB\u16BC\u16BD\u16BE\u16BF',
    // 3: Assorted symbols
    '\u2605\u2606\u25CF\u25CB\u25A0\u25A1\u25B2\u25B3\u2666\u2665\u2663\u2660\u266A\u266B\u2728\u2734\u2736\u273F\u2740\u2756\u2764\u2B50\u2B55\u2B1B\u2B1C',
    // 4: Code symbols
    '{}[]();=><+-*/&|!?@#$%^~`_\\:.',
    // 5: Alien/geometric
    '\u2580\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588\u2589\u258A\u258B\u258C\u258D\u258E\u258F\u2590\u2591\u2592\u2593\u25A0\u25B0\u25B1\u25B2\u25BC\u25C6\u25C7\u25CA\u25CB\u25CF',
];

export class AsciiRain {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 120;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._mouseSpeed = 0;
        this._pmx = 0;
        this._pmy = 0;

        // Columns of falling characters
        this.columns = [];
        this.fontSize = 14;
        this.colCount = 0;

        // Splash particles from click
        this._splashes = [];
        this._splashPool = [];
        this.maxSplashes = 40;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : this._defaultHue();
        this.intensity = 0.4 + rng() * 0.5;
        this._splashes = [];

        this.fontSize = 10 + Math.floor(rng() * 8);
        const W = window.innerWidth;
        this.colCount = Math.floor(W / this.fontSize);
        this.colCount = Math.min(this.colCount, 120);

        this.columns = [];
        for (let c = 0; c < this.colCount; c++) {
            const speed = 0.5 + rng() * 2;
            const length = 5 + Math.floor(rng() * 20);
            this.columns.push({
                x: c * this.fontSize,
                y: -(rng() * window.innerHeight),
                speed,
                length,
                chars: [],
                changeRate: 0.02 + rng() * 0.08,
                brightness: 0.3 + rng() * 0.4,
                phase: rng() * TAU,
                active: true,
            });

            // Pre-fill character buffer
            const chars = CHAR_SETS[this.mode];
            for (let i = 0; i < length; i++) {
                const charIdx = Math.floor(rng() * chars.length);
                this.columns[c].chars.push(chars[charIdx]);
            }
        }
    }

    _defaultHue() {
        if (this.mode === 0) return 120; // Green
        if (this.mode === 1) return 210; // Blue
        if (this.mode === 2) return 42;  // Gold
        if (this.mode === 3) return 0;   // Multicolor (base red)
        if (this.mode === 4) return 160; // Teal
        return 280; // Purple
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Click creates splash burst
        if (isClicking && !this._wasClicking) {
            this._createSplash(mx, my);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        const H = window.innerHeight;
        const chars = CHAR_SETS[this.mode];

        for (const col of this.columns) {
            // Speed varies near cursor - proximity measured to full column position
            const dx = mx - col.x;
            const dy = my - col.y;
            const proximity = Math.abs(dx);
            // Click boosts nearby columns much more than distant ones
            const clickBoost = isClicking ? Math.max(0, 1 - proximity / 200) * 3 : 0;
            const speedBoost = proximity < 100 ? (1 - proximity / 100) * 2 : 0;
            const currentSpeed = col.speed + speedBoost + clickBoost;

            col.y += currentSpeed;

            // Track how far into viewport the column is (for fade-in)
            if (col._fadeIn === undefined) col._fadeIn = 0;
            col._fadeIn = Math.min(1, col._fadeIn + 0.03);

            // Reset when fully below screen (with smooth fade reset)
            if (col.y - col.length * this.fontSize > H) {
                col.y = -(col.length * this.fontSize + _prand(this.tick * 7 + col.x) * H * 0.5);
                col._fadeIn = 0; // restart fade-in
            }

            // Randomly mutate characters (capped at one mutation per tick per column)
            const mutChance = Math.min(0.06, col.changeRate);
            if (_prand(this.tick * 11 + col.x * 3) < mutChance) {
                const idx = Math.floor(_prand(this.tick * 13 + col.x * 7) * col.chars.length);
                col.chars[idx] = chars[Math.floor(_prand(this.tick * 17 + col.x * 11 + idx) * chars.length)];
            }

            // Mouse proximity makes characters change faster (only one char per tick)
            if (proximity < 60 && this.tick % 2 === 0) {
                const idx = Math.floor(_prand(this.tick * 19 + col.x) * col.chars.length);
                col.chars[idx] = chars[Math.floor(_prand(this.tick * 23 + col.x + idx * 3) * chars.length)];
            }
        }

        // Update splashes with stronger gravity
        for (let i = this._splashes.length - 1; i >= 0; i--) {
            const s = this._splashes[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.25; // stronger downward pull
            s.vx *= 0.96;
            s.vy *= 0.99;
            s.life--;
            if (s.life <= 0) {
                this._splashPool.push(s);
                this._splashes[i] = this._splashes[this._splashes.length - 1];
                this._splashes.pop();
            }
        }
    }

    _createSplash(x, y) {
        const chars = CHAR_SETS[this.mode];
        const count = 8 + Math.floor(_prand(this.tick * 41) * 12);

        for (let i = 0; i < count && this._splashes.length < this.maxSplashes; i++) {
            const seed = this.tick * 31 + i * 97;
            const splash = this._splashPool.length > 0 ? this._splashPool.pop() : {};
            const angle = _prand(seed) * TAU;
            const speed = 2 + _prand(seed + 1) * 6;
            splash.x = x;
            splash.y = y;
            splash.vx = Math.cos(angle) * speed;
            splash.vy = Math.sin(angle) * speed - 2;
            splash.life = 20 + _prand(seed + 2) * 25;
            splash.maxLife = splash.life;
            splash.char = chars[Math.floor(_prand(seed + 3) * chars.length)];
            splash.hue = (this.hue + _prand(seed + 4) * 40 - 20 + 360) % 360;
            splash.size = this.fontSize * (0.5 + _prand(seed + 5) * 1);
            this._splashes.push(splash);
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const fs = this.fontSize;
        // Cache font string (avoid per-character string construction)
        if (!this._cachedFont || this._cachedFontSize !== fs) {
            this._cachedFont = `${fs}px monospace`;
            this._cachedFontSize = fs;
        }
        ctx.font = this._cachedFont;

        for (const col of this.columns) {
            const charCount = col.chars.length;
            // Apply column fade-in multiplier
            const fadeIn = col._fadeIn !== undefined ? col._fadeIn : 1;

            for (let i = 0; i < charCount; i++) {
                const cy = col.y + i * fs;
                if (cy < -fs || cy > window.innerHeight + fs) continue;

                const isHead = i === charCount - 1;
                const tailFade = i / charCount;

                let alpha, h, s, l;

                if (this.mode === 0) {
                    // Matrix green with white heads
                    h = this.hue;
                    s = isHead ? 20 : 80;
                    l = isHead ? 95 : (40 + tailFade * 25);
                    alpha = (isHead ? 0.5 : tailFade * 0.2) * this.intensity;
                } else if (this.mode === 1) {
                    // Binary blue with electric highlights
                    h = this.hue;
                    s = 70;
                    l = isHead ? 85 : (45 + tailFade * 20);
                    const pulse = Math.sin(this.tick * 0.1 + col.phase + i * 0.3);
                    alpha = (isHead ? 0.4 : tailFade * 0.15 + (pulse > 0.8 ? 0.1 : 0)) * this.intensity;
                } else if (this.mode === 2) {
                    // Golden runic
                    h = this.hue;
                    s = isHead ? 90 : 70;
                    l = isHead ? 80 : (50 + tailFade * 15);
                    alpha = (isHead ? 0.45 : tailFade * 0.18) * this.intensity;
                } else if (this.mode === 3) {
                    // Colorful symbols - each character gets unique color from char code
                    const charCode = col.chars[i].codePointAt(0) || 0;
                    h = (charCode * 37 + i * 25 + col.phase * 57.3 + this.tick * 0.5) % 360;
                    s = 75 + (charCode % 20);
                    l = isHead ? 85 : (55 + tailFade * 20);
                    alpha = (isHead ? 0.45 : tailFade * 0.22) * this.intensity;
                } else if (this.mode === 4) {
                    // Code leak - dripping effect
                    h = this.hue;
                    s = isHead ? 90 : 60;
                    l = isHead ? 85 : (40 + tailFade * 30);
                    alpha = (isHead ? 0.35 : tailFade * 0.15) * this.intensity;
                } else {
                    // Alien transmission - pulsing signal
                    const signal = Math.sin(this.tick * 0.05 + i * 0.5 + col.phase);
                    h = (this.hue + signal * 30 + 360) % 360;
                    s = 70 + signal * 20;
                    l = 50 + signal * 20;
                    alpha = (isHead ? 0.4 : tailFade * 0.15 + (signal > 0.5 ? 0.1 : 0)) * this.intensity;
                }

                // Apply column fade-in
                alpha *= fadeIn;
                if (alpha < 0.01) continue;

                ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
                ctx.fillText(col.chars[i], col.x + fs / 2, cy);
            }
        }

        // Draw splash characters
        for (const s of this._splashes) {
            const ratio = s.life / s.maxLife;
            const alpha = ratio * 0.5 * this.intensity;
            ctx.font = `${s.size}px monospace`;
            ctx.fillStyle = `hsla(${s.hue}, 80%, 75%, ${alpha})`;
            ctx.fillText(s.char, s.x, s.y);
        }

        ctx.restore();
    }
}
