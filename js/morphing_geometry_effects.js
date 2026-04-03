/**
 * @file morphing_geometry_effects.js
 * @description Sacred geometry shapes that smoothly morph between forms based on
 * cursor position. Shapes breathe, rotate, and layer with interference patterns.
 * Click to snap to the next form, hover to distort.
 *
 * Modes:
 * 0 - Metatron's Cube: Overlapping circles and lines morphing through platonic solids
 * 1 - Flower of Life: Expanding/contracting circle patterns that follow cursor
 * 2 - Sri Yantra: Nested triangles that rotate and scale with mouse distance
 * 3 - Spirograph: Nested rotating circles drawing hypotrochoid curves
 * 4 - Impossible Geometry: Penrose triangles and impossible shapes that shift
 * 5 - Fractal Mandala: Self-similar patterns that zoom with scroll and rotate with cursor
 */

const TAU = Math.PI * 2;

export class MorphingGeometry {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this._shapes = [];
        this._morphProgress = 0; // 0-1 between shape states
        this._currentForm = 0;
        this._targetForm = 0;
        this._hue = 260;
        this._hue2 = 40;
        this._mx = 0;
        this._my = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._intensity = 1;
        this._rotation = 0;
        this._rotationSpeed = 0.003;
        this._breathPhase = 0;
        this._breathSpeed = 0.01;
        this._scale = 1;
        this._layers = 3;

        // Spirograph params (mode 3)
        this._spiroR = 0;
        this._spiroR2 = 0;
        this._spiroD = 0;
        this._spiroTrailX = null; // Ring buffer Float32Array
        this._spiroTrailY = null;
        this._spiroTrailHue = null;
        this._spiroMaxTrail = 2000;
        this._spiroWriteIdx = 0;
        this._spiroCount = 0;

        // Trail canvas
        this._trailCanvas = null;
        this._trailCtx = null;

