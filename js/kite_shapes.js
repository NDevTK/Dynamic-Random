/**
 * @file kite_shapes.js
 * @description Procedural kite shape generator. Each seed selects one of several
 * kite archetypes (diamond, delta, box, hex, bowtie, chevron, star) and parameterizes
 * its proportions, producing a unique fleet per seed.
 *
 * Each kite shape exports:
 *   - outline: [x,y,x,y,...] polygon vertices in unit space (roughly [-1,1])
 *   - struts:  [x1,y1,x2,y2,...] pairs of points for internal framework lines
 *   - tailAnchor: {x,y} point where the streamer tail attaches (usually bottom)
 *   - stringAnchor: {x,y} point where the kite-string attaches (usually upper-mid)
 */

const TAU = Math.PI * 2;

/**
 * Build a diamond-shaped kite: classic 2:3 aspect with horizontal+vertical spars.
 */
function makeDiamond(rng) {
    const w = 0.55 + rng() * 0.15;
    const topH = 0.55 + rng() * 0.2;
    const bottomH = 0.85 + rng() * 0.25;
    const crossY = -0.1 + rng() * 0.2;
    return {
        outline: [0, -topH, w, crossY, 0, bottomH, -w, crossY],
        struts: [-w, crossY, w, crossY, 0, -topH, 0, bottomH],
        tailAnchor: { x: 0, y: bottomH },
        stringAnchor: { x: 0, y: crossY },
    };
}

/**
 * Delta kite (triangular swept-wing).
 */
function makeDelta(rng) {
    const w = 0.75 + rng() * 0.2;
    const h = 0.8 + rng() * 0.2;
    const noseDrop = 0.05 + rng() * 0.15;
    return {
        outline: [0, -h, w, h * 0.35, 0, h * noseDrop + 0.05, -w, h * 0.35],
        struts: [0, -h, 0, h * 0.35, -w, h * 0.35, w, h * 0.35],
        tailAnchor: { x: 0, y: h * 0.35 },
        stringAnchor: { x: 0, y: 0 },
    };
}

/**
 * Box kite: two stacked diamonds sharing a central spar.
 */
function makeBox(rng) {
    const w = 0.45 + rng() * 0.15;
    const h = 0.75 + rng() * 0.2;
    const mid = 0.1 + rng() * 0.15;
    return {
        outline: [0, -h, w, -mid, 0, 0, w, mid, 0, h, -w, mid, 0, 0, -w, -mid],
        struts: [0, -h, 0, h, -w, -mid, w, -mid, -w, mid, w, mid],
        tailAnchor: { x: 0, y: h },
        stringAnchor: { x: 0, y: 0 },
    };
}

/**
 * Hexagonal kite.
 */
function makeHex(rng) {
    const r = 0.7 + rng() * 0.15;
    const rot = -Math.PI / 2;
    const outline = [];
    for (let i = 0; i < 6; i++) {
        const a = rot + (i / 6) * TAU;
        outline.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    const struts = [];
    for (let i = 0; i < 3; i++) {
        const a = rot + (i / 6) * TAU;
        struts.push(
            Math.cos(a) * r, Math.sin(a) * r,
            Math.cos(a + Math.PI) * r, Math.sin(a + Math.PI) * r
        );
    }
    return {
        outline,
        struts,
        tailAnchor: { x: 0, y: r },
        stringAnchor: { x: 0, y: 0 },
    };
}

/**
 * Bowtie kite: two opposing triangles meeting at a waist.
 */
function makeBowtie(rng) {
    const w = 0.75 + rng() * 0.15;
    const h = 0.65 + rng() * 0.2;
    const waist = 0.15 + rng() * 0.1;
    return {
        outline: [-w, -h, w, -h, waist, 0, w, h, -w, h, -waist, 0],
        struts: [-w, -h, w, h, w, -h, -w, h, -waist, 0, waist, 0],
        tailAnchor: { x: 0, y: h },
        stringAnchor: { x: 0, y: 0 },
    };
}

/**
 * Chevron/arrow kite: forward-pointing arrow shape.
 */
function makeChevron(rng) {
    const w = 0.7 + rng() * 0.2;
    const h = 0.85 + rng() * 0.2;
    const notch = 0.3 + rng() * 0.2;
    return {
        outline: [0, -h, w, h, 0, h - notch, -w, h],
        struts: [0, -h, 0, h - notch, -w, h, w, h],
        tailAnchor: { x: 0, y: h - notch * 0.5 },
        stringAnchor: { x: 0, y: -h * 0.3 },
    };
}

/**
 * Five-point star kite.
 */
function makeStar(rng) {
    const outerR = 0.85 + rng() * 0.1;
    const innerR = outerR * (0.38 + rng() * 0.1);
    const rot = -Math.PI / 2;
    const outline = [];
    for (let i = 0; i < 10; i++) {
        const a = rot + (i / 10) * TAU;
        const r = (i % 2 === 0) ? outerR : innerR;
        outline.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    const struts = [
        -outerR, 0, outerR, 0,
        0, -outerR, 0, outerR,
    ];
    return {
        outline,
        struts,
        tailAnchor: { x: 0, y: outerR },
        stringAnchor: { x: 0, y: -innerR * 0.4 },
    };
}

const BUILDERS = [makeDiamond, makeDelta, makeBox, makeHex, makeBowtie, makeChevron, makeStar];

/**
 * Generate a fleet of kite shape definitions. Picks 2-4 distinct archetypes per
 * seed and builds variations of each.
 * @param {function} rng - seeded RNG
 * @param {number} fleetSize - number of distinct shapes to produce
 * @returns {Array<object>} array of kite shape definitions
 */
export function generateKiteFleet(rng, fleetSize) {
    // Pick a subset of 2-4 distinct archetype builders
    const archetypeCount = 2 + Math.floor(rng() * 3);
    const available = BUILDERS.slice();
    const picked = [];
    for (let i = 0; i < archetypeCount && available.length > 0; i++) {
        const idx = Math.floor(rng() * available.length);
        picked.push(available[idx]);
        available.splice(idx, 1);
    }
    const fleet = [];
    for (let i = 0; i < fleetSize; i++) {
        const builder = picked[i % picked.length];
        fleet.push(builder(rng));
    }
    return fleet;
}

/**
 * Render a kite shape into the current path. Caller is responsible for save/restore,
 * translate/rotate/scale, and stroke/fill styles.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shape
 * @param {number} fillAlpha - 0 to skip fill
 * @param {string} strokeColor
 * @param {string} fillColor
 * @param {number} strutAlpha - 0 to skip struts
 * @param {string} strutColor
 */
export function drawKiteShape(ctx, shape, strokeColor, fillColor, fillAlpha, strutColor, strutAlpha) {
    const outline = shape.outline;
    ctx.beginPath();
    ctx.moveTo(outline[0], outline[1]);
    for (let i = 2; i < outline.length; i += 2) {
        ctx.lineTo(outline[i], outline[i + 1]);
    }
    ctx.closePath();

    if (fillAlpha > 0 && fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    if (strutAlpha > 0 && strutColor) {
        const struts = shape.struts;
        ctx.strokeStyle = strutColor;
        ctx.beginPath();
        for (let i = 0; i < struts.length; i += 4) {
            ctx.moveTo(struts[i], struts[i + 1]);
            ctx.lineTo(struts[i + 2], struts[i + 3]);
        }
        ctx.stroke();
    }
}
