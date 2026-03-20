/**
 * @file math_patterns.js
 * @description Advanced mathematical pattern generators, all seed-driven.
 * Every function takes a seeded RNG to produce deterministic but wildly
 * varied results across different seeds.
 */

// ─── Golden Ratio & Fibonacci ───────────────────────────────────────

const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;

/**
 * Generates a Fibonacci spiral of points.
 * Uses golden angle (137.508°) for natural phyllotaxis patterns.
 */
export function fibonacciSpiral(count, maxRadius, rng) {
    const points = [];
    const angleOffset = rng() * TAU;
    const squeeze = 0.6 + rng() * 0.8; // Vary the spiral tightness
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = i * TAU / PHI + angleOffset;
        const r = Math.sqrt(t) * maxRadius * squeeze;
        points.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r,
            t, index: i, angle, r
        });
    }
    return points;
}

/**
 * Generates a Vogel spiral (sunflower pattern).
 * The density parameter creates different packing patterns.
 */
export function vogelSpiral(count, maxRadius, rng) {
    const points = [];
    const goldenAngle = TAU / (PHI * PHI); // ~137.508 degrees
    const density = 0.5 + rng() * 2.0;
    const twist = rng() > 0.5 ? 1 : -1;
    for (let i = 0; i < count; i++) {
        const r = Math.pow(i / count, density) * maxRadius;
        const theta = i * goldenAngle * twist;
        points.push({
            x: Math.cos(theta) * r,
            y: Math.sin(theta) * r,
            t: i / count, index: i
        });
    }
    return points;
}

// ─── Strange Attractors ─────────────────────────────────────────────

/**
 * Generates points along a Lorenz attractor trajectory.
 * Seed varies sigma, rho, beta for different butterfly shapes.
 */
export function lorenzAttractor(steps, rng) {
    const sigma = 8 + rng() * 6;   // Classic: 10
    const rho = 24 + rng() * 10;    // Classic: 28
    const beta = 2 + rng() * 2;     // Classic: 8/3
    const dt = 0.005 + rng() * 0.005;

    let x = 0.1 + rng() * 2, y = 0, z = 0;
    const points = [];

    for (let i = 0; i < steps; i++) {
        const dx = sigma * (y - x);
        const dy = x * (rho - z) - y;
        const dz = x * y - beta * z;
        x += dx * dt; y += dy * dt; z += dz * dt;
        points.push({ x, y, z, t: i / steps });
    }
    return points;
}

/**
 * Clifford attractor — creates beautiful swirling 2D patterns.
 * Tiny changes in a,b,c,d produce wildly different shapes.
 */
export function cliffordAttractor(steps, rng) {
    const a = -2 + rng() * 4;
    const b = -2 + rng() * 4;
    const c = -2 + rng() * 4;
    const d = -2 + rng() * 4;

    let x = 0.1, y = 0.1;
    const points = [];

    for (let i = 0; i < steps; i++) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x);
        const ny = Math.sin(b * x) + d * Math.cos(b * y);
        x = nx; y = ny;
        points.push({ x, y, t: i / steps });
    }
    return points;
}

/**
 * De Jong attractor — four-parameter chaotic system.
 */
export function deJongAttractor(steps, rng) {
    const a = -3 + rng() * 6;
    const b = -3 + rng() * 6;
    const c = -3 + rng() * 6;
    const d = -3 + rng() * 6;

    let x = 0, y = 0;
    const points = [];

    for (let i = 0; i < steps; i++) {
        const nx = Math.sin(a * y) - Math.cos(b * x);
        const ny = Math.sin(c * x) - Math.cos(d * y);
        x = nx; y = ny;
        points.push({ x, y, t: i / steps });
    }
    return points;
}

/**
 * Pickover (icon) attractor — produces symmetric, mandala-like patterns.
 */
export function pickoverAttractor(steps, rng) {
    const a = 1.5 + rng() * 1.5;
    const b = -0.5 + rng() * 1.0;
    const c = 0.5 + rng() * 1.5;
    const d = -1 + rng() * 2;
    const e = -0.5 + rng();
    const f = 0.5 + rng();

    let x = 0.1, y = 0.1, z = 0.1;
    const points = [];

    for (let i = 0; i < steps; i++) {
        const nx = Math.sin(a * y) - z * Math.cos(b * x);
        const ny = z * Math.sin(c * x) - Math.cos(d * y);
        const nz = e * Math.sin(x);
        x = nx; y = ny; z = nz;
        points.push({ x, y, z, t: i / steps });
    }
    return points;
}