        // Cursor proximity pulse
        this._cursorPulse = 0;
    }

    configure(rng, hues) {
        this.tick = 0;
        this.mode = Math.floor(rng() * 6);
        this._morphProgress = 0;
        this._currentForm = 0;
        this._targetForm = 0;
        this._rotation = 0;
        this._breathPhase = 0;
        this._cursorPulse = 0;
        this._spiroWriteIdx = 0;
        this._spiroCount = 0;

        this._hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._hue2 = hues.length > 1 ? hues[1].h : (this._hue + 150) % 360;
        this._intensity = 0.5 + rng() * 0.5;
        this._rotationSpeed = 0.001 + rng() * 0.005;
        this._breathSpeed = 0.005 + rng() * 0.015;
        this._layers = 2 + Math.floor(rng() * 4);
        this._scale = 0.6 + rng() * 0.4;

        // Mode 3: spirograph parameters + ring buffer
        if (this.mode === 3) {
            this._spiroR = 80 + rng() * 100;
            this._spiroR2 = 20 + rng() * 60;
            this._spiroD = 30 + rng() * 80;
            this._spiroTrailX = new Float32Array(this._spiroMaxTrail);
            this._spiroTrailY = new Float32Array(this._spiroMaxTrail);
            this._spiroTrailHue = new Float32Array(this._spiroMaxTrail);
        }

        const W = window.innerWidth;
        const H = window.innerHeight;

        // Trail canvas
        const tw = Math.ceil(W / 2);
        const th = Math.ceil(H / 2);
        this._trailCanvas = document.createElement('canvas');
        this._trailCanvas.width = tw;
        this._trailCanvas.height = th;
        this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
        this._trailCtx.clearRect(0, 0, tw, th);
    }

    update(mx, my, isClicking) {
        this.tick++;
        const dx = mx - this._mx;
        const dy = my - this._my;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._mx = mx;
        this._my = my;

        const clickJust = isClicking && !this._wasClicking;
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Click: advance to next form + trigger pulse
        if (clickJust) {
            this._targetForm = (this._targetForm + 1) % 6;
            this._cursorPulse = 1;
        }
        this._cursorPulse *= 0.95;

        // Morph toward target
        if (this._currentForm !== this._targetForm) {
            this._morphProgress += 0.015;
            if (this._morphProgress >= 1) {
                this._currentForm = this._targetForm;
                this._morphProgress = 0;
            }
        }

        // Rotation accelerates with mouse speed
        this._rotation += this._rotationSpeed + this._mouseSpeed * 0.0003;
        this._breathPhase += this._breathSpeed;

        // Mode 3: spirograph trail (ring buffer — no .shift() GC pressure)
        if (this.mode === 3 && this._spiroTrailX) {
            const t = this.tick * 0.02;
            const R = this._spiroR;
            const r = this._spiroR2;
            const d = this._spiroD;
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;

            const offX = (mx - cx) * 0.1;
            const offY = (my - cy) * 0.1;

            const x = cx + offX + (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t);
            const y = cy + offY + (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t);

            const wi = this._spiroWriteIdx;
            this._spiroTrailX[wi] = x;
            this._spiroTrailY[wi] = y;
            this._spiroTrailHue[wi] = (this._hue + this.tick * 0.5) % 360;
            this._spiroWriteIdx = (wi + 1) % this._spiroMaxTrail;
            this._spiroCount = Math.min(this._spiroCount + 1, this._spiroMaxTrail);
        }

        // Trail fade
        if (this._trailCtx && this.tick % 3 === 0) {
            const tc = this._trailCtx;
            tc.globalCompositeOperation = 'destination-out';
            tc.fillStyle = 'rgba(0,0,0,0.008)';
            tc.fillRect(0, 0, this._trailCanvas.width, this._trailCanvas.height);
        }
    }

    _drawPolygon(ctx, cx, cy, radius, sides, rotation) {
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const angle = rotation + (i / sides) * TAU;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    _drawFlowerOfLife(ctx, cx, cy, radius, depth) {
        if (depth <= 0) return;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, TAU);
        ctx.stroke();

        if (depth > 1) {
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * TAU + this._rotation;
                const nx = cx + Math.cos(angle) * radius;
                const ny = cy + Math.sin(angle) * radius;
                this._drawFlowerOfLife(ctx, nx, ny, radius * 0.5, depth - 1);
            }
        }
    }

    draw(ctx, system) {
        ctx.save();

        // Trail layer
        if (this._trailCanvas) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3 * this._intensity;
            ctx.drawImage(this._trailCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';
        const W = system.width;
        const H = system.height;
        const cx = W / 2;
        const cy = H / 2;
        const breath = Math.sin(this._breathPhase) * 0.15 + 1;
        const baseSize = Math.min(W, H) * 0.25 * this._scale * breath;
        const hue = this._hue;
        const hue2 = this._hue2;
        const intensity = this._intensity;
        const rot = this._rotation;

        // Cursor distortion
        const distX = (this._mx - cx) / W;
        const distY = (this._my - cy) / H;

        if (this.mode === 0) {
            // Metatron's Cube: overlapping circles + connecting lines
            ctx.lineWidth = 0.8;

            for (let layer = 0; layer < this._layers; layer++) {
                const layerScale = 1 - layer * 0.2;
                const layerRot = rot + layer * 0.3;
                const r = baseSize * layerScale;
                const alpha = (0.15 - layer * 0.03) * intensity;
                const layerHue = (hue + layer * 30) % 360;

                // Center circle
                ctx.strokeStyle = `hsla(${layerHue}, 60%, 60%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(cx + distX * 20 * layer, cy + distY * 20 * layer, r * 0.3, 0, TAU);
                ctx.stroke();

                // Surrounding circles
                const sides = 6;
                const points = [];
                for (let i = 0; i < sides; i++) {
                    const angle = layerRot + (i / sides) * TAU;
                    const px = cx + Math.cos(angle) * r + distX * 20 * layer;
                    const py = cy + Math.sin(angle) * r + distY * 20 * layer;
                    points.push({ x: px, y: py });

                    ctx.beginPath();
                    ctx.arc(px, py, r * 0.3, 0, TAU);
                    ctx.stroke();
                }

                // Connecting lines
                ctx.strokeStyle = `hsla(${layerHue}, 50%, 55%, ${alpha * 0.5})`;
                for (let i = 0; i < points.length; i++) {
                    for (let j = i + 1; j < points.length; j++) {
                        ctx.beginPath();
                        ctx.moveTo(points[i].x, points[i].y);
                        ctx.lineTo(points[j].x, points[j].y);
                        ctx.stroke();
                    }
                }
            }
        } else if (this.mode === 1) {
            // Flower of Life
            ctx.lineWidth = 0.6;
            const maxDepth = Math.min(3, this._layers);
            for (let layer = 0; layer < this._layers; layer++) {
                const alpha = (0.1 - layer * 0.02) * intensity;
                const layerHue = (hue + layer * 40) % 360;
                ctx.strokeStyle = `hsla(${layerHue}, 60%, 60%, ${alpha})`;
                const layerR = baseSize * (0.3 + layer * 0.15);
                const layerCx = cx + distX * 15 * layer;
                const layerCy = cy + distY * 15 * layer;
                this._drawFlowerOfLife(ctx, layerCx, layerCy, layerR, maxDepth);
            }
        } else if (this.mode === 2) {
            // Sri Yantra: nested triangles
            ctx.lineWidth = 1;
            const triangleCount = 4 + Math.floor(this._layers * 1.5);
            for (let i = 0; i < triangleCount; i++) {
                const t = i / triangleCount;
                const r = baseSize * (0.2 + t * 0.8);
                const triRot = rot + (i % 2 === 0 ? 0 : Math.PI / triangleCount) + distX * 0.2;
                const alpha = (0.12 + (1 - t) * 0.08) * intensity;
                const triHue = (hue + i * 25) % 360;

                ctx.strokeStyle = `hsla(${triHue}, 60%, 60%, ${alpha})`;
                this._drawPolygon(ctx, cx + distX * 10, cy + distY * 10, r, 3, triRot - Math.PI / 2);
                ctx.stroke();

                // Inner glow on even triangles
                if (i % 2 === 0) {
                    ctx.fillStyle = `hsla(${triHue}, 50%, 50%, ${alpha * 0.1})`;
                    this._drawPolygon(ctx, cx + distX * 10, cy + distY * 10, r, 3, triRot - Math.PI / 2);
                    ctx.fill();
                }
            }

            // Central bindu point
            const binduAlpha = (0.3 + Math.sin(this._breathPhase * 2) * 0.1) * intensity;
            ctx.fillStyle = `hsla(${hue2}, 80%, 70%, ${binduAlpha})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, TAU);
            ctx.fill();

            ctx.fillStyle = `hsla(${hue2}, 80%, 70%, ${binduAlpha * 0.2})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, TAU);
            ctx.fill();
        } else if (this.mode === 3) {
            // Spirograph — batched drawing from ring buffer
            const trailLen = this._spiroCount;
            if (trailLen > 1 && this._spiroTrailX) {
                const maxT = this._spiroMaxTrail;
                const startIdx = trailLen < maxT ? 0 : this._spiroWriteIdx;
                const xs = this._spiroTrailX;
                const ys = this._spiroTrailY;
                const hs = this._spiroTrailHue;

                // Draw in batches of ~100 segments per color band for perf
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                const batchSize = 100;
                for (let batch = 0; batch < trailLen - 1; batch += batchSize) {
                    const batchEnd = Math.min(batch + batchSize, trailLen - 1);
                    const midIdx = (startIdx + Math.floor((batch + batchEnd) / 2)) % maxT;
                    const midT = (batch + batchEnd) / 2 / trailLen;
                    const alpha = midT * 0.25 * intensity;
                    ctx.strokeStyle = `hsla(${hs[midIdx]}, 70%, 60%, ${alpha.toFixed(3)})`;
                    ctx.beginPath();
                    for (let j = batch; j < batchEnd; j++) {
                        const i0 = (startIdx + j) % maxT;
                        const i1 = (startIdx + j + 1) % maxT;
                        ctx.moveTo(xs[i0], ys[i0]);
                        ctx.lineTo(xs[i1], ys[i1]);
                    }
                    ctx.stroke();
                }

                // Bright tip
                const tipIdx = (startIdx + trailLen - 1) % maxT;
                ctx.fillStyle = `hsla(${hs[tipIdx]}, 80%, 80%, ${0.6 * intensity})`;
                ctx.beginPath();
                ctx.arc(xs[tipIdx], ys[tipIdx], 3, 0, TAU);
                ctx.fill();

                ctx.fillStyle = `hsla(${hs[tipIdx]}, 80%, 80%, ${0.1 * intensity})`;
                ctx.beginPath();
                ctx.arc(xs[tipIdx], ys[tipIdx], 15, 0, TAU);
                ctx.fill();
            }

            // Draw the gear mechanism faintly
            const t = this.tick * 0.02;
            const R = this._spiroR;
            const r = this._spiroR2;
            const offX = (this._mx - cx) * 0.1;
            const offY = (this._my - cy) * 0.1;

            ctx.strokeStyle = `hsla(${hue}, 40%, 50%, ${0.06 * intensity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(cx + offX, cy + offY, R, 0, TAU);
            ctx.stroke();

            const innerCX = cx + offX + (R - r) * Math.cos(t);
            const innerCY = cy + offY + (R - r) * Math.sin(t);
            ctx.beginPath();
            ctx.arc(innerCX, innerCY, r, 0, TAU);
            ctx.stroke();
        } else if (this.mode === 4) {
            // Impossible geometry: Penrose-inspired shapes
            ctx.lineWidth = 1.2;

            for (let layer = 0; layer < this._layers; layer++) {
                const layerRot = rot + layer * TAU / this._layers;
                const r = baseSize * (0.5 + layer * 0.2);
                const alpha = (0.15 - layer * 0.02) * intensity;
                const layerHue = (hue + layer * 50) % 360;

                // Impossible triangle
                ctx.strokeStyle = `hsla(${layerHue}, 65%, 60%, ${alpha})`;
                const corners = 3;
                const pts = [];
                for (let i = 0; i < corners; i++) {
                    const angle = layerRot + (i / corners) * TAU - Math.PI / 2;
                    pts.push({
                        x: cx + Math.cos(angle) * r + distX * 15,
                        y: cy + Math.sin(angle) * r + distY * 15,
                    });
                }

                // Draw with offset "impossible" parallels
                const offset = r * 0.12;
                for (let i = 0; i < corners; i++) {
                    const j = (i + 1) % corners;
                    const k = (i + 2) % corners;

                    // Main line
                    ctx.beginPath();
                    ctx.moveTo(pts[i].x, pts[i].y);
                    ctx.lineTo(pts[j].x, pts[j].y);
                    ctx.stroke();

                    // Parallel offset line (creates illusion)
                    const mx2 = (pts[i].x + pts[j].x) / 2;
                    const my2 = (pts[i].y + pts[j].y) / 2;
                    const ndx = -(pts[j].y - pts[i].y);
                    const ndy = pts[j].x - pts[i].x;
                    const nLen = Math.sqrt(ndx * ndx + ndy * ndy);
                    if (nLen > 0) {
                        const ox = (ndx / nLen) * offset;
                        const oy = (ndy / nLen) * offset;
                        ctx.strokeStyle = `hsla(${(layerHue + 30) % 360}, 55%, 55%, ${alpha * 0.7})`;
                        ctx.beginPath();
                        ctx.moveTo(pts[i].x + ox, pts[i].y + oy);
                        ctx.lineTo(pts[j].x + ox, pts[j].y + oy);
                        ctx.stroke();
                    }
                }

                // Fill with semi-transparent gradient
                ctx.fillStyle = `hsla(${layerHue}, 50%, 50%, ${alpha * 0.08})`;
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(pts[1].x, pts[1].y);
                ctx.lineTo(pts[2].x, pts[2].y);
                ctx.closePath();
                ctx.fill();
            }
        } else if (this.mode === 5) {
            // Fractal Mandala
            const maxDepth = Math.min(4, this._layers + 1);
            this._drawMandala(ctx, cx + distX * 10, cy + distY * 10, baseSize, maxDepth, rot, hue, intensity);
        }

        // Click pulse ring (all modes)
        if (this._cursorPulse > 0.05) {
            const pulseRadius = (1 - this._cursorPulse) * 80 + 10;
            const pulseAlpha = this._cursorPulse * 0.3 * intensity;
            ctx.strokeStyle = `hsla(${hue2}, 80%, 75%, ${pulseAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this._mx, this._my, pulseRadius, 0, TAU);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawMandala(ctx, cx, cy, radius, depth, rotation, hue, intensity) {
        if (depth <= 0 || radius < 3) return;

        const sides = 4 + depth * 2;
        const alpha = (0.08 + (depth * 0.04)) * intensity;
        const layerHue = (hue + depth * 35) % 360;

        ctx.strokeStyle = `hsla(${layerHue}, 60%, 60%, ${alpha})`;
        ctx.lineWidth = 0.5 + depth * 0.3;

        // Draw polygon
        this._drawPolygon(ctx, cx, cy, radius, sides, rotation);
        ctx.stroke();

        // Fill alternate layers
        if (depth % 2 === 0) {
            ctx.fillStyle = `hsla(${layerHue}, 50%, 50%, ${alpha * 0.1})`;
            this._drawPolygon(ctx, cx, cy, radius, sides, rotation);
            ctx.fill();
        }

        // Inner ring of circles
        const innerCount = sides;
        const innerR = radius * 0.45;
        for (let i = 0; i < innerCount; i++) {
            const angle = rotation + (i / innerCount) * TAU;
            const nx = cx + Math.cos(angle) * innerR;
            const ny = cy + Math.sin(angle) * innerR;

            ctx.strokeStyle = `hsla(${(layerHue + 20) % 360}, 55%, 55%, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(nx, ny, radius * 0.15, 0, TAU);
            ctx.stroke();

            // Recurse into child mandalas
            this._drawMandala(ctx, nx, ny, radius * 0.25, depth - 1, rotation + Math.PI / sides, hue, intensity);
        }
    }
}
