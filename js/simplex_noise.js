/**
 * @file simplex_noise.js
 * @description Seeded simplex noise implementation for procedural generation.
 * Provides 2D/3D noise, fractal Brownian motion, and ridged multi-fractal.
 * Based on the public domain simplex noise algorithm.
 */

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;

const GRAD3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

function buildPermTable(seed) {
    const perm = new Uint8Array(512);
    const source = new Uint8Array(256);
    for (let i = 0; i < 256; i++) source[i] = i;

    // Fisher-Yates shuffle with seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const j = s % (i + 1);
        const tmp = source[i];
        source[i] = source[j];
        source[j] = tmp;
    }

    for (let i = 0; i < 256; i++) {
        perm[i] = source[i];
        perm[i + 256] = source[i];
    }
    return perm;
}

/**
 * Creates a seeded 2D simplex noise function.
 * @param {number} seed - Integer seed
 * @returns {function(number, number): number} Noise function returning -1 to 1
 */
export function createNoise2D(seed) {
    const perm = buildPermTable(seed);

    return function noise2D(x, y) {
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;

        const ii = i & 255;
        const jj = j & 255;

        let n0 = 0, n1 = 0, n2 = 0;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 > 0) {
            t0 *= t0;
            const gi = perm[ii + perm[jj]] % 12;
            n0 = t0 * t0 * (GRAD3[gi][0] * x0 + GRAD3[gi][1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 > 0) {
            t1 *= t1;
            const gi = perm[ii + i1 + perm[jj + j1]] % 12;
            n1 = t1 * t1 * (GRAD3[gi][0] * x1 + GRAD3[gi][1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 > 0) {
            t2 *= t2;
            const gi = perm[ii + 1 + perm[jj + 1]] % 12;
            n2 = t2 * t2 * (GRAD3[gi][0] * x2 + GRAD3[gi][1] * y2);
        }

        return 70 * (n0 + n1 + n2);
    };
}

/**
 * Creates a seeded 3D simplex noise function.
 * @param {number} seed - Integer seed
 * @returns {function(number, number, number): number} Noise function returning -1 to 1
 */
export function createNoise3D(seed) {
    const perm = buildPermTable(seed);

    return function noise3D(x, y, z) {
        const s = (x + y + z) * F3;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const k = Math.floor(z + s);
        const t = (i + j + k) * G3;
        const X0 = i - t, Y0 = j - t, Z0 = k - t;
        const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;

        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
            else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
            else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
        } else {
            if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
            else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
            else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
        }

        const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
        const x3 = x0 - 1 + 3*G3, y3 = y0 - 1 + 3*G3, z3 = z0 - 1 + 3*G3;

        const ii = i & 255, jj = j & 255, kk = k & 255;
        let n0=0, n1=0, n2=0, n3=0;

        let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
        if (t0 > 0) { t0 *= t0; const gi = perm[ii+perm[jj+perm[kk]]] % 12; n0 = t0*t0*(GRAD3[gi][0]*x0+GRAD3[gi][1]*y0+GRAD3[gi][2]*z0); }

        let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
        if (t1 > 0) { t1 *= t1; const gi = perm[ii+i1+perm[jj+j1+perm[kk+k1]]] % 12; n1 = t1*t1*(GRAD3[gi][0]*x1+GRAD3[gi][1]*y1+GRAD3[gi][2]*z1); }

        let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
        if (t2 > 0) { t2 *= t2; const gi = perm[ii+i2+perm[jj+j2+perm[kk+k2]]] % 12; n2 = t2*t2*(GRAD3[gi][0]*x2+GRAD3[gi][1]*y2+GRAD3[gi][2]*z2); }

        let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
        if (t3 > 0) { t3 *= t3; const gi = perm[ii+1+perm[jj+1+perm[kk+1]]] % 12; n3 = t3*t3*(GRAD3[gi][0]*x3+GRAD3[gi][1]*y3+GRAD3[gi][2]*z3); }

        return 32 * (n0 + n1 + n2 + n3);
    };
}

/**
 * Fractal Brownian Motion - layers of noise at increasing frequency.
 * @param {function} noiseFn - 2D noise function
 * @param {number} x
 * @param {number} y
 * @param {number} octaves - Number of layers (3-8)
 * @param {number} [lacunarity=2] - Frequency multiplier per octave
 * @param {number} [gain=0.5] - Amplitude multiplier per octave
 * @returns {number} -1 to 1
 */
export function fbm2D(noiseFn, x, y, octaves, lacunarity = 2, gain = 0.5) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
        value += noiseFn(x * frequency, y * frequency) * amplitude;
        maxAmp += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }

    return value / maxAmp;
}

/**
 * Ridged multi-fractal noise - sharp ridges and valleys.
 * @param {function} noiseFn - 2D noise function
 * @param {number} x
 * @param {number} y
 * @param {number} octaves
 * @param {number} [lacunarity=2]
 * @param {number} [gain=0.5]
 * @returns {number} 0 to 1
 */
export function ridgedNoise2D(noiseFn, x, y, octaves, lacunarity = 2, gain = 0.5) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let weight = 1;

    for (let i = 0; i < octaves; i++) {
        let signal = noiseFn(x * frequency, y * frequency);
        signal = 1 - Math.abs(signal);
        signal *= signal * weight;
        weight = Math.min(1, Math.max(0, signal * 2));
        value += signal * amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }

    return value * 0.5;
}

/**
 * Curl noise for divergence-free 2D vector fields (great for fluid-like flow).
 * @param {function} noiseFn - 2D noise function
 * @param {number} x
 * @param {number} y
 * @param {number} [epsilon=0.001] - Derivative step size
 * @returns {{ x: number, y: number }} Curl vector
 */
export function curlNoise2D(noiseFn, x, y, epsilon = 0.001) {
    const dndx = (noiseFn(x + epsilon, y) - noiseFn(x - epsilon, y)) / (2 * epsilon);
    const dndy = (noiseFn(x, y + epsilon) - noiseFn(x, y - epsilon)) / (2 * epsilon);
    return { x: dndy, y: -dndx };
}
