/**
 * @file fractal_explorer_architecture.js
 * @description Background architecture rendering Julia set fractals with
 * seed-varied parameters, progressive re-rendering, and subtle mouse morphing.
 */

import { Architecture } from './background_architectures.js';
import { juliaSet, seededJuliaParams, seededPalette } from './math_patterns.js';
import { mouse } from './state.js';

export class FractalExplorerArchitecture extends Architecture {
    constructor() {
        super();
        this.c = { x: -0.7, y: 0.27 }; this.cSeed = { x: -0.7, y: 0.27 };
        this.palette = []; this.paletteRgb = [];
        this.offscreen = null; this.offCtx = null;
        this.centerX = 0; this.centerY = 0; this.zoom = 3.5;
        this.maxIterations = 80; this.colorMode = 0; this.frameCount = 0;
    }

    init(system) {
        const params = seededJuliaParams(system.rng);
        this.c = { x: params.cx, y: params.cy };
        this.cSeed = { x: params.cx, y: params.cy };

        this.palette = seededPalette(system.rng);
        this.paletteRgb = this.palette.map(hsl => hslToRgb(hsl));

        this.offscreen = document.createElement('canvas');
        this.offscreen.width = Math.max(1, Math.floor(system.width / Math.round(4 / (system.qualityScale || 1))));
        this.offscreen.height = Math.max(1, Math.floor(system.height / Math.round(4 / (system.qualityScale || 1))));
        this.offCtx = this.offscreen.getContext('2d');

        this.centerX = 0; this.centerY = 0; this.zoom = 3.5;
        this.maxIterations = 80;
        this.colorMode = Math.floor(system.rng() * 3);
        this.frameCount = 0;

        this._renderFractal(system);
    }

    update(system) {
        this.frameCount++;
        const t = this.frameCount * 0.005;

        // Auto-zoom toward an interesting region
        this.zoom *= 0.998;

        // Slowly drift the center
        this.centerX = Math.sin(t * 0.7) * 0.05;
        this.centerY = Math.cos(t * 0.5) * 0.05;

        // Mouse influence on c parameter (±0.05)
        const mx = (mouse.x / system.width - 0.5) * 0.1;
        const my = (mouse.y / system.height - 0.5) * 0.1;

        // c oscillates around seed value for gentle morphing
        const oscX = Math.sin(t * 1.3) * 0.015;
        const oscY = Math.cos(t * 0.9) * 0.015;
        this.c.x = this.cSeed.x + oscX + mx;
        this.c.y = this.cSeed.y + oscY + my;

        // Progressive re-render every 300 frames
        if (this.frameCount % 300 === 0) {
            this._renderFractal(system);
        }
    }

    draw(system) {
        const { ctx, width, height } = system;

        // Draw offscreen fractal scaled to full screen (bilinear via canvas scaling)
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.offscreen, 0, 0, width, height);
        ctx.restore();

