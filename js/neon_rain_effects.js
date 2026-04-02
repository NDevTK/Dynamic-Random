/**
 * @file neon_rain_effects.js
 * @description Matrix/cyberpunk-style character rain with seed-randomized scripts,
 * colors, speeds, and interaction modes. Characters scatter from cursor,
 * change color on click, and form words from speech input.
 *
 * Character sets: Latin, Katakana, Greek, Runic, Braille, Binary, Emoji, Math symbols.
 * Each seed picks 1-3 character sets for a unique look.
 */

const CHAR_SETS = {
    katakana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    greek: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω',
    runic: 'ᚠᚡᚢᚣᚤᚥᚦᚧᚨᚩᚪᚫᚬᚭᚮᚯᚰᚱᚲᚳᚴᚵᚶᚷᚸᚹᚺᚻᚼᚽᚾᚿᛀᛁᛂᛃᛄᛅᛆᛇ',
    braille: '⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷',
    binary: '01',
    math: '∀∂∃∅∇∈∉∋∏∑−√∝∞∠∧∨∩∪∫≈≠≡≤≥⊂⊃⊆⊇⊕⊗',
    alchemy: '🜁🜂🜃🜄🜅🜆🜇🜈🜉🜊🜋🜌🜍🜎🜏🜐🜑🜒🜓🜔🜕🜖🜗🜘🜙🜚🜛🜜🜝🜞🜟',
    blocks: '░▒▓█▄▀▐▌■□▪▫▬▭▮▯',
};

const CHAR_SET_KEYS = Object.keys(CHAR_SETS);

export class NeonRain {
    constructor() {
        this._columns = [];
        this._charSets = [];
        this._chars = '';
        this._fontSize = 14;
        this._baseHue = 120;
        this._secondaryHue = 280;
        this._speed = 1;
        this._density = 1;
        this._glowAmount = 0;
        this._interactionMode = 0; // 0=scatter, 1=attract, 2=freeze, 3=accelerate
        this._rainDirection = 0;   // 0=down, 1=up, 2=left, 3=right, 4=radial
        this._colorShift = false;
        this._tick = 0;
        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._clickFlashTimer = 0;

        // Offscreen canvas for persistent trails
        this._canvas = null;
        this._ctx = null;
    }

    configure(rng, hues) {
        this._tick = 0;
        this._clickFlashTimer = 0;

        // Pick 1-3 character sets
        const setCount = 1 + Math.floor(rng() * 3);
        this._charSets = [];
        const available = [...CHAR_SET_KEYS];
        for (let i = 0; i < setCount && available.length > 0; i++) {
            const idx = Math.floor(rng() * available.length);
            this._charSets.push(available[idx]);
            available.splice(idx, 1);
        }
        this._chars = this._charSets.map(k => CHAR_SETS[k]).join('');

        this._fontSize = 10 + Math.floor(rng() * 12);
        this._baseHue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._secondaryHue = hues.length > 1 ? hues[1].h : (this._baseHue + 120 + Math.floor(rng() * 120)) % 360;
        this._speed = 0.5 + rng() * 2;
        this._density = 0.6 + rng() * 0.8;
        this._glowAmount = rng() > 0.5 ? 4 + rng() * 12 : 0;
        this._interactionMode = Math.floor(rng() * 4);
        this._rainDirection = Math.floor(rng() * 5);
        this._colorShift = rng() > 0.4;

        // Initialize columns
        const w = window.innerWidth;
        const h = window.innerHeight;
        this._initColumns(w, h, rng);

        // Offscreen canvas
        if (!this._canvas) {
            this._canvas = document.createElement('canvas');
            this._ctx = this._canvas.getContext('2d', { alpha: true });
        }
        this._canvas.width = w;
        this._canvas.height = h;
        this._ctx.clearRect(0, 0, w, h);
    }

    _initColumns(w, h, rng) {
        this._columns = [];
        const isVertical = this._rainDirection <= 1;
        const span = isVertical ? w : h;
        const depth = isVertical ? h : w;
        const colCount = Math.floor((span / this._fontSize) * this._density);

        for (let i = 0; i < colCount; i++) {
            const pos = (i / colCount) * span + (rng() - 0.5) * this._fontSize;
            this._columns.push({
                pos,
                y: rng() * depth * 2 - depth,
                speed: this._speed * (0.5 + rng() * 1.0),
                length: 5 + Math.floor(rng() * 25),
                chars: this._generateColumnChars(rng, 30),
                charIdx: 0,
                hueOffset: rng() * 60 - 30,
                brightness: 0.5 + rng() * 0.5,
                interactionOffset: 0,
            });
        }
    }