// ─── Parametric Curves ──────────────────────────────────────────────

/**
 * Lissajous curve with seed-varied frequency ratios.
 * Different ratios create different symmetry patterns.
 */
export function lissajousCurve(steps, rng) {
    const freqA = Math.floor(1 + rng() * 7);
    const freqB = Math.floor(1 + rng() * 7);
    const phase = rng() * TAU;
    const decay = rng() > 0.7 ? 0.001 * rng() : 0; // Some seeds get spiral decay

    const points = [];
    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * TAU * 2;
        const dampening = Math.exp(-decay * i);
        points.push({
            x: Math.sin(freqA * t + phase) * dampening,
            y: Math.cos(freqB * t) * dampening,
            t: i / steps
        });
    }
    return { points, freqA, freqB, phase };
}

/**
 * Rose curve (rhodonea) — mathematical flowers.
 * k = n/d determines petal count and overlap.
 */
export function roseCurve(steps, rng) {
    const n = Math.floor(1 + rng() * 8);
    const d = Math.floor(1 + rng() * 8);
    const k = n / d;

    const points = [];
    const maxTheta = TAU * d; // Full period
    for (let i = 0; i < steps; i++) {
        const theta = (i / steps) * maxTheta;
        const r = Math.cos(k * theta);
        points.push({
            x: r * Math.cos(theta),
            y: r * Math.sin(theta),
            t: i / steps, r
        });
    }
    return { points, n, d, k };
}

/**
 * Hypotrochoid (Spirograph pattern).
 * R = outer radius, r = inner radius, d = pen distance.
 */
export function hypotrochoid(steps, rng) {
    const R = 3 + Math.floor(rng() * 8);
    const r = 1 + Math.floor(rng() * (R - 1));
    const d = 0.5 + rng() * (r + 1);

    const points = [];
    const periods = lcm(R, r) / R;
    const maxTheta = TAU * periods;

    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * maxTheta;
        const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
        const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        points.push({ x, y, t: i / steps });
    }
    return { points, R, r, d };
}

/**
 * Epitrochoid — the complement of hypotrochoid.
 */
export function epitrochoid(steps, rng) {
    const R = 2 + Math.floor(rng() * 6);
    const r = 1 + Math.floor(rng() * 4);
    const d = 0.3 + rng() * r;

    const points = [];
    const periods = lcm(R, r) / R;
    const maxTheta = TAU * periods;

    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * maxTheta;
        const x = (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
        const y = (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);
        points.push({ x, y, t: i / steps });
    }
    return { points, R, r, d };
}

/**
 * Superformula (Gielis) — generalized shape equation.
 * Can produce everything from circles to starfish to organic blobs.
 */
export function superformula(steps, rng) {
    const m = Math.floor(1 + rng() * 12);
    const n1 = 0.2 + rng() * 5;
    const n2 = 0.2 + rng() * 5;
    const n3 = 0.2 + rng() * 5;
    const a = 0.5 + rng() * 1.5;
    const b = 0.5 + rng() * 1.5;

    const points = [];
    for (let i = 0; i < steps; i++) {
        const theta = (i / steps) * TAU;
        const t1 = Math.pow(Math.abs(Math.cos(m * theta / 4) / a), n2);
        const t2 = Math.pow(Math.abs(Math.sin(m * theta / 4) / b), n3);
        const r = Math.pow(t1 + t2, -1 / n1);
        points.push({
            x: r * Math.cos(theta),
            y: r * Math.sin(theta),
            t: i / steps, r
        });
    }
    return { points, m, n1, n2, n3 };
}

// ─── Fractals & Space-Filling ───────────────────────────────────────

/**
 * Julia set membership test for a given c parameter.
 * Returns iteration count (for coloring) or -1 if in set.
 */
export function juliaSet(cx, cy, maxIter) {
    return function(px, py) {
        let x = px, y = py;
        for (let i = 0; i < maxIter; i++) {
            const xx = x * x, yy = y * y;
            if (xx + yy > 4) return i;
            y = 2 * x * y + cy;
            x = xx - yy + cx;
        }
        return -1;
    };
}

