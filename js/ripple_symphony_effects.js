/**
 * @file ripple_symphony_effects.js
 * @description Wave interference patterns from multiple sources that create
 * beautiful moire-like visuals. The cursor acts as a wave emitter, and clicks
 * drop "stones" that create persistent ripple sources. Waves from different
 * sources interfere constructively/destructively producing mesmerizing patterns.
 *
 * Modes:
 * 0 - Pond: Circular water ripples with realistic interference and refraction
 * 1 - Sound Waves: Directional waves emanating from cursor like a speaker cone
 * 2 - Quantum: Double-slit interference pattern that follows cursor
 * 3 - Seismic: P-waves and S-waves with different speeds creating complex patterns
 * 4 - Cymbal: Standing wave patterns on a circular membrane (Chladni figures)
 * 5 - Radar: Rotating sweep beam with echo blips and circular scan lines
 */

const TAU = Math.PI * 2;

export class RippleSymphony {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 60;
        this.intensity = 1;
        this._rng = Math.random;

        // Wave sources
        this.sources = [];
        this.maxSources = 12;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMX = 0;
        this._prevMY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Mode-specific
        this._slitY = 0;
        this._slitGap = 100;
        this._slitWidth = 20;
        this._radarAngle = 0;
        this._radarBlips = [];
        this._blipPool = [];

        // Wave field (low-res for performance)
        this._fieldCanvas = null;
        this._fieldCtx = null;
        this._fieldW = 0;
        this._fieldH = 0;
        this._fieldScale = 4; // 1 pixel = 4 screen pixels

        // Chladni parameters
        this._chladniM = 3;
        this._chladniN = 5;
        this._chladniFreq = 0;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.5 + rng() * 0.6;
        this.tick = 0;
        this.sources = [];
        this._radarBlips = [];

        const W = window.innerWidth, H = window.innerHeight;

        // Set up field canvas (lower resolution for performance)
        this._fieldScale = this.mode === 4 ? 4 : 5;
        this._fieldW = Math.ceil(W / this._fieldScale);
        this._fieldH = Math.ceil(H / this._fieldScale);
        this._fieldCanvas = document.createElement('canvas');
        this._fieldCanvas.width = this._fieldW;
        this._fieldCanvas.height = this._fieldH;
        this._fieldCtx = this._fieldCanvas.getContext('2d', { alpha: true });

        // Place some initial wave sources
        if (this.mode !== 4 && this.mode !== 5) {
            const initSources = 2 + Math.floor(rng() * 3);
            for (let i = 0; i < initSources; i++) {
                this.sources.push({
                    x: rng() * W,
                    y: rng() * H,
                    frequency: 0.02 + rng() * 0.04,
                    amplitude: 0.5 + rng() * 0.5,
                    phase: rng() * TAU,
                    decay: 0.999,
                    born: 0,
                    isDirectional: false,
                    direction: 0,
                    spread: TAU,
                });
            }
        }

        // Mode-specific setup
        if (this.mode === 2) {
            this._slitY = H * 0.4;
            this._slitGap = 60 + rng() * 80;
            this._slitWidth = 10 + rng() * 20;
        }
        if (this.mode === 4) {
            this._chladniM = 2 + Math.floor(rng() * 5);
            this._chladniN = this._chladniM + 1 + Math.floor(rng() * 4);
        }
        if (this.mode === 5) {
            this._radarAngle = 0;
            // Scatter some blip targets
            const blipCount = 8 + Math.floor(rng() * 12);
            for (let i = 0; i < blipCount; i++) {
                this._radarBlips.push({
                    x: rng() * W,
                    y: rng() * H,
                    strength: 0.3 + rng() * 0.7,
                    lastHit: -999,
                    size: 2 + rng() * 4,
                });
            }
        }
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