    _generateColumnChars(rng, count) {
        const chars = [];
        for (let i = 0; i < count; i++) {
            chars.push(this._chars[Math.floor(rng() * this._chars.length)]);
        }
        return chars;
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._mx = mx;
        this._my = my;

        if (isClicking && !this._isClicking) {
            this._clickFlashTimer = 15;
        }
        this._isClicking = isClicking;
        if (this._clickFlashTimer > 0) this._clickFlashTimer--;

        if (!this._canvas) return;
        if (this._canvas.width !== window.innerWidth || this._canvas.height !== window.innerHeight) {
            this._canvas.width = window.innerWidth;
            this._canvas.height = window.innerHeight;
        }

        const w = this._canvas.width;
        const h = this._canvas.height;
        const isVertical = this._rainDirection <= 1;
        const goesForward = this._rainDirection === 0 || this._rainDirection === 3;
        const depth = isVertical ? h : w;
        const interactionRadius = 150;

        for (const col of this._columns) {
            // Interaction: modify column based on cursor proximity
            const colScreenX = isVertical ? col.pos : col.y;
            const colScreenY = isVertical ? col.y : col.pos;
            const dx = colScreenX - mx;
            const dy = colScreenY - my;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < interactionRadius) {
                const force = (1 - dist / interactionRadius) * 3;
                switch (this._interactionMode) {
                    case 0: // scatter
                        col.interactionOffset = (isVertical ? dy : dx) > 0 ? force * 5 : -force * 5;
                        break;
                    case 1: // attract
                        col.interactionOffset = (isVertical ? -dy : -dx) * force * 0.05;
                        break;
                    case 2: // freeze
                        col.speed *= 0.95;
                        break;
                    case 3: // accelerate
                        col.speed = this._speed * (0.5 + force * 2);
                        break;
                }
            } else {
                col.interactionOffset *= 0.9;
                if (this._interactionMode === 2) {
                    col.speed += (this._speed * col.brightness - col.speed) * 0.05;
                }
            }

            // Advance position
            const dir = (goesForward || this._rainDirection === 4) ? 1 : -1;
            col.y += col.speed * dir + col.interactionOffset;

            // Radial mode: move outward from center
            if (this._rainDirection === 4) {
                const cx = w / 2;
                const cy = h / 2;
                const angle = Math.atan2(col.pos - cy, col.y - cx);
                col.y += Math.cos(angle) * col.speed;
                col.pos += Math.sin(angle) * col.speed * 0.3;
            }

            // Cycle character periodically
            if (this._tick % 4 === 0) {
                col.charIdx = (col.charIdx + 1) % col.chars.length;
            }

            // Wrap around
            if (dir > 0 && col.y > depth + this._fontSize * col.length) {
                col.y = -this._fontSize * col.length;
            } else if (dir < 0 && col.y < -this._fontSize * col.length) {
                col.y = depth + this._fontSize * col.length;
            }
        }
    }

    draw(ctx, system) {
        if (!this._canvas || this._columns.length === 0) return;
        const oc = this._ctx;
        const w = this._canvas.width;
        const h = this._canvas.height;

        // Fade previous frame
        oc.save();
        oc.globalCompositeOperation = 'destination-out';
        oc.fillStyle = 'rgba(0, 0, 0, 0.08)';
        oc.fillRect(0, 0, w, h);
        oc.restore();

        oc.save();
        oc.font = `${this._fontSize}px monospace`;
        oc.textAlign = 'center';

        if (this._glowAmount > 0) {
            oc.shadowBlur = this._glowAmount;
        }

        const isVertical = this._rainDirection <= 1;
        const flashActive = this._clickFlashTimer > 0;
        const flashHue = this._secondaryHue;

        for (const col of this._columns) {
            for (let i = 0; i < col.length; i++) {
                const charProgress = i / col.length;
                let alpha = (1 - charProgress) * col.brightness * 0.6;
                if (i === 0) alpha = col.brightness * 0.9; // head is brightest

                let hue = this._baseHue + col.hueOffset;
                if (this._colorShift) {
                    hue = (hue + this._tick * 0.3 + i * 3) % 360;
                }
                if (flashActive && i === 0) {
                    hue = flashHue;
                    alpha = 1;
                }

                const lightness = i === 0 ? 85 : 50 + charProgress * 20;
                const sat = i === 0 ? 100 : 70;

                if (this._glowAmount > 0 && i === 0) {
                    oc.shadowColor = `hsl(${hue}, ${sat}%, ${lightness}%)`;
                }

                oc.fillStyle = `hsla(${hue}, ${sat}%, ${lightness}%, ${alpha})`;

                const charIndex = (col.charIdx + i) % col.chars.length;
                const char = col.chars[charIndex];

                let x, y;
                if (isVertical) {
                    x = col.pos;
                    y = col.y - i * this._fontSize;
                } else {
                    x = col.y - i * this._fontSize;
                    y = col.pos;
                }

                if (x >= -this._fontSize && x <= w + this._fontSize &&
                    y >= -this._fontSize && y <= h + this._fontSize) {
                    oc.fillText(char, x, y);
                }
            }

            // Reset shadow after head character
            if (this._glowAmount > 0) {
                oc.shadowColor = 'transparent';
            }
        }

        oc.restore();

        // Composite onto main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55;
        ctx.drawImage(this._canvas, 0, 0);
        ctx.restore();
    }
}