/**
 * Generate seed-varied Julia set parameters.
 * Different seeds produce different fractal shapes.
 */
export function seededJuliaParams(rng) {
    // Pick from known interesting regions of the c-plane
    const presets = [
        () => ({ cx: -0.7 + rng() * 0.2, cy: 0.27 + rng() * 0.1 }),  // Classic spiral
        () => ({ cx: -0.4 + rng() * 0.1, cy: 0.6 + rng() * 0.1 }),   // Dendrite
        () => ({ cx: 0.28 + rng() * 0.08, cy: 0.008 + rng() * 0.02 }), // Siegel disk
        () => ({ cx: -0.12 + rng() * 0.05, cy: 0.74 + rng() * 0.04 }), // Douady rabbit
        () => ({ cx: -0.75 + rng() * 0.15, cy: 0.1 + rng() * 0.1 }),  // Lightning
        () => ({ cx: -1.25 + rng() * 0.1, cy: rng() * 0.1 }),         // Basilica
        () => ({ cx: rng() * 0.4 - 0.2, cy: rng() * 0.8 - 0.4 }),    // Wild
    ];
    return presets[Math.floor(rng() * presets.length)]();
}

/**
 * L-system string generator for fractal plants/patterns.
 */
export function lSystem(axiom, rules, iterations) {
    let current = axiom;
    for (let i = 0; i < iterations; i++) {
        let next = '';
        for (const ch of current) {
            next += rules[ch] || ch;
        }
        current = next;
    }
    return current;
}

/**
 * Generate seed-varied L-system rules.
 * Returns axiom, rules, angle, and iterations.
 */
export function seededLSystem(rng) {
    const systems = [
        { axiom: 'F', rules: { F: 'F[+F]F[-F]F' }, angle: 25.7 + rng() * 10, iter: 4 },
        { axiom: 'F', rules: { F: 'FF+[+F-F-F]-[-F+F+F]' }, angle: 20 + rng() * 8, iter: 3 },
        { axiom: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' }, angle: 22 + rng() * 10, iter: 4 },
        { axiom: 'F', rules: { F: 'F[+F]F[-F][F]' }, angle: 18 + rng() * 14, iter: 4 },
        { axiom: 'X', rules: { X: 'F[+X][-X]FX', F: 'FF' }, angle: 25 + rng() * 15, iter: 5 },
        { axiom: 'F', rules: { F: 'F+F--F+F' }, angle: 60 + rng() * 5, iter: 4 }, // Koch-like
        { axiom: 'FX', rules: { X: 'X+YF+', Y: '-FX-Y' }, angle: 90, iter: 10 }, // Dragon
    ];
    const sys = systems[Math.floor(rng() * systems.length)];
    sys.angle += (rng() - 0.5) * 5; // Slight random variation
    return sys;
}

// ─── Tiling & Tessellation ──────────────────────────────────────────

/**
 * Penrose tiling (P3 rhombus) via subdivision.
 * Returns arrays of thin and thick rhombuses.
 */
export function penroseTiling(cx, cy, radius, depth, rng) {
    const triangles = [];
    const startAngle = rng() * TAU;

    // Initial decagon of triangles
    for (let i = 0; i < 10; i++) {
        const a = startAngle + (i * TAU / 10);
        const b = startAngle + ((i + 1) * TAU / 10);
        const pA = { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
        const pB = { x: cx + Math.cos(b) * radius, y: cy + Math.sin(b) * radius };
        if (i % 2 === 0) {
            triangles.push({ type: 0, A: { x: cx, y: cy }, B: pA, C: pB });
        } else {
            triangles.push({ type: 0, A: { x: cx, y: cy }, B: pB, C: pA });
        }
    }

    // Subdivide
    for (let d = 0; d < depth; d++) {
        const next = [];
        for (const t of triangles) {
            if (t.type === 0) {
                const P = {
                    x: t.A.x + (t.B.x - t.A.x) / PHI,
                    y: t.A.y + (t.B.y - t.A.y) / PHI
                };
                next.push({ type: 0, A: t.C, B: P, C: t.B });
                next.push({ type: 1, A: P, B: t.C, C: t.A });
            } else {
                const Q = {
                    x: t.B.x + (t.A.x - t.B.x) / PHI,
                    y: t.B.y + (t.A.y - t.B.y) / PHI
                };
                const R = {
                    x: t.B.x + (t.C.x - t.B.x) / PHI,
                    y: t.B.y + (t.C.y - t.B.y) / PHI
                };
                next.push({ type: 1, A: R, B: t.C, C: t.A });
                next.push({ type: 1, A: Q, B: R, C: t.B });
                next.push({ type: 0, A: R, B: Q, C: t.A });
            }
        }
        triangles.length = 0;
        triangles.push(...next);
    }
    return triangles;
}

/**
 * Truchet tiling — quarter-circle arcs in a grid.
 * Seed determines tile orientation, creating maze-like patterns.
 */
export function truchetTiling(cols, rows, rng) {
    const tiles = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            tiles.push({
                col: c, row: r,
                rotation: Math.floor(rng() * 4), // 0, 90, 180, 270
                variant: Math.floor(rng() * 3)    // arc, diagonal, triangle
            });
        }
    }
    return tiles;
}