        // Click drops a new wave source
        if (isClicking && !this._wasClicking) {
            if (this.mode !== 4 && this.mode !== 5) {
                if (this.sources.length >= this.maxSources) {
                    this.sources.shift(); // Remove oldest
                }
                this.sources.push({
                    x: mx, y: my,
                    frequency: 0.03 + this._rng() * 0.03,
                    amplitude: 1,
                    phase: 0,
                    decay: 0.998,
                    born: this.tick,
                    isDirectional: this.mode === 1,
                    direction: Math.atan2(dy, dx),
                    spread: Math.PI * 0.6,
                });
            }
            if (this.mode === 4) {
                // Change Chladni mode numbers
                this._chladniM = 1 + Math.floor(this._rng() * 7);
                this._chladniN = this._chladniM + 1 + Math.floor(this._rng() * 5);
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Decay source amplitudes
        for (let i = this.sources.length - 1; i >= 0; i--) {
            this.sources[i].amplitude *= this.sources[i].decay;
            if (this.sources[i].amplitude < 0.01) {
                this.sources[i] = this.sources[this.sources.length - 1];
                this.sources.pop();
            }
        }

        // Mode 2: slits follow cursor X position
        if (this.mode === 2) {
            this._slitCenterX = mx;
        }

        // Radar rotation
        if (this.mode === 5) {
            this._radarAngle += 0.02;
        }

        // Chladni frequency animation
        if (this.mode === 4) {
            this._chladniFreq += 0.005;
        }

        // Render wave field (throttle to every 2 frames for performance)
        if (this.tick % 2 === 0) {
            this._renderField();
        }
    }

    _renderField() {
        const fc = this._fieldCtx;
        const fw = this._fieldW, fh = this._fieldH;
        const scale = this._fieldScale;

        // Resize check
        const W = window.innerWidth, H = window.innerHeight;
        const nw = Math.ceil(W / scale), nh = Math.ceil(H / scale);
        if (nw !== fw || nh !== fh) {
            this._fieldW = nw;
            this._fieldH = nh;
            this._fieldCanvas.width = nw;
            this._fieldCanvas.height = nh;
        }

        fc.clearRect(0, 0, this._fieldW, this._fieldH);

        if (this.mode === 5) {
            this._renderRadar(fc);
            return;
        }

        if (this.mode === 4) {
            this._renderChladni(fc);
            return;
        }

        // Compute interference at sampled points
        const imageData = fc.createImageData(this._fieldW, this._fieldH);
        const data = imageData.data;
        const tick = this.tick;
        const mx = this._mouseX / scale;
        const my = this._mouseY / scale;
        const sources = this.sources;
        const srcLen = sources.length;

        // Parse hue to RGB for direct pixel manipulation
        const h = this.hue / 60;
        const hFloor = Math.floor(h) % 6;
        const hFrac = h - Math.floor(h);
        let baseR, baseG, baseB;
        switch (hFloor) {
            case 0: baseR = 255; baseG = Math.round(hFrac * 255); baseB = 0; break;
            case 1: baseR = Math.round((1 - hFrac) * 255); baseG = 255; baseB = 0; break;
            case 2: baseR = 0; baseG = 255; baseB = Math.round(hFrac * 255); break;
            case 3: baseR = 0; baseG = Math.round((1 - hFrac) * 255); baseB = 255; break;
            case 4: baseR = Math.round(hFrac * 255); baseG = 0; baseB = 255; break;
            default: baseR = 255; baseG = 0; baseB = Math.round((1 - hFrac) * 255); break;
        }

        // Precompute source positions in field space (avoid division per pixel)
        const srcXs = new Float32Array(srcLen);
        const srcYs = new Float32Array(srcLen);
        const srcFreqs = new Float32Array(srcLen);
        const srcAmps = new Float32Array(srcLen);
        const srcPhases = new Float32Array(srcLen);
        for (let s = 0; s < srcLen; s++) {
            srcXs[s] = sources[s].x / scale;
            srcYs[s] = sources[s].y / scale;
            srcFreqs[s] = sources[s].frequency * scale;
            srcAmps[s] = sources[s].amplitude;
            srcPhases[s] = sources[s].phase;
        }

        const timeFactor = tick * 0.08;
        const timeFactor05 = tick * 0.05;
        const slitY = this.mode === 2 ? this._slitY / scale : 0;
        const halfGap = this.mode === 2 ? this._slitGap / (2 * scale) : 0;
        const slitCX = (this._slitCenterX || this._mouseX) / scale;

        for (let fy = 0; fy < this._fieldH; fy++) {
            for (let fx = 0; fx < this._fieldW; fx++) {
                let wave = 0;

                // Cursor wave source
                const cdx = fx - mx, cdy = fy - my;
                const cDistSq = cdx * cdx + cdy * cdy;
                const cDist = Math.sqrt(cDistSq);
                wave += Math.sin(cDist * 0.15 - timeFactor) * 0.3 / (1 + cDist * 0.02);

                for (let s = 0; s < srcLen; s++) {
                    const sdx = fx - srcXs[s], sdy = fy - srcYs[s];
                    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);

                    let contribution;
                    if (sources[s].isDirectional) {
                        const angle = Math.atan2(sdy, sdx);
                        const angleDiff = Math.abs(((angle - sources[s].direction) + Math.PI) % TAU - Math.PI);
                        const dirFactor = angleDiff < sources[s].spread ? (1 - angleDiff / sources[s].spread) : 0;
                        contribution = Math.sin(sDist * srcFreqs[s] - timeFactor + srcPhases[s]) *
                            srcAmps[s] * dirFactor / (1 + sDist * 0.01);
                    } else if (this.mode === 2) {
                        if (fy > slitY) {
                            const slit1x = slitCX - halfGap, slit2x = slitCX + halfGap;
                            const d1 = Math.sqrt((fx - slit1x) ** 2 + (fy - slitY) ** 2);
                            const d2 = Math.sqrt((fx - slit2x) ** 2 + (fy - slitY) ** 2);
                            contribution = (Math.sin(d1 * srcFreqs[s] - timeFactor05) +
                                Math.sin(d2 * srcFreqs[s] - timeFactor05)) *
                                srcAmps[s] * 0.5 / (1 + Math.min(d1, d2) * 0.005);
                        } else {
                            contribution = Math.sin(sDist * srcFreqs[s] - timeFactor05 + srcPhases[s]) *
                                srcAmps[s] / (1 + sDist * 0.01);
                        }
                    } else if (this.mode === 3) {
                        const age = (tick - sources[s].born) * 0.1;
                        const pWave = Math.sin(sDist * srcFreqs[s] * 1.5 - age * 2 + srcPhases[s]);
                        const sWave = Math.sin(sDist * srcFreqs[s] - age + srcPhases[s]);
                        contribution = (pWave * 0.6 + sWave * 0.4) * srcAmps[s] / (1 + sDist * 0.01);
                    } else {
                        contribution = Math.sin(sDist * srcFreqs[s] - timeFactor05 + srcPhases[s]) *
                            srcAmps[s] / (1 + sDist * 0.01);
                    }

                    wave += contribution;
                }

                // Map wave amplitude to color
                const absWave = Math.abs(wave);
                const sign = wave > 0 ? 1 : -1;
                const brightness = Math.min(1, absWave * 0.8);
                const idx = (fy * this._fieldW + fx) * 4;

                if (sign > 0) {
                    data[idx] = Math.round(baseR * brightness);
                    data[idx + 1] = Math.round(baseG * brightness);
                    data[idx + 2] = Math.round(baseB * brightness);
                } else {
                    // Complementary color for negative waves
                    data[idx] = Math.round((255 - baseR) * brightness * 0.5);
                    data[idx + 1] = Math.round((255 - baseG) * brightness * 0.5);
                    data[idx + 2] = Math.round((255 - baseB) * brightness * 0.5);
                }
                data[idx + 3] = Math.round(brightness * 80 * this.intensity);
            }
        }

        fc.putImageData(imageData, 0, 0);
    }

