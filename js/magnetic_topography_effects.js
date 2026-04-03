/**
 * @file magnetic_topography_effects.js
 * @description Animated topographic contour lines that form elevation maps around
 * interaction points. The cursor is a "peak" that raises the terrain, clicks
 * create craters or mountains, and the contour lines animate with flowing colors.
 *
 * Modes:
 * 0 - Mountain Range: Cursor creates peaks, click stamps permanent mountains
 * 1 - Magnetic Field: Iron filing-like contour lines between N/S poles at cursor and clicks
 * 2 - Weather Map: Isobar-style pressure contours with fronts and wind arrows
 * 3 - Ocean Floor: Bathymetric depth contours with mid-ocean ridges along mouse path
 * 4 - Sound Pressure: Standing wave pressure contour map that morphs with cursor
 * 5 - Gravity Wells: Gravitational equipotential lines around mass points
 */

const TAU = Math.PI * 2;

export class MagneticTopography {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 60;
        this.intensity = 1;
        this._rng = Math.random;

        // Elevation sources (peaks, craters, poles, etc.)
        this.sources = [];
        this.maxSources = 15;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMX = 0;
        this._prevMY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Contour field (low-res)
        this._fieldCanvas = null;
        this._fieldCtx = null;
        this._fieldW = 0;
        this._fieldH = 0;
        this._fieldScale = 3;

        // Mouse trail for ocean ridge mode
        this._ridgeTrail = [];
        this._maxRidgeTrail = 30;

        // Wind arrows for weather mode
        this._windArrows = [];

        // Contour line cache
        this._contourLevels = 10;
        this._contourSpacing = 0.1;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 40 + Math.floor(rng() * 40);
        this.intensity = 0.5 + rng() * 0.6;
        this.tick = 0;
        this.sources = [];
        this._ridgeTrail = [];

        const W = window.innerWidth, H = window.innerHeight;

        this._fieldScale = 4;
        this._fieldW = Math.ceil(W / this._fieldScale);
        this._fieldH = Math.ceil(H / this._fieldScale);
        this._fieldCanvas = document.createElement('canvas');
        this._fieldCanvas.width = this._fieldW;
        this._fieldCanvas.height = this._fieldH;
        this._fieldCtx = this._fieldCanvas.getContext('2d', { alpha: true });

        this._contourLevels = 8 + Math.floor(rng() * 8);
        this._contourSpacing = 1 / this._contourLevels;

