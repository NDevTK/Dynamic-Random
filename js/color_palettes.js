/**
 * @file color_palettes.js
 * @description Seed-based color palette generation for cursor, trail, and ambient effects.
 * Generates harmonious palettes using color theory rules, each significantly
 * different based on the random seed.
 */

const TAU = Math.PI * 2;

/**
 * Converts HSL values to an rgba string.
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @param {number} a - Alpha (0-1)
 * @returns {string} CSS color string
 */
export function hsla(h, s, l, a = 1) {
    return `hsla(${h % 360}, ${s}%, ${l}%, ${a})`;
}

/**
 * Generates a color palette based on a hue and palette strategy.
 * @param {number} hue - Base hue (0-360)
 * @param {function} rng - Seeded random function
 * @returns {{ primary: string[], accent: string[], glow: string[], bg: string, strategy: string }}
 */
export function generatePalette(hue, rng) {
    const strategies = [
        'analogous', 'complementary', 'triadic', 'splitComplementary',
        'tetradic', 'monochromatic', 'neonPop', 'ethereal',
        'volcanic', 'arctic', 'bioluminescent', 'vaporwave'
    ];
    const strategy = strategies[Math.floor(rng() * strategies.length)];
    const sat = 60 + rng() * 30;
    const light = 55 + rng() * 20;

    let primary, accent, glow, bg;

    switch (strategy) {
        case 'analogous':
            primary = [hsla(hue, sat, light), hsla(hue + 25, sat, light), hsla(hue - 25, sat, light)];
            accent = [hsla(hue + 15, sat + 10, light + 15), hsla(hue - 15, sat + 10, light + 15)];
            glow = [hsla(hue, 90, 80, 0.6), hsla(hue + 25, 90, 80, 0.4)];
            bg = hsla(hue, 20, 5);
            break;
        case 'complementary':
            primary = [hsla(hue, sat, light), hsla(hue + 180, sat, light)];
            accent = [hsla(hue + 10, sat, light + 20), hsla(hue + 190, sat, light + 20)];
            glow = [hsla(hue, 100, 70, 0.7), hsla(hue + 180, 100, 70, 0.5)];
            bg = hsla(hue + 180, 15, 5);
            break;
        case 'triadic':
            primary = [hsla(hue, sat, light), hsla(hue + 120, sat, light), hsla(hue + 240, sat, light)];
            accent = [hsla(hue + 60, sat - 10, light + 10)];
            glow = [hsla(hue, 100, 75, 0.6), hsla(hue + 120, 100, 75, 0.4), hsla(hue + 240, 100, 75, 0.3)];
            bg = hsla(hue, 15, 4);
            break;
        case 'splitComplementary':
            primary = [hsla(hue, sat, light), hsla(hue + 150, sat, light), hsla(hue + 210, sat, light)];
            accent = [hsla(hue, sat + 15, light + 20)];
            glow = [hsla(hue, 100, 80, 0.6), hsla(hue + 150, 80, 70, 0.4)];
            bg = hsla(hue + 180, 10, 5);
            break;
        case 'tetradic':
            primary = [hsla(hue, sat, light), hsla(hue + 90, sat, light), hsla(hue + 180, sat, light), hsla(hue + 270, sat, light)];
            accent = [hsla(hue + 45, sat, light + 15)];
            glow = [hsla(hue, 100, 75, 0.5), hsla(hue + 90, 100, 75, 0.5)];
            bg = hsla(hue, 10, 3);
            break;
        case 'monochromatic':
            primary = [hsla(hue, sat, light), hsla(hue, sat - 20, light - 15), hsla(hue, sat + 10, light + 15)];
            accent = [hsla(hue, 100, 85)];
            glow = [hsla(hue, 100, 70, 0.8), hsla(hue, 100, 90, 0.4)];
            bg = hsla(hue, 30, 4);
            break;
        case 'neonPop':
            primary = [hsla(hue, 100, 55), hsla(hue + 60, 100, 55), hsla(hue + 300, 100, 55)];
            accent = [hsla(hue + 30, 100, 70), hsla(hue + 330, 100, 70)];
            glow = [hsla(hue, 100, 60, 0.9), hsla(hue + 60, 100, 60, 0.7)];
            bg = hsla(hue + 180, 5, 2);
            break;
        case 'ethereal':
            primary = [hsla(hue, 40, 75), hsla(hue + 40, 35, 80), hsla(hue + 80, 30, 85)];
            accent = [hsla(hue + 20, 50, 90)];
            glow = [hsla(hue, 60, 85, 0.5), hsla(hue + 40, 50, 90, 0.3)];
            bg = hsla(hue, 10, 6);
            break;
        case 'volcanic':
            primary = [hsla(15, 90, 50), hsla(35, 95, 55), hsla(5, 85, 40)];
            accent = [hsla(50, 100, 65), hsla(0, 100, 35)];
            glow = [hsla(25, 100, 55, 0.8), hsla(45, 100, 65, 0.5)];
            bg = hsla(0, 30, 4);
            break;
        case 'arctic':
            primary = [hsla(195, 60, 70), hsla(210, 50, 80), hsla(180, 40, 85)];
            accent = [hsla(200, 80, 90), hsla(220, 30, 65)];
            glow = [hsla(195, 80, 80, 0.6), hsla(210, 70, 90, 0.4)];
            bg = hsla(210, 15, 5);
            break;
        case 'bioluminescent':
            primary = [hsla(160, 90, 50), hsla(180, 80, 55), hsla(140, 85, 45)];
            accent = [hsla(100, 100, 65), hsla(200, 90, 60)];
            glow = [hsla(160, 100, 55, 0.8), hsla(120, 100, 60, 0.5)];
            bg = hsla(170, 20, 3);
            break;
        case 'vaporwave':
            primary = [hsla(300, 80, 65), hsla(180, 70, 60), hsla(330, 75, 60)];
            accent = [hsla(50, 80, 75), hsla(270, 60, 70)];
            glow = [hsla(300, 100, 70, 0.7), hsla(180, 100, 65, 0.5)];
            bg = hsla(280, 20, 4);
            break;
        default:
            primary = [hsla(hue, sat, light)];
            accent = [hsla(hue + 180, sat, light)];
            glow = [hsla(hue, 100, 75, 0.6)];
            bg = hsla(hue, 10, 5);
    }

    return { primary, accent, glow, bg, strategy };
}

/**
 * Extracts numeric HSL components from an hsla() string for manipulation.
 * @param {string} color - HSLA color string
 * @returns {{ h: number, s: number, l: number, a: number }}
 */
export function parseHSLA(color) {
    const match = color.match(/hsla?\((\d+\.?\d*),\s*(\d+\.?\d*)%,\s*(\d+\.?\d*)%(?:,\s*(\d+\.?\d*))?\)/);
    if (!match) return { h: 0, s: 50, l: 50, a: 1 };
    return { h: +match[1], s: +match[2], l: +match[3], a: match[4] !== undefined ? +match[4] : 1 };
}

/**
 * Shifts a color's hue by an amount.
 * @param {string} color - HSLA color string
 * @param {number} amount - Degrees to shift
 * @returns {string}
 */
export function shiftHue(color, amount) {
    const c = parseHSLA(color);
    return hsla((c.h + amount) % 360, c.s, c.l, c.a);
}

/**
 * Returns color with modified alpha.
 * @param {string} color - HSLA color string
 * @param {number} alpha - New alpha value
 * @returns {string}
 */
export function withAlpha(color, alpha) {
    const c = parseHSLA(color);
    return hsla(c.h, c.s, c.l, alpha);
}
