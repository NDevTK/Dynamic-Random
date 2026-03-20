/**
 * @file spirograph_architecture.js
 * @description Background architecture that renders beautiful mathematical curves —
 * hypotrochoids, epitrochoids, Lissajous, and rose curves — as layered, animated,
 * living mathematical art. Each seed produces a unique combination of curves.
 */

import { Architecture } from './background_architectures.js';
import { lissajousCurve, roseCurve, hypotrochoid, epitrochoid, normalizePoints, seededPalette } from './math_patterns.js';
import { mouse } from './state.js';

const TAU = Math.PI * 2;
const CURVE_TYPES = ['lissajous', 'rose', 'hypotrochoid', 'epitrochoid'];

function buildCurve(type, steps, rng) {
    let result;
    switch (type) {
        case 'lissajous':  result = lissajousCurve(steps, rng);  break;
        case 'rose':       result = roseCurve(steps, rng);        break;
        case 'hypotrochoid': result = hypotrochoid(steps, rng);  break;
        case 'epitrochoid':  result = epitrochoid(steps, rng);   break;
    }
    normalizePoints(result.points);
    return result.points;
}

export class SpirographArchitecture extends Architecture {
    constructor() {
        super();
        this.layers = [];
        this.palette = [];
        this.blendMode = 'source-over';
        this.regenCountdown = 0;
        this.regenInterval = 600;
    }

    init(system) {
        const rng = system.rng;

        this.palette = seededPalette(rng);
        this.blendMode = rng() > 0.5 ? 'lighter' : 'source-over';

        // Pick 2–4 layers, each a shuffled-distinct curve type
        const layerCount = 2 + Math.floor(rng() * 3);
        const shuffled = [...CURVE_TYPES].sort(() => rng() - 0.5);

        this.layers = [];
        for (let i = 0; i < layerCount; i++) {
            const type = shuffled[i % shuffled.length];
            const steps = 1000 + Math.floor(rng() * 2001); // 1000–3000
            this.layers.push(this._makeLayer(type, steps, i, rng));
        }

        this.regenInterval = 550 + Math.floor(rng() * 100);
        this.regenCountdown = this.regenInterval;
    }

    _makeLayer(type, steps, paletteIndex, rng) {
        const points = buildCurve(type, steps, rng);
        const rotSpeed = (rng() - 0.5) * 0.004;        // base rotation speed
        const breathSpeed = 0.003 + rng() * 0.007;     // breathing frequency
        const baseScale = 0.28 + rng() * 0.18;         // normalized → canvas scale factor
        const lineWidth = 1 + rng() * 2;               // 1–3
        const opacity = 0.3 + rng() * 0.5;             // 0.3–0.8
        const dotInterval = Math.floor(20 + rng() * 60); // every Nth point gets a dot
        const color = this.palette[paletteIndex % this.palette.length];

        return {
            type,
            steps,
            points,
            color,
            lineWidth,
            opacity,
            rotSpeed,
            breathSpeed,
            baseScale,
            dotInterval,
            rotation: rng() * TAU,        // current rotation angle
            scale: baseScale,             // current animated scale
            // draw-progress animation
            drawProgress: 0,              // 0–1, how much of curve is drawn
            drawPhase: 'in',              // 'in' | 'hold' | 'out'
            drawSpeed: 1 / (80 + Math.floor(rng() * 60)),  // % per frame
            holdTimer: 0,
            holdDuration: 60 + Math.floor(rng() * 120),
        };
    }

    _regenLayer(index, rng) {
        const type = CURVE_TYPES[Math.floor(rng() * CURVE_TYPES.length)];
        const steps = 1000 + Math.floor(rng() * 2001);
        const old = this.layers[index];
        // preserve color slot and paletteIndex tie-in
        const newLayer = this._makeLayer(type, steps, index, rng);
        newLayer.color = old.color; // keep color for visual continuity, can be overridden
        this.layers[index] = newLayer;
    }

    update(system) {
        const tick = system.tick;
        const cx = system.width / 2;
        const cy = system.height / 2;

        // Mouse distance from center — closer = faster rotation
        const mdx = mouse.x - cx;
        const mdy = mouse.y - cy;
        const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
        const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);
        const mouseInfluence = Math.max(0, 1 - mouseDist / maxDist); // 0 = far, 1 = center