        // Place initial sources
        const initCount = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < initCount; i++) {
            this.sources.push({
                x: rng() * W,
                y: rng() * H,
                strength: 0.3 + rng() * 0.7,
                radius: 100 + rng() * 200,
                type: rng() > 0.3 ? 'peak' : 'crater',
                polarity: rng() > 0.5 ? 1 : -1, // for magnetic mode
                permanent: true,
                life: 99999,
            });
        }

        // Weather mode wind arrows
        if (this.mode === 2) {
            this._windArrows = [];
            const cols = Math.ceil(W / 80);
            const rows = Math.ceil(H / 80);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    this._windArrows.push({
                        x: c * 80 + 40,
                        y: r * 80 + 40,
                        angle: 0,
                        speed: 0,
                    });
                }
            }
        }
    }

    _computeField(fx, fy, mx, my) {
        const scale = this._fieldScale;
        let value = 0;

        // Cursor contribution
        const cdx = fx - mx / scale;
        const cdy = fy - my / scale;
        const cDist = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
        const cursorRadius = 60 / scale;

        if (this.mode === 1) {
            // Magnetic field: dipole from cursor
            const r2 = cDist * cDist;
            const cosTheta = cdy / cDist;
            value += cosTheta / (r2 + 10); // Dipole field
        } else if (this.mode === 5) {
            // Gravitational: 1/r potential
            value += 1 / (cDist * 0.02 + 1);
        } else {
            // Gaussian peak/cone
            value += Math.exp(-(cDist * cDist) / (cursorRadius * cursorRadius * 2));
        }

        // Source contributions
        for (const src of this.sources) {
            const sdx = fx - src.x / scale;
            const sdy = fy - src.y / scale;
            const sDist = Math.sqrt(sdx * sdx + sdy * sdy) || 0.1;
            const sRadius = src.radius / scale;

            if (this.mode === 1) {
                // Magnetic: each source is a pole
                value += src.polarity * src.strength / (sDist * 0.05 + 1);
            } else if (this.mode === 5) {
                const sign = src.type === 'crater' ? -1 : 1;
                value += sign * src.strength / (sDist * 0.02 + 1);
            } else {
                const sign = src.type === 'crater' ? -1 : 1;
                value += sign * src.strength * Math.exp(-(sDist * sDist) / (sRadius * sRadius * 0.5));
            }
        }

        // Ridge trail contribution (ocean floor)
        if (this.mode === 3 && this._ridgeTrail.length > 0) {
            for (const rp of this._ridgeTrail) {
                const rdx = fx - rp.x / scale;
                const rdy = fy - rp.y / scale;
                const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
                value += 0.3 * Math.exp(-(rDist * rDist) / 400);
            }
        }

        // Sound pressure mode: add standing wave
        if (this.mode === 4) {
            const px = fx / this._fieldW;
            const py = fy / this._fieldH;
            value += 0.5 * Math.sin(px * Math.PI * 4 + this.tick * 0.03) *
                Math.sin(py * Math.PI * 3 + this.tick * 0.02);
        }

        return value;
    }

    update(mx, my, isClicking) {
        this.tick++;
        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = this._mouseX;
        this._prevMY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;

        // Click stamps permanent source
        if (isClicking && !this._wasClicking) {
            if (this.sources.length >= this.maxSources) {
                // Remove oldest non-permanent
                for (let i = 0; i < this.sources.length; i++) {
                    if (!this.sources[i].permanent || this.sources[i].life < 500) {
                        this.sources[i] = this.sources[this.sources.length - 1];
                        this.sources.pop();
                        break;
                    }
                }
            }
            // Use tick-based pseudo-random for deterministic click behavior
            const pr = ((this.tick * 2654435761) >>> 0) / 4294967296;
            const pr2 = ((this.tick * 2246822519) >>> 0) / 4294967296;
            this.sources.push({
                x: mx, y: my,
                strength: 0.5 + pr * 0.5,
                radius: 80 + pr2 * 150,
                type: pr > 0.4 ? 'peak' : 'crater',
                polarity: pr2 > 0.5 ? 1 : -1,
                permanent: false,
                life: 300 + Math.floor(pr * 200),
            });
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Decay non-permanent sources
        for (let i = this.sources.length - 1; i >= 0; i--) {
            if (!this.sources[i].permanent) {
                this.sources[i].life--;
                if (this.sources[i].life <= 0) {
                    this.sources[i] = this.sources[this.sources.length - 1];
                    this.sources.pop();
                }
            }
        }

        // Ridge trail (ocean floor)
        if (this.mode === 3 && this._mouseSpeed > 2) {
            this._ridgeTrail.push({ x: mx, y: my });
            if (this._ridgeTrail.length > this._maxRidgeTrail) {
                this._ridgeTrail.shift();
            }
        }

        // Update wind arrows
        if (this.mode === 2) {
            for (const arrow of this._windArrows) {
                // Compute gradient at arrow position
                const scale = this._fieldScale;
                const afxL = this._computeField(arrow.x / scale - 1, arrow.y / scale, mx, my);
                const afxR = this._computeField(arrow.x / scale + 1, arrow.y / scale, mx, my);
                const afyT = this._computeField(arrow.x / scale, arrow.y / scale - 1, mx, my);
                const afyB = this._computeField(arrow.x / scale, arrow.y / scale + 1, mx, my);
                // Wind flows perpendicular to pressure gradient (Coriolis-like)
                const gradX = afxR - afxL;
                const gradY = afyB - afyT;
                arrow.angle = Math.atan2(-gradX, gradY); // Perpendicular
                arrow.speed = Math.sqrt(gradX * gradX + gradY * gradY) * 20;
            }
        }

        // Render contour field (throttle to every 2 frames for performance)
        if (this.tick % 2 === 0) {
            this._renderContours();
        }
    }

    _renderContours() {
        const fc = this._fieldCtx;
        const fw = this._fieldW, fh = this._fieldH;
        const scale = this._fieldScale;
        const mx = this._mouseX, my = this._mouseY;

        // Resize check
        const W = window.innerWidth, H = window.innerHeight;
        const nw = Math.ceil(W / scale), nh = Math.ceil(H / scale);
        if (nw !== this._fieldW || nh !== this._fieldH) {
            this._fieldW = nw;
            this._fieldH = nh;
            this._fieldCanvas.width = nw;
            this._fieldCanvas.height = nh;
        }

        const imageData = fc.createImageData(this._fieldW, this._fieldH);
        const data = imageData.data;
        const levels = this._contourLevels;
        const hue = this.hue;
        const tick = this.tick;
        const intensity = this.intensity;

        // Precompute contour level colors (avoid per-pixel HSL→RGB)
        const maxLevels = levels + 5;
        const levelR = new Uint8Array(maxLevels);
        const levelG = new Uint8Array(maxLevels);
        const levelB = new Uint8Array(maxLevels);
        for (let li = 0; li < maxLevels; li++) {
            const lineHue = ((hue + li * 25 + tick * 0.2) % 360 + 360) % 360;
            const h6 = lineHue / 60;
            const hi = Math.floor(h6) % 6;
            const f = h6 - Math.floor(h6);
            switch (hi) {
                case 0: levelR[li] = 200; levelG[li] = Math.round(f * 200); levelB[li] = 50; break;
                case 1: levelR[li] = Math.round((1-f) * 200); levelG[li] = 200; levelB[li] = 50; break;
                case 2: levelR[li] = 50; levelG[li] = 200; levelB[li] = Math.round(f * 200); break;
                case 3: levelR[li] = 50; levelG[li] = Math.round((1-f) * 200); levelB[li] = 200; break;
                case 4: levelR[li] = Math.round(f * 200); levelG[li] = 50; levelB[li] = 200; break;
                default: levelR[li] = 200; levelG[li] = 50; levelB[li] = Math.round((1-f) * 200); break;
            }
        }

        for (let fy = 0; fy < this._fieldH; fy++) {
            for (let fx = 0; fx < this._fieldW; fx++) {
                const value = this._computeField(fx, fy, mx, my);

                const level = value * levels;
                const frac = level - Math.floor(level);

                const isContour = frac < 0.08 || frac > 0.92;

                const idx = (fy * this._fieldW + fx) * 4;

                if (isContour) {
                    const contourIntensity = frac < 0.08 ? 1 - frac / 0.08 : (frac - 0.92) / 0.08;
                    const levelIdx = Math.max(0, Math.min(maxLevels - 1, Math.floor(level + 0.5)));
                    const alpha = contourIntensity * 160 * intensity;
                    data[idx] = levelR[levelIdx];
                    data[idx + 1] = levelG[levelIdx];
                    data[idx + 2] = levelB[levelIdx];
                    data[idx + 3] = Math.round(Math.min(255, alpha));
                } else {
                    const bandBright = Math.abs(value) * 35;
                    data[idx] = Math.round(bandBright);
                    data[idx + 1] = Math.round(bandBright * 0.8);
                    data[idx + 2] = Math.round(bandBright * 1.3);
                    data[idx + 3] = Math.round(10 * intensity);
                }
            }
        }

        fc.putImageData(imageData, 0, 0);
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw contour field
        if (this._fieldCanvas && this._fieldW > 0) {
            ctx.drawImage(this._fieldCanvas, 0, 0, system.width, system.height);
        }

        // Source markers
        for (const src of this.sources) {
            const fade = src.permanent ? 1 : Math.min(1, src.life / 60);
            const alpha = 0.15 * fade * this.intensity;
            const markerHue = src.type === 'crater' ? (this.hue + 180) % 360 : this.hue;
            ctx.fillStyle = `hsla(${markerHue}, ${this.saturation}%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(src.x, src.y, 4, 0, TAU);
            ctx.fill();

            // Polarity indicator for magnetic mode
            if (this.mode === 1) {
                ctx.fillStyle = `hsla(${markerHue}, 80%, 80%, ${alpha * 0.8})`;
                ctx.font = '12px monospace';
                ctx.fillText(src.polarity > 0 ? 'N' : 'S', src.x + 6, src.y - 6);
            }
        }

        // Wind arrows (weather mode)
        if (this.mode === 2 && this._windArrows) {
            ctx.lineWidth = 0.8;
            for (const arrow of this._windArrows) {
                if (arrow.speed < 0.5) continue;
                const alpha = Math.min(0.2, arrow.speed * 0.02) * this.intensity;
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, ${alpha})`;
                const len = Math.min(25, arrow.speed * 3);
                const ex = arrow.x + Math.cos(arrow.angle) * len;
                const ey = arrow.y + Math.sin(arrow.angle) * len;
                ctx.beginPath();
                ctx.moveTo(arrow.x, arrow.y);
                ctx.lineTo(ex, ey);
                // Arrowhead
                const aLen = 4;
                ctx.lineTo(ex - Math.cos(arrow.angle - 0.4) * aLen,
                    ey - Math.sin(arrow.angle - 0.4) * aLen);
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex - Math.cos(arrow.angle + 0.4) * aLen,
                    ey - Math.sin(arrow.angle + 0.4) * aLen);
                ctx.stroke();
            }
        }

        // Ridge trail glow (ocean floor)
        if (this.mode === 3 && this._ridgeTrail.length > 1) {
            ctx.strokeStyle = `hsla(${(this.hue + 30) % 360}, 70%, 60%, ${0.1 * this.intensity})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this._ridgeTrail[0].x, this._ridgeTrail[0].y);
            for (let i = 1; i < this._ridgeTrail.length; i++) {
                ctx.lineTo(this._ridgeTrail[i].x, this._ridgeTrail[i].y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }
}