// ─── Wave Functions & Interference ──────────────────────────────────

/**
 * Generates a seed-varied wave superposition function.
 * Returns a function f(x, y, t) that combines multiple sine waves.
 */
export function waveSuperposition(rng) {
    const waveCount = 3 + Math.floor(rng() * 5);
    const waves = [];
    for (let i = 0; i < waveCount; i++) {
        waves.push({
            freqX: 0.5 + rng() * 4,
            freqY: 0.5 + rng() * 4,
            freqT: 0.2 + rng() * 2,
            phase: rng() * TAU,
            amp: 0.3 + rng() * 0.7,
            angle: rng() * TAU
        });
    }

    return function(x, y, t) {
        let val = 0;
        for (const w of waves) {
            const rx = x * Math.cos(w.angle) + y * Math.sin(w.angle);
            val += w.amp * Math.sin(rx * w.freqX + t * w.freqT + w.phase);
        }
        return val / waveCount;
    };
}

/**
 * Moiré pattern generator — overlapping rotated grids.
 */
export function moirePattern(rng) {
    const gridCount = 2 + Math.floor(rng() * 3);
    const grids = [];
    for (let i = 0; i < gridCount; i++) {
        grids.push({
            angle: (i / gridCount) * Math.PI + rng() * 0.3,
            frequency: 3 + rng() * 12,
            phase: rng() * TAU
        });
    }

    return function(x, y, t) {
        let val = 1;
        for (const g of grids) {
            const rx = x * Math.cos(g.angle + t * 0.05) + y * Math.sin(g.angle + t * 0.05);
            val *= 0.5 + 0.5 * Math.sin(rx * g.frequency + g.phase);
        }
        return val;
    };
}

// ─── Coordinate Transforms ──────────────────────────────────────────

/**
 * Seed-varied conformal mapping (complex function).
 * Maps the plane through a seed-determined complex function.
 */
export function conformalMap(rng) {
    const mapType = Math.floor(rng() * 6);
    const a = 0.5 + rng() * 2;
    const b = rng() * TAU;

    return function(x, y) {
        let u, v;
        switch (mapType) {
            case 0: // z^n (power map)
                const n = 2 + Math.floor(rng() * 4);
                const rr = Math.sqrt(x * x + y * y);
                const theta = Math.atan2(y, x);
                u = Math.pow(rr, n) * Math.cos(n * theta);
                v = Math.pow(rr, n) * Math.sin(n * theta);
                break;
            case 1: // 1/z (inversion)
                const d = x * x + y * y + 0.001;
                u = x / d * a; v = -y / d * a;
                break;
            case 2: // e^z
                const ex = Math.exp(x * a);
                u = ex * Math.cos(y + b); v = ex * Math.sin(y + b);
                break;
            case 3: // sin(z)
                u = Math.sin(x * a) * Math.cosh(y);
                v = Math.cos(x * a) * Math.sinh(y);
                break;
            case 4: // Joukowski (airfoil)
                const dd = x * x + y * y + 0.001;
                u = x * (1 + a / dd); v = y * (1 - a / dd);
                break;
            default: // Möbius transformation
                const cr = Math.cos(b), ci = Math.sin(b);
                const denom = (x + cr) * (x + cr) + (y + ci) * (y + ci) + 0.001;
                u = ((x * (x + cr) + y * (y + ci)) * a) / denom;
                v = ((y * (x + cr) - x * (y + ci)) * a) / denom;
        }
        return { x: u, y: v };
    };
}