        // Subtle animated color cycling overlay
        const t = this.frameCount * 0.005;
        const cycleAlpha = 0.06 + 0.04 * Math.sin(t * 2.1);
        ctx.save();
        ctx.globalAlpha = cycleAlpha;
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(
            width * 0.5, height * 0.5, 0,
            width * 0.5, height * 0.5, width * 0.6
        );
        const hueShift = (t * 30) % 360;
        grad.addColorStop(0, `hsl(${hueShift}, 80%, 60%)`);
        grad.addColorStop(0.5, `hsl(${(hueShift + 120) % 360}, 70%, 40%)`);
        grad.addColorStop(1, `hsl(${(hueShift + 240) % 360}, 60%, 20%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Bloom/glow: redraw fractal at lower opacity with 'lighter' composite
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(this.offscreen, -2, -2, width + 4, height + 4);
        ctx.restore();

        // Thin crosshair at center showing current c parameter values
        const cx = width * 0.5, cy = height * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
        ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.fillText(`c: ${this.c.x.toFixed(3)}, ${this.c.y.toFixed(3)}i`, cx + 15, cy + 4);
        ctx.restore();
    }

    _renderFractal(system) {
        const bw = this.offscreen.width;
        const bh = this.offscreen.height;
        const imageData = this.offCtx.createImageData(bw, bh);
        const data = imageData.data;

        const cx = this.c.x;
        const cy = this.c.y;
        const maxIter = this.maxIterations;
        const zoom = this.zoom;
        const centerX = this.centerX;
        const centerY = this.centerY;
        const colorMode = this.colorMode;
        const palette = this.paletteRgb;
        const pLen = palette.length;

        // Track raw iteration counts for mode 1 (palette mod)
        const iterCounts = colorMode === 1 ? new Int32Array(bw * bh) : null;

        // Typed arrays for the fractal pass
        const rawIter = new Float32Array(bw * bh);

        for (let py = 0; py < bh; py++) {
            for (let px = 0; px < bw; px++) {
                const zx = ((px / bw) - 0.5) * zoom + centerX;
                const zy = ((py / bh) - 0.5) * zoom * (bh / bw) + centerY;

                let x = zx, y = zy;
                let iter = 0;
                let minDist = Infinity;
                let smoothVal = -1;

                for (let i = 0; i < maxIter; i++) {
                    const xx = x * x, yy = y * y;
                    if (xx + yy > 256) {
                        if (colorMode === 0) {
                            // Smooth coloring: log-log escape
                            const log2 = Math.log(xx + yy) * 0.5;
                            smoothVal = i + 1 - Math.log(log2 / Math.LN2) / Math.LN2;
                        } else {
                            smoothVal = i;
                        }
                        iter = i;
                        break;
                    }
                    if (colorMode === 2) {
                        const d = xx + yy;
                        if (d < minDist) minDist = d;
                    }
                    y = 2 * x * y + cy;
                    x = xx - yy + cx;
                    iter = i + 1;
                }

                const idx = py * bw + px;
                if (smoothVal < 0 && iter === maxIter) {
                    rawIter[idx] = -1; // in the set
                } else if (colorMode === 2) {
                    rawIter[idx] = minDist < Infinity ? Math.sqrt(minDist) : -1;
                } else {
                    rawIter[idx] = smoothVal >= 0 ? smoothVal : -1;
                }

                if (colorMode === 1 && iterCounts) {
                    iterCounts[idx] = iter < maxIter ? iter : -1;
                }
            }
        }

        // Write pixel colors
        for (let i = 0; i < bw * bh; i++) {
            const base = i * 4;
            const val = rawIter[i];

            if (val < 0) {
                // In the set — black
                data[base] = 0;
                data[base + 1] = 0;
                data[base + 2] = 0;
                data[base + 3] = 255;
                continue;
            }

            let r, g, b;

            if (colorMode === 0) {
                // Smooth palette cycling using fractional iteration
                const t = (val * 0.1) % 1;
                const pidx = Math.floor(val * 0.5) % pLen;
                const pidx2 = (pidx + 1) % pLen;
                const c1 = palette[pidx];
                const c2 = palette[pidx2];
                r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
                g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
                b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
            } else if (colorMode === 1) {
                // Iteration count modulo palette
                const ic = iterCounts ? iterCounts[i] : Math.floor(val);
                if (ic < 0) {
                    data[base] = 0; data[base + 1] = 0; data[base + 2] = 0;
                    data[base + 3] = 255;
                    continue;
                }
                const c1 = palette[ic % pLen];
                r = c1[0]; g = c1[1]; b = c1[2];
            } else {
                // Orbit trap: color by min distance to origin
                const t = Math.min(1, val * 2);
                const pidx = Math.floor(t * (pLen - 1));
                const pidx2 = Math.min(pLen - 1, pidx + 1);
                const frac = t * (pLen - 1) - pidx;
                const c1 = palette[pidx];
                const c2 = palette[pidx2];
                r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
                g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
                b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
            }

            data[base] = r;
            data[base + 1] = g;
            data[base + 2] = b;
            data[base + 3] = 255;
        }

        this.offCtx.putImageData(imageData, 0, 0);
    }
}

// Parse hsl() string to [r, g, b]
function hslToRgb(hslStr) {
    const m = hslStr.match(/hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!m) return [128, 128, 128];
    let h = parseFloat(m[1]) / 360;
    const s = parseFloat(m[2]) / 100;
    const l = parseFloat(m[3]) / 100;
    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
        Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, h) * 255),
        Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
    ];
}

function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}
