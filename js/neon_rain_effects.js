/**
 * @file neon_rain_effects.js
 * @description Matrix/cyberpunk-style character rain with seed-randomized scripts,
 * colors, speeds, and interaction modes. Characters scatter from cursor,
 * change color on click, and react to mouse speed.
 *
 * Character sets: Katakana, Greek, Runic, Braille, Binary, Math, Alchemy, Blocks.
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
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._clickFlashTimer = 0;
        this._clickWaveX = 0;
        this._clickWaveY = 0;
        this._clickWaveRadius = 0;

        // Offscreen canvas for persistent trails
        this._canvas = null;
        this._ctx = null;
    }

    configure(rng, hues) {
        this._tick = 0;
        this._clickFlashTimer = 0;
        this._clickWaveRadius = 0;

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
            const baseSpeed = this._speed * (0.5 + rng() * 1.0);
            this._columns.push({
                pos,
                y: rng() * depth * 2 - depth,
                speed: baseSpeed,
                baseSpeed,
                length: 5 + Math.floor(rng() * 25),
                chars: this._generateColumnChars(rng, 30),
                charIdx: 0,
                hueOffset: rng() * 60 - 30,
                brightness: 0.5 + rng() * 0.5,
                interactionOffset: 0,
                proximityBright: 0, // extra brightness from cursor proximity
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

    // Tick-based pseudo-random to avoid Math.random()
    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        if (isClicking && !this._isClicking) {
            this._clickFlashTimer = 15;
            this._clickWaveX = mx;
            this._clickWaveY = my;
            this._clickWaveRadius = 0;
        }
        this._isClicking = isClicking;
        if (this._clickFlashTimer > 0) this._clickFlashTimer--;
        if (this._clickWaveRadius > 0 || this._clickFlashTimer > 0) {
            this._clickWaveRadius += 12;
        }
        if (this._clickWaveRadius > 600) this._clickWaveRadius = 0;

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
        const interactionRadiusSq = 150 * 150; // avoid sqrt for distance check
        const interactionRadius = 150;
        const mouseSpeedFactor = Math.min(3, this._mouseSpeed * 0.05);

        for (const col of this._columns) {
            // Interaction: use squared distance to avoid sqrt
            const colScreenX = isVertical ? col.pos : col.y;
            const colScreenY = isVertical ? col.y : col.pos;
            const dx = colScreenX - mx;
            const dy = colScreenY - my;
            const distSq = dx * dx + dy * dy;

            col.proximityBright *= 0.9; // decay proximity brightness

            if (distSq < interactionRadiusSq) {
                const dist = Math.sqrt(distSq); // only sqrt when within range
                const force = (1 - dist / interactionRadius) * (1 + mouseSpeedFactor);
                col.proximityBright = Math.min(1, force);

                switch (this._interactionMode) {
                    case 0: // scatter
                        col.interactionOffset = (isVertical ? dy : dx) > 0 ? force * 5 : -force * 5;
                        break;
                    case 1: // attract
                        col.interactionOffset = (isVertical ? -dy : -dx) * force * 0.05;
                        break;
                    case 2: // freeze
                        col.speed *= 0.92;
                        break;
                    case 3: // accelerate
                        col.speed = col.baseSpeed * (1 + force * 3);
                        break;
                }
            } else {
                col.interactionOffset *= 0.9;
                if (this._interactionMode === 2 || this._interactionMode === 3) {
                    col.speed += (col.baseSpeed - col.speed) * 0.05;
                }
            }

            // Click wave: columns near the wave ring get a speed boost
            if (this._clickWaveRadius > 0) {
                const wdx = colScreenX - this._clickWaveX;
                const wdy = colScreenY - this._clickWaveY;
                const wDist = Math.sqrt(wdx * wdx + wdy * wdy);
                const ringDist = Math.abs(wDist - this._clickWaveRadius);
                if (ringDist < 50) {
                    const wavePush = (1 - ringDist / 50) * 8;
                    col.interactionOffset += (isVertical ? (wdy > 0 ? wavePush : -wavePush) : (wdx > 0 ? wavePush : -wavePush));
                    col.proximityBright = Math.min(1, col.proximityBright + (1 - ringDist / 50) * 0.5);
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

            // Cycle character - tick-based pseudo-random for non-uniform cycling
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
        oc.globalCompositeOperation = 'destination-out';
        oc.fillStyle = 'rgba(0,0,0,0.08)';
        oc.fillRect(0, 0, w, h);
        oc.globalCompositeOperation = 'source-over';

        oc.font = `${this._fontSize}px monospace`;
        oc.textAlign = 'center';

        const isVertical = this._rainDirection <= 1;
        const flashActive = this._clickFlashTimer > 0;
        const flashHue = this._secondaryHue;
        const hasGlow = this._glowAmount > 0;

        // Draw head characters with glow, body characters without
        for (const col of this._columns) {
            const extraBright = col.proximityBright;

            for (let i = 0; i < col.length; i++) {
                const charProgress = i / col.length;
                let alpha = (1 - charProgress) * col.brightness * 0.6;
                const isHead = i === 0;
                if (isHead) alpha = (col.brightness + extraBright * 0.4) * 0.9;
                else alpha += extraBright * 0.15;

                let hue = this._baseHue + col.hueOffset;
                if (this._colorShift) {
                    hue = (hue + this._tick * 0.3 + i * 3) % 360;
                }
                if (flashActive && isHead) {
                    hue = flashHue;
                    alpha = 1;
                }

                const lightness = isHead ? 85 + extraBright * 10 : 50 + charProgress * 20;
                const sat = isHead ? 100 : 70;

                // Only apply expensive glow on head character
                if (hasGlow && isHead) {
                    oc.shadowBlur = this._glowAmount;
                    oc.shadowColor = `hsl(${hue | 0}, ${sat}%, ${lightness | 0}%)`;
                }

                oc.fillStyle = `hsla(${hue | 0}, ${sat}%, ${lightness | 0}%, ${alpha.toFixed(3)})`;

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

                // Clear glow after head
                if (hasGlow && isHead) {
                    oc.shadowBlur = 0;
                    oc.shadowColor = 'transparent';
                }
            }
        }

        // Composite onto main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55;
        ctx.drawImage(this._canvas, 0, 0);
        ctx.restore();
    }
}