        for (const layer of this.layers) {
            // Rotation — mouse proximity speeds it up
            const speedBoost = 1 + mouseInfluence * 3;
            layer.rotation += layer.rotSpeed * speedBoost * system.speedMultiplier;

            // Breathing scale — sin wave + mouse pinch
            const breathe = Math.sin(tick * layer.breathSpeed);
            const pinch = mouseInfluence * 0.12;
            layer.scale = layer.baseScale * (1 + breathe * 0.08 - pinch);

            // Draw-progress animation
            if (layer.drawPhase === 'in') {
                layer.drawProgress = Math.min(1, layer.drawProgress + layer.drawSpeed * system.speedMultiplier);
                if (layer.drawProgress >= 1) {
                    layer.drawPhase = 'hold';
                    layer.holdTimer = layer.holdDuration;
                }
            } else if (layer.drawPhase === 'hold') {
                layer.holdTimer -= system.speedMultiplier;
                if (layer.holdTimer <= 0) {
                    layer.drawPhase = 'out';
                }
            } else { // 'out'
                layer.drawProgress = Math.max(0, layer.drawProgress - layer.drawSpeed * system.speedMultiplier);
                if (layer.drawProgress <= 0) {
                    layer.drawPhase = 'in';
                }
            }
        }

        // Every ~600 ticks regenerate one random layer
        this.regenCountdown -= system.speedMultiplier;
        if (this.regenCountdown <= 0) {
            const idx = Math.floor(system.rng() * this.layers.length);
            this._regenLayer(idx, system.rng);
            this.regenCountdown = this.regenInterval;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const cx = system.width / 2;
        const cy = system.height / 2;
        const minDim = Math.min(system.width, system.height);

        ctx.save();
        ctx.globalCompositeOperation = this.blendMode;

        for (let li = 0; li < this.layers.length; li++) {
            const layer = this.layers[li];
            const pts = layer.points;
            if (!pts || pts.length < 2) continue;

            const drawCount = Math.max(2, Math.floor(pts.length * layer.drawProgress));
            const radius = minDim * layer.scale;

            // ── Main curve ──────────────────────────────────────────────
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(layer.rotation);
            ctx.scale(radius, radius);

            ctx.globalAlpha = layer.opacity * layer.drawProgress;
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = layer.lineWidth / radius; // compensate for scale transform
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < drawCount; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();

            // ── Dots at every Nth point ──────────────────────────────────
            const dotR = (layer.lineWidth * 1.2) / radius;
            ctx.fillStyle = layer.color;
            ctx.globalAlpha = layer.opacity * layer.drawProgress * 0.7;
            for (let i = 0; i < drawCount; i += layer.dotInterval) {
                ctx.beginPath();
                ctx.arc(pts[i].x, pts[i].y, dotR, 0, TAU);
                ctx.fill();
            }

            ctx.restore();

            // ── Glow pass: redraw at half opacity with thicker line ───────
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(layer.rotation);
            ctx.scale(radius, radius);

            ctx.globalAlpha = layer.opacity * 0.5 * layer.drawProgress;
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = (layer.lineWidth * 2.5) / radius;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < drawCount; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();

            ctx.restore();
        }

        // ── Web: connecting lines between corresponding points on pairs of curves ──
        if (this.layers.length >= 2) {
            const webStep = 80; // sample every Nth point for web lines
            ctx.lineWidth = 0.5;

            for (let li = 0; li < this.layers.length - 1; li++) {
                const la = this.layers[li];
                const lb = this.layers[li + 1];
                if (!la.points || !lb.points) continue;

                const countA = Math.floor(la.points.length * la.drawProgress);
                const countB = Math.floor(lb.points.length * lb.drawProgress);
                if (countA < webStep || countB < webStep) continue;

                const radiusA = minDim * la.scale;
                const radiusB = minDim * lb.scale;
                const webAlpha = Math.min(la.opacity, lb.opacity) * 0.18;

                ctx.strokeStyle = la.color;
                ctx.globalAlpha = webAlpha;
                ctx.beginPath();

                const samples = Math.floor(Math.min(countA, countB) / webStep);
                for (let s = 0; s < samples; s++) {
                    const ia = s * webStep;
                    const ib = s * webStep;
                    const pa = la.points[ia];
                    const pb = lb.points[ib];

                    const cosA = Math.cos(la.rotation), sinA = Math.sin(la.rotation);
                    const cosB = Math.cos(lb.rotation), sinB = Math.sin(lb.rotation);

                    const ax = cx + (pa.x * cosA - pa.y * sinA) * radiusA;
                    const ay = cy + (pa.x * sinA + pa.y * cosA) * radiusA;
                    const bx = cx + (pb.x * cosB - pb.y * sinB) * radiusB;
                    const by = cy + (pb.x * sinB + pb.y * cosB) * radiusB;

                    ctx.moveTo(ax, ay);
                    ctx.lineTo(bx, by);
                }
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