    _renderChladni(fc) {
        const imageData = fc.createImageData(this._fieldW, this._fieldH);
        const data = imageData.data;
        const m = this._chladniM + Math.sin(this._chladniFreq) * 0.5;
        const n = this._chladniN + Math.cos(this._chladniFreq * 0.7) * 0.5;
        const mx = this._mouseX / this._fieldScale;
        const my = this._mouseY / this._fieldScale;
        const fw = this._fieldW, fh = this._fieldH;

        for (let fy = 0; fy < fh; fy++) {
            const ny = fy / fh;
            for (let fx = 0; fx < fw; fx++) {
                const nx = fx / fw;

                // Chladni pattern: cos(m*pi*x)*cos(n*pi*y) - cos(n*pi*x)*cos(m*pi*y)
                const val = Math.cos(m * Math.PI * nx) * Math.cos(n * Math.PI * ny) -
                    Math.cos(n * Math.PI * nx) * Math.cos(m * Math.PI * ny);

                // Cursor warps the pattern
                const cdx = fx - mx, cdy = fy - my;
                const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
                const warp = cDist < 80 ? (1 - cDist / 80) * 0.2 : 0;

                const brightness = Math.abs(val + warp);
                const isNodal = brightness < 0.1;
                const alpha = isNodal ? 60 : Math.round(brightness * 40);

                const idx = (fy * fw + fx) * 4;
                if (isNodal) {
                    // Nodal lines glow bright
                    data[idx] = 200; data[idx + 1] = 220; data[idx + 2] = 255;
                } else {
                    data[idx] = 40; data[idx + 1] = 60; data[idx + 2] = 120;
                }
                data[idx + 3] = Math.round(alpha * this.intensity);
            }
        }

        fc.putImageData(imageData, 0, 0);
    }

