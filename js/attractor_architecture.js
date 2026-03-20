/**
 * @file attractor_architecture.js
 * @description Background architecture that renders strange attractors as living,
 * breathing particle trails. Tiny parameter changes create wildly different patterns,
 * so every seed looks dramatically different.
 */

import { Architecture } from './background_architectures.js';
import { cliffordAttractor, deJongAttractor, pickoverAttractor, normalizePoints, seededPalette } from './math_patterns.js';
import { mouse } from './state.js';

// Parse an HSL string into [r, g, b] 0-255 components
function hslToRgb(hslStr) {
    const m = hslStr.match(/hsl\(([^,]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!m) return [100, 150, 255];
    let h = parseFloat(m[1]) / 360;
    const s = parseFloat(m[2]) / 100;
    const l = parseFloat(m[3]) / 100;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    return [
        Math.round(hue2rgb(h + 1/3) * 255),
        Math.round(hue2rgb(h) * 255),
        Math.round(hue2rgb(h - 1/3) * 255)
    ];
}

// Generate N attractor points using current live parameters
function generatePoints(type, params, count) {
    const { a, b, c, d, e, f } = params;
    let x = 0.1, y = 0.1, z = 0.1;
    const pts = [];
    if (type === 'clifford') {
        for (let i = 0; i < count; i++) {
            const nx = Math.sin(a * y) + c * Math.cos(a * x);
            const ny = Math.sin(b * x) + d * Math.cos(b * y);
            x = nx; y = ny;
            pts.push({ x, y, t: i / count });
        }
    } else if (type === 'dejong') {
        for (let i = 0; i < count; i++) {
            const nx = Math.sin(a * y) - Math.cos(b * x);
            const ny = Math.sin(c * x) - Math.cos(d * y);
            x = nx; y = ny;
            pts.push({ x, y, t: i / count });
        }
    } else {
        // pickover
        for (let i = 0; i < count; i++) {
            const nx = Math.sin(a * y) - z * Math.cos(b * x);
            const ny = z * Math.sin(c * x) - Math.cos(d * y);
            const nz = (e || 0.9) * Math.sin(x);
            x = nx; y = ny; z = nz;
            pts.push({ x, y, t: i / count });
        }
    }
    return pts;
}

export class AttractorArchitecture extends Architecture {
    constructor() {
        super();
        this.type = 'clifford';
        this.params = {};
        this.targetParams = {};
        this.palette = [];
        this.paletteRgb = [];
        this.imageData = null;
        this.pixels = null;
        this.renderMode = 0;
        this.morphTimer = 0;
        this.morphInterval = 500;
        this.batchSize = 5000;
        this.batchPoints = [];
        this.offscreen = null;
        this.offCtx = null;
        this.labelText = '';
    }

    init(system) {
        const rng = system.rng;

        // Pick attractor type
        const typeIdx = Math.floor(rng() * 3);
        this.type = ['clifford', 'dejong', 'pickover'][typeIdx];

        // Generate seed parameters
        this.params = this._seedParams(rng, this.type);
        this.targetParams = { ...this.params };

        // Generate a 5-color palette
        this.palette = seededPalette(rng);
        this.paletteRgb = this.palette.map(hslToRgb);

        // Choose rendering mode
        this.renderMode = Math.floor(rng() * 3); // 0=density, 1=velocity, 2=time

        // Create offscreen canvas & ImageData for accumulation rendering
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = system.width;
        this.offscreen.height = system.height;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(system.width, system.height);
        this.pixels = new Uint32Array(this.imageData.data.buffer);

        // Clear buffer
        this.pixels.fill(0);

        // Warm up: generate full initial 50k points, accumulate into buffer
        const allPts = generatePoints(this.type, this.params, 50000);
        normalizePoints(allPts);
        this._accumulatePoints(allPts, system.width, system.height);

        this.morphTimer = this.morphInterval;
        this.labelText = this._makeLabel();
    }

    _seedParams(rng, type) {
        if (type === 'clifford') {
            return { a: -2 + rng() * 4, b: -2 + rng() * 4, c: -2 + rng() * 4, d: -2 + rng() * 4 };
        } else if (type === 'dejong') {
            return { a: -3 + rng() * 6, b: -3 + rng() * 6, c: -3 + rng() * 6, d: -3 + rng() * 6 };
        } else {
            return {
                a: 1.5 + rng() * 1.5, b: -0.5 + rng() * 1.0,
                c: 0.5 + rng() * 1.5, d: -1 + rng() * 2,
                e: -0.5 + rng(), f: 0.5 + rng()
            };
        }
    }

    _makeLabel() {
        const p = this.params;
        const vals = Object.entries(p).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(' ');
        return `${this.type} | ${vals}`;
    }

    // Accumulate a batch of points into the pixel buffer
    _accumulatePoints(pts, W, H) {
        const margin = 0.08;
        const scale = (1 - margin * 2) * 0.5;
        const paletteRgb = this.paletteRgb;
        const mode = this.renderMode;
        const pLen = paletteRgb.length;

        // Normalise the batch itself first to get relative velocity for mode 1
        let prevX = pts[0] ? pts[0].x : 0;
        let prevY = pts[0] ? pts[0].y : 0;

        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            const sx = Math.round((p.x * scale + 0.5) * W);
            const sy = Math.round((p.y * scale + 0.5) * H);
            if (sx < 0 || sx >= W || sy < 0 || sy >= H) { prevX = p.x; prevY = p.y; continue; }

            let colorIdx;
            if (mode === 0) {
                // density accumulation: cycle through palette
                colorIdx = i % pLen;
            } else if (mode === 1) {
                // color by velocity
                const vx = p.x - prevX, vy = p.y - prevY;
                const speed = Math.sqrt(vx * vx + vy * vy);
                colorIdx = Math.min(pLen - 1, Math.floor(speed * pLen * 8));
            } else {
                // color by time
                colorIdx = Math.floor(p.t * pLen) % pLen;
            }

            const [r, g, b] = paletteRgb[colorIdx];
            const idx = sy * W + sx;

            // Read current pixel — additive blend clamped to 255
            const cur = this.pixels[idx];
            const cr = (cur >> 16) & 0xff;
            const cg = (cur >> 8) & 0xff;
            const cb = cur & 0xff;
            const nr = Math.min(255, cr + (r >> 3));
            const ng = Math.min(255, cg + (g >> 3));
            const nb = Math.min(255, cb + (b >> 3));
            this.pixels[idx] = (0xff << 24) | (nr << 16) | (ng << 8) | nb;

            prevX = p.x; prevY = p.y;
        }
    }

    // Fade the accumulation buffer toward black (trail persistence)
    _fadeBuffer() {
        const len = this.pixels.length;
        for (let i = 0; i < len; i++) {
            const px = this.pixels[i];
            if (px === 0) continue;
            // Multiply each channel by ~0.995
            const r = (((px >> 16) & 0xff) * 253) >> 8;
            const g = (((px >> 8) & 0xff) * 253) >> 8;
            const b = ((px & 0xff) * 253) >> 8;
            this.pixels[i] = (0xff << 24) | (r << 16) | (g << 8) | b;
        }
    }

    update(system) {
        const rng = system.rng;

        // Morph parameters toward new targets every ~morphInterval ticks
        this.morphTimer--;
        if (this.morphTimer <= 0) {
            this.morphTimer = this.morphInterval;
            this.targetParams = this._seedParams(rng, this.type);
            this.labelText = this._makeLabel();
        }

        // Interpolate current params toward target (slow morph)
        const alpha = 0.002;
        for (const k in this.params) {
            this.params[k] += (this.targetParams[k] - this.params[k]) * alpha;
        }

        // Mouse perturbation: shift params slightly based on normalised cursor offset
        const mx = (mouse.x / (system.width || 1) - 0.5) * 0.3;
        const my = (mouse.y / (system.height || 1) - 0.5) * 0.3;
        const liveParams = { ...this.params };
        if (this.type === 'clifford' || this.type === 'dejong') {
            liveParams.a += mx; liveParams.b += my;
        } else {
            liveParams.a += mx * 0.5; liveParams.c += my * 0.5;
        }

        // Generate points with current (mouse-perturbed) parameters, scaled by quality
        const raw = generatePoints(this.type, liveParams, Math.floor(this.batchSize * (system.qualityScale || 1)));
        normalizePoints(raw);
        this.batchPoints = raw;

        // Fade buffer for trail persistence
        this._fadeBuffer();
    }

    draw(system) {
        const ctx = system.ctx;
        const W = system.width;
        const H = system.height;

        // Accumulate new batch into buffer
        this._accumulatePoints(this.batchPoints, W, H);

        // Push accumulated ImageData to offscreen canvas, then blit to main canvas
        this.offCtx.putImageData(this.imageData, 0, 0);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(this.offscreen, 0, 0);
        ctx.restore();

        // Subtle info label — bottom-right, small, low opacity
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.labelText, W - 12, H - 10);
        ctx.restore();
    }
}