/**
 * Seed-driven color palette generator using color theory.
 * Generates harmonious palettes that vary wildly per seed.
 */
export function seededPalette(rng) {
    const baseHue = rng() * 360;
    const scheme = Math.floor(rng() * 6);
    const satBase = 50 + rng() * 40;
    const lightBase = 40 + rng() * 30;
    const hues = [];

    switch (scheme) {
        case 0: // Analogous
            for (let i = 0; i < 5; i++) hues.push((baseHue + i * 30 - 60) % 360);
            break;
        case 1: // Triadic
            for (let i = 0; i < 3; i++) hues.push((baseHue + i * 120) % 360);
            hues.push((baseHue + 60) % 360, (baseHue + 180) % 360);
            break;
        case 2: // Split complementary
            hues.push(baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360,
                (baseHue + 30) % 360, (baseHue + 330) % 360);
            break;
        case 3: // Tetradic
            for (let i = 0; i < 4; i++) hues.push((baseHue + i * 90) % 360);
            hues.push((baseHue + 45) % 360);
            break;
        case 4: // Monochromatic with value variation
            for (let i = 0; i < 5; i++) hues.push(baseHue);
            break;
        default: // Random harmony
            for (let i = 0; i < 5; i++) hues.push((baseHue + rng() * 360) % 360);
    }

    return hues.map((h, i) => {
        const s = scheme === 4 ? satBase - i * 8 : satBase + (rng() - 0.5) * 20;
        const l = scheme === 4 ? lightBase + i * 10 : lightBase + (rng() - 0.5) * 20;
        return `hsl(${h}, ${Math.max(20, Math.min(95, s))}%, ${Math.max(15, Math.min(85, l))}%)`;
    });
}

// ─── Utilities ──────────────────────────────────────────────────────

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

/**
 * Normalize an array of {x, y} points to fit within [-1, 1].
 */
export function normalizePoints(points) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.max(rangeX, rangeY) / 2;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    for (const p of points) {
        p.x = (p.x - cx) / scale;
        p.y = (p.y - cy) / scale;
    }
    return points;
}

/**
 * Pick a random math pattern and generate it with the given seed.
 * Returns { type, points, params } for any architecture to use.
 */
export function randomPattern(rng, stepCount) {
    const steps = stepCount || 2000;
    const type = Math.floor(rng() * 12);

    switch (type) {
        case 0: return { type: 'fibonacci', points: normalizePoints(fibonacciSpiral(steps, 1, rng)) };
        case 1: return { type: 'vogel', points: normalizePoints(vogelSpiral(steps, 1, rng)) };
        case 2: return { type: 'lorenz', points: normalizePoints(lorenzAttractor(steps, rng)) };
        case 3: return { type: 'clifford', points: normalizePoints(cliffordAttractor(steps, rng)) };
        case 4: return { type: 'dejong', points: normalizePoints(deJongAttractor(steps, rng)) };
        case 5: return { type: 'pickover', points: normalizePoints(pickoverAttractor(steps, rng)) };
        case 6: {
            const r = lissajousCurve(steps, rng);
            return { type: 'lissajous', points: normalizePoints(r.points), params: r };
        }
        case 7: {
            const r = roseCurve(steps, rng);
            return { type: 'rose', points: normalizePoints(r.points), params: r };
        }
        case 8: {
            const r = hypotrochoid(steps, rng);
            return { type: 'hypotrochoid', points: normalizePoints(r.points), params: r };
        }
        case 9: {
            const r = epitrochoid(steps, rng);
            return { type: 'epitrochoid', points: normalizePoints(r.points), params: r };
        }
        case 10: {
            const r = superformula(steps, rng);
            return { type: 'superformula', points: normalizePoints(r.points), params: r };
        }
        default: return { type: 'clifford', points: normalizePoints(cliffordAttractor(steps, rng)) };
    }
}
