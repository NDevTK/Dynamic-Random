/**
 * @file rune_sigil_alphabet.js
 * @description Procedural runic alphabet generator. Each seed produces a completely
 * different set of 6-12 glyphs built from deterministic stroke sequences (line, arc,
 * dot, polygon). Glyphs are generated within a unit square and rendered on demand.
 *
 * Stroke format (compact arrays to minimize GC and enable cheap duplication):
 *   ['L', x1, y1, x2, y2]                  -- line
 *   ['A', cx, cy, r, a0, a1]               -- arc
 *   ['D', x, y, r]                         -- dot
 *   ['P', x, y, sides, r, rot]             -- regular polygon
 *   ['Z', x1, y1, x2, y2, cx, cy]          -- quadratic curve
 */

/**
 * Deterministic pseudo-random in [0,1) from integer seed.
 * Used so glyphs can be re-rendered identically without storing state.
 */
function hash01(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = (n + (n << 3)) | 0;
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967296;
}

/**
 * Generates one glyph: a sequence of strokes inside [-0.5, 0.5] unit space.
 * @param {function} rng - seeded RNG
 * @returns {{strokes: Array, complexity: number}}
 */
function generateGlyph(rng) {
    const strokes = [];
    // Pick a spine archetype: vertical, horizontal, diagonal, circular, radial, cross
    const archetype = Math.floor(rng() * 6);
    const strokeCount = 2 + Math.floor(rng() * 4); // 2-5 strokes

    // Spine stroke establishes the glyph silhouette.
    switch (archetype) {
        case 0: // vertical spine
            strokes.push(['L', 0, -0.45, 0, 0.45]);
            break;
        case 1: // horizontal spine
            strokes.push(['L', -0.45, 0, 0.45, 0]);
            break;
        case 2: // diagonal
            strokes.push(['L', -0.4, -0.4, 0.4, 0.4]);
            break;
        case 3: // ring
            strokes.push(['A', 0, 0, 0.35, 0, Math.PI * 2]);
            break;
        case 4: // angular bracket
            strokes.push(['L', -0.35, -0.4, 0, 0.4]);
            strokes.push(['L', 0, 0.4, 0.35, -0.4]);
            break;
        case 5: // cross
            strokes.push(['L', -0.4, 0, 0.4, 0]);
            strokes.push(['L', 0, -0.4, 0, 0.4]);
            break;
    }

    // Add decorative strokes
    for (let i = 0; i < strokeCount; i++) {
        const kind = rng();
        if (kind < 0.3) {
            // line
            const x1 = (rng() - 0.5) * 0.9;
            const y1 = (rng() - 0.5) * 0.9;
            // keep strokes proportional: pick a direction + length
            const ang = rng() * Math.PI * 2;
            const len = 0.15 + rng() * 0.4;
            strokes.push(['L', x1, y1, x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len]);
        } else if (kind < 0.55) {
            // arc
            const cx = (rng() - 0.5) * 0.5;
            const cy = (rng() - 0.5) * 0.5;
            const r = 0.1 + rng() * 0.3;
            const a0 = rng() * Math.PI * 2;
            const sweep = Math.PI * (0.4 + rng() * 1.4);
            strokes.push(['A', cx, cy, r, a0, a0 + sweep]);
        } else if (kind < 0.75) {
            // dot
            strokes.push(['D', (rng() - 0.5) * 0.8, (rng() - 0.5) * 0.8, 0.015 + rng() * 0.03]);
        } else if (kind < 0.9) {
            // polygon
            const sides = 3 + Math.floor(rng() * 4); // 3-6
            strokes.push(['P', (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3,
                sides, 0.08 + rng() * 0.15, rng() * Math.PI * 2]);
        } else {
            // curve
            const x1 = (rng() - 0.5) * 0.6;
            const y1 = (rng() - 0.5) * 0.6;
            const x2 = (rng() - 0.5) * 0.6;
            const y2 = (rng() - 0.5) * 0.6;
            strokes.push(['Z', x1, y1, x2, y2, (rng() - 0.5) * 0.8, (rng() - 0.5) * 0.8]);
        }
    }

    return { strokes, complexity: strokes.length };
}

/**
 * Generate a complete alphabet of unique runes.
 * @param {function} rng - seeded RNG
 * @param {number} count - number of glyphs to generate (6-12 recommended)
 * @returns {{glyphs: Array, style: number}}
 */
export function generateRuneAlphabet(rng, count) {
    const glyphs = [];
    for (let i = 0; i < count; i++) {
        glyphs.push(generateGlyph(rng));
    }
    return {
        glyphs,
        // Overall stroke rendering style: 0=solid, 1=dashed, 2=glow-wide, 3=double-stroke
        style: Math.floor(rng() * 4),
    };
}

/**
 * Render a glyph at (x,y) with given size, rotation, alpha, hue.
 * Uses pre-set ctx state (strokeStyle, lineWidth) from caller when possible,
 * but sets per-path colors based on hue/alpha.
 */
export function drawGlyph(ctx, glyph, x, y, size, rotation, hue, alpha, style) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.translate(x, y);
    if (rotation !== 0) ctx.rotate(rotation);
    ctx.scale(size, size);

    const strokeColor = `hsla(${hue}, 85%, 65%, ${alpha})`;
    const fillColor = `hsla(${hue}, 90%, 75%, ${alpha})`;

    // Set line width in unit-space (scaled). We want ~1.5px at default size,
    // so divide by size to counteract the scale() above.
    const lw = 1.5 / size;

    if (style === 1) {
        ctx.setLineDash([0.04, 0.04]);
    }
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokes = glyph.strokes;
    // Batch all strokes into one path, fill dots separately
    ctx.beginPath();
    for (let i = 0; i < strokes.length; i++) {
        const s = strokes[i];
        switch (s[0]) {
            case 'L':
                ctx.moveTo(s[1], s[2]);
                ctx.lineTo(s[3], s[4]);
                break;
            case 'A':
                ctx.moveTo(s[1] + Math.cos(s[4]) * s[3], s[2] + Math.sin(s[4]) * s[3]);
                ctx.arc(s[1], s[2], s[3], s[4], s[5]);
                break;
            case 'P': {
                const sides = s[3];
                const r = s[4];
                const rot = s[5];
                for (let k = 0; k <= sides; k++) {
                    const a = rot + (k / sides) * Math.PI * 2;
                    const px = s[1] + Math.cos(a) * r;
                    const py = s[2] + Math.sin(a) * r;
                    if (k === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                break;
            }
            case 'Z':
                ctx.moveTo(s[1], s[2]);
                ctx.quadraticCurveTo(s[5], s[6], s[3], s[4]);
                break;
        }
    }
    ctx.stroke();

    if (style === 3) {
        // Double-stroke: outline in brighter tone
        ctx.strokeStyle = `hsla(${(hue + 30) % 360}, 100%, 85%, ${alpha * 0.5})`;
        ctx.lineWidth = lw * 0.4;
        ctx.stroke();
    }

    // Dots filled separately
    for (let i = 0; i < strokes.length; i++) {
        const s = strokes[i];
        if (s[0] === 'D') {
            ctx.beginPath();
            ctx.arc(s[1], s[2], s[3], 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (style === 1) ctx.setLineDash([]);
    ctx.restore();
}