    _renderRadar(fc) {
        const fw = this._fieldW, fh = this._fieldH;
        const scale = this._fieldScale;
        const cx = fw / 2, cy = fh / 2;
        const maxR = Math.min(fw, fh) * 0.48;

        fc.globalCompositeOperation = 'source-over';

        // Radar sweep
        const sweepAngle = this._radarAngle;
        fc.save();
        fc.translate(cx, cy);
        fc.rotate(sweepAngle);

        // Sweep gradient (bright leading edge fading to transparent)
        const grad = fc.createConicGradient(0, 0, 0);
        grad.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 60%, ${0.25 * this.intensity})`);
        grad.addColorStop(0.08, `hsla(${this.hue}, ${this.saturation}%, 40%, ${0.05 * this.intensity})`);
        grad.addColorStop(0.3, 'transparent');
        grad.addColorStop(1, 'transparent');
        fc.fillStyle = grad;
        fc.beginPath();
        fc.arc(0, 0, maxR, 0, TAU);
        fc.fill();
        fc.restore();

        // Range rings
        fc.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 50%, ${0.06 * this.intensity})`;
        fc.lineWidth = 0.5;
        for (let r = 1; r <= 4; r++) {
            fc.beginPath();
            fc.arc(cx, cy, (r / 4) * maxR, 0, TAU);
            fc.stroke();
        }

        // Cross hairs
        fc.beginPath();
        fc.moveTo(cx - maxR, cy); fc.lineTo(cx + maxR, cy);
        fc.moveTo(cx, cy - maxR); fc.lineTo(cx, cy + maxR);
        fc.stroke();

        // Blips
        fc.globalCompositeOperation = 'lighter';
        for (const blip of this._radarBlips) {
            const bx = blip.x / scale, by = blip.y / scale;
            const bdx = bx - cx, bdy = by - cy;
            const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
            if (bDist > maxR) continue;

            const bAngle = Math.atan2(bdy, bdx);
            const angleDiff = ((bAngle - sweepAngle) % TAU + TAU) % TAU;

            // Blip lights up when sweep passes over it
            if (angleDiff < 0.15) {
                blip.lastHit = this.tick;
            }

            const timeSinceHit = this.tick - blip.lastHit;
            if (timeSinceHit < 60) {
                const fade = 1 - timeSinceHit / 60;
                const alpha = fade * blip.strength * 0.5 * this.intensity;
                fc.fillStyle = `hsla(${this.hue}, 80%, 70%, ${alpha})`;
                fc.beginPath();
                fc.arc(bx, by, blip.size + fade * 2, 0, TAU);
                fc.fill();
            }
        }

        // Cursor blip (always bright)
        const cmx = this._mouseX / scale, cmy = this._mouseY / scale;
        const cdist = Math.sqrt((cmx - cx) ** 2 + (cmy - cy) ** 2);
        if (cdist < maxR) {
            fc.fillStyle = `hsla(${(this.hue + 60) % 360}, 90%, 80%, ${0.4 * this.intensity})`;
            fc.beginPath();
            fc.arc(cmx, cmy, 3, 0, TAU);
            fc.fill();
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this._fieldCanvas && this._fieldW > 0) {
            ctx.drawImage(this._fieldCanvas, 0, 0, system.width, system.height);
        }

        // Draw source indicators
        if (this.mode !== 4 && this.mode !== 5) {
            for (const src of this.sources) {
                const alpha = src.amplitude * 0.3 * this.intensity;
                ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 80%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(src.x, src.y, 3, 0, TAU);
                ctx.fill();

                // Expanding ring indicator
                const ringR = ((this.tick - src.born) * 2) % 60;
                const ringAlpha = (1 - ringR / 60) * alpha * 0.5;
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${ringAlpha})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(src.x, src.y, ringR, 0, TAU);
                ctx.stroke();
            }
        }

        // Double slit visualization
        if (this.mode === 2) {
            const slitY = this._slitY;
            const halfGap = this._slitGap / 2;
            const slitW = this._slitWidth;
            ctx.fillStyle = `hsla(${this.hue}, 30%, 30%, ${0.15 * this.intensity})`;
            // Left barrier
            ctx.fillRect(0, slitY - 2, system.width / 2 - halfGap - slitW / 2, 4);
            // Middle barrier
            ctx.fillRect(system.width / 2 - halfGap + slitW / 2, slitY - 2,
                this._slitGap - slitW, 4);
            // Right barrier
            ctx.fillRect(system.width / 2 + halfGap + slitW / 2, slitY - 2,
                system.width / 2 - halfGap - slitW / 2, 4);
        }

        ctx.restore();
    }
}
