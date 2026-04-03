/**
 * @file holographic_foil_effects.js
 * @description Iridescent holographic shimmer effect like holographic trading cards or
 * credit card security foils. The effect creates rainbow prismatic patterns that shift
 * color based on cursor position (simulating viewing angle). Clicking creates "scratch"
 * reveals that expose hidden holographic patterns beneath. Dragging the mouse leaves
 * a shimmering wake trail. Holding the mouse intensifies the iridescence.
 *
 * Modes:
 * 0 - Trading Card: Diagonal stripe shimmer that shifts rainbow colors with mouse angle
 * 1 - Oil Slick: Organic blobby iridescent patches that flow and merge like oil on water
 * 2 - Diffraction Grating: Precise parallel lines creating spectral decomposition
 * 3 - Butterfly Wing: Fractal-like scales with structural color that shifts per-cell
 * 4 - Soap Film: Thin-film interference with Newton's rings expanding from click points
 * 5 - Holographic Sticker: Grid of tiny holographic cells each reflecting differently
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class HolographicFoil {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._mouseSpeed = 0;

        // Shimmer parameters
        this._stripeAngle = 0;
        this._stripeSpacing = 20;
        this._shimmerSpeed = 1;
        this._rainbowSpread = 1;

        // Oil slick blobs
        this._blobs = [];

        // Click reveals (Newton's rings)
        this._rings = [];
        this._ringPool = [];

        // Shimmer wake trail from mouse movement
        this._wakeTrail = [];
        this._maxWakePoints = 30;

        // Butterfly scales
        this._scaleSize = 0;
        this._scaleRows = 0;
        this._scaleCols = 0;

        // Holographic grid cells
        this._cellSize = 0;
        this._gridPhase = 0;

        // Hold intensity buildup
        this._holdIntensity = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 0;
        this.intensity = 0.4 + rng() * 0.6;
        this._rings = [];
        this._blobs = [];
        this._wakeTrail = [];
        this._holdIntensity = 0;

        this._stripeAngle = rng() * Math.PI;
        this._stripeSpacing = 12 + rng() * 30;
        this._shimmerSpeed = 0.5 + rng() * 2;
        this._rainbowSpread = 0.5 + rng() * 1.5;
        this._gridPhase = rng() * TAU;

        const W = window.innerWidth, H = window.innerHeight;

        if (this.mode === 1) {
            const count = 5 + Math.floor(rng() * 8);
            for (let i = 0; i < count; i++) {
                this._blobs.push({
                    x: rng() * W,
                    y: rng() * H,
                    vx: (rng() - 0.5) * 0.5,
                    vy: (rng() - 0.5) * 0.5,
                    radius: 60 + rng() * 140,
                    phase: rng() * TAU,
                    phaseSpeed: 0.005 + rng() * 0.02,
                    hueOffset: rng() * 360,
                });
            }
        }

        if (this.mode === 3) {
            this._scaleSize = 20 + Math.floor(rng() * 20);
            this._scaleCols = Math.ceil(W / this._scaleSize) + 1;
            this._scaleRows = Math.ceil(H / (this._scaleSize * 0.866)) + 1;
        }

        if (this.mode === 5) {
            this._cellSize = 30 + Math.floor(rng() * 40);
        }
    }

    update(mx, my, isClicking, system) {
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._wasClicking = this._isClicking;
        this._isClicking = isClicking;
        this.tick++;

        // Track mouse speed
        const dx = mx - this._pmx;
        const dy = my - this._pmy;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        // Hold intensity: builds up while clicking, decays when released
        if (isClicking) {
            this._holdIntensity = Math.min(1, this._holdIntensity + 0.02);
        } else {
            this._holdIntensity *= 0.95;
        }

        // Click spawns Newton's rings
        if (this._isClicking && !this._wasClicking) {
            if (this._rings.length < 8) {
                const ring = this._ringPool.length > 0 ? this._ringPool.pop() : {};
                ring.x = mx;
                ring.y = my;
                ring.radius = 0;
                ring.maxRadius = 150 + _prand(this.tick * 31) * 150;
                ring.life = 1;
                ring.ringCount = 5 + Math.floor(_prand(this.tick * 47) * 8);
                this._rings.push(ring);
            }
        }

        // Update rings
        for (let i = this._rings.length - 1; i >= 0; i--) {
            const r = this._rings[i];
            r.radius += 2;
            r.life = Math.max(0, 1 - r.radius / r.maxRadius);
            if (r.life <= 0) {
                this._ringPool.push(r);
                this._rings[i] = this._rings[this._rings.length - 1];
                this._rings.pop();
            }
        }

        // Shimmer wake trail: record mouse positions when moving fast
        if (this._mouseSpeed > 3) {
            if (this._wakeTrail.length < this._maxWakePoints) {
                this._wakeTrail.push({ x: mx, y: my, life: 40, speed: this._mouseSpeed });
            } else {
                // Ring buffer overwrite
                const oldest = this._wakeTrail.reduce((a, b) => a.life < b.life ? a : b);
                oldest.x = mx;
                oldest.y = my;
                oldest.life = 40;
                oldest.speed = this._mouseSpeed;
            }
        }
        // Decay wake trail
        for (let i = this._wakeTrail.length - 1; i >= 0; i--) {
            this._wakeTrail[i].life--;
            if (this._wakeTrail[i].life <= 0) {
                this._wakeTrail[i] = this._wakeTrail[this._wakeTrail.length - 1];
                this._wakeTrail.pop();
            }
        }

        // Update oil blobs
        if (this.mode === 1) {
            const W = window.innerWidth, H = window.innerHeight;
            for (const b of this._blobs) {
                b.x += b.vx;
                b.y += b.vy;
                b.phase += b.phaseSpeed;
                // Mouse interaction: repel normally, attract while holding
                const bDx = b.x - mx;
                const bDy = b.y - my;
                const distSq = bDx * bDx + bDy * bDy;
                if (distSq < 40000 && distSq > 1) { // 200px
                    const dist = Math.sqrt(distSq);
                    const dir = this._holdIntensity > 0.3 ? -1 : 1; // Attract when holding
                    b.vx += (bDx / dist) * 0.1 * dir;
                    b.vy += (bDy / dist) * 0.1 * dir;
                }
                b.vx *= 0.98;
                b.vy *= 0.98;
                if (b.x < -b.radius) b.x = W + b.radius;
                if (b.x > W + b.radius) b.x = -b.radius;
                if (b.y < -b.radius) b.y = H + b.radius;
                if (b.y > H + b.radius) b.y = -b.radius;
            }
        }
    }

    draw(ctx, system) {
        const W = system.width;
        const H = system.height;
        const mx = this._mx;
        const my = this._my;
        const viewAngle = Math.atan2(my - H / 2, mx - W / 2);
        const viewDist = Math.sqrt((mx - W / 2) ** 2 + (my - H / 2) ** 2) / Math.max(W, H);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Holding intensifies the effect
        ctx.globalAlpha = this.intensity * (0.3 + this._holdIntensity * 0.25);

        if (this.mode === 0) {
            this._drawTradingCard(ctx, W, H, viewAngle, viewDist);
        } else if (this.mode === 1) {
            this._drawOilSlick(ctx, W, H, viewAngle);
        } else if (this.mode === 2) {
            this._drawDiffraction(ctx, W, H, mx, my);
        } else if (this.mode === 3) {
            this._drawButterflyWing(ctx, W, H, mx, my, viewAngle);
        } else if (this.mode === 4) {
            this._drawSoapFilm(ctx, W, H, mx, my);
        } else if (this.mode === 5) {
            this._drawHolographicSticker(ctx, W, H, mx, my, viewAngle);
        }

        // Draw shimmer wake trail (all modes)
        this._drawWakeTrail(ctx);

        // Draw Newton's rings from clicks (all modes)
        this._drawRings(ctx);

        ctx.restore();
    }

    _drawTradingCard(ctx, W, H, viewAngle, viewDist) {
        const cos = Math.cos(this._stripeAngle);
        const sin = Math.sin(this._stripeAngle);
        const timeShift = this.tick * this._shimmerSpeed * 0.5;
        const angleShift = viewAngle * 60 * this._rainbowSpread;
        const step = Math.max(4, Math.floor(this._stripeSpacing / 2));
        const diag = Math.sqrt(W * W + H * H);

        // Batch stripes by hue band to reduce strokeStyle changes
        const bandCount = 6;
        for (let band = 0; band < bandCount; band++) {
            const bandHue = (band / bandCount) * 360;
            ctx.beginPath();
            let bandAlpha = 0;
            let lineCount = 0;

            for (let d = -diag; d < diag * 2; d += step) {
                const proj = d + timeShift + angleShift;
                const hue = ((proj * 2) % 360 + 360) % 360;
                // Check if this stripe belongs to this band
                const hueDist = Math.abs(hue - bandHue);
                if (hueDist > 360 / bandCount && hueDist < 360 - 360 / bandCount) continue;

                const brightness = 0.3 + 0.2 * Math.sin(proj * 0.1 + viewDist * 10);
                bandAlpha += brightness;
                lineCount++;

                const x1 = d * cos - diag * sin;
                const y1 = d * sin + diag * cos;
                const x2 = d * cos + diag * sin;
                const y2 = d * sin - diag * cos;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }

            if (lineCount > 0) {
                ctx.strokeStyle = `hsla(${bandHue}, 90%, 65%, ${bandAlpha / lineCount})`;
                ctx.lineWidth = step * 0.6;
                ctx.stroke();
            }
        }
    }

    _drawOilSlick(ctx, W, H, viewAngle) {
        for (const b of this._blobs) {
            const hue = (b.hueOffset + viewAngle * 30 + this.tick * 0.5) % 360;
            const pulse = 1 + 0.15 * Math.sin(b.phase);
            const r = b.radius * pulse;

            const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
            g.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.15)`);
            g.addColorStop(0.3, `hsla(${(hue + 60) % 360}, 90%, 60%, 0.1)`);
            g.addColorStop(0.6, `hsla(${(hue + 120) % 360}, 85%, 55%, 0.08)`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, TAU);
            ctx.fill();

            // Interference rings inside blob
            ctx.lineWidth = 1.5;
            for (let i = 1; i <= 3; i++) {
                const ringR = r * (i / 4);
                const ringHue = (hue + i * 40 + this.tick * 2) % 360;
                ctx.strokeStyle = `hsla(${ringHue}, 90%, 65%, 0.12)`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, ringR, 0, TAU);
                ctx.stroke();
            }
        }
    }

    _drawDiffraction(ctx, W, H, mx, my) {
        // Batch lines by proximity band to reduce strokeStyle changes
        const bands = [
            { minDist: 0, maxDist: 100, alpha: 0.25 },
            { minDist: 100, maxDist: 200, alpha: 0.12 },
            { minDist: 200, maxDist: 300, alpha: 0.06 },
        ];

        ctx.lineWidth = 1;
        for (const band of bands) {
            ctx.beginPath();
            let avgHue = 0;
            let count = 0;
            for (let i = 0; i < H; i += 6) {
                const distToMouse = Math.abs(i - my);
                if (distToMouse < band.minDist || distToMouse >= band.maxDist) continue;
                const proximity = Math.max(0, 1 - distToMouse / 300);
                const xOffset = mx - W / 2;
                const hue = ((i * 4 + xOffset * 0.3 + this.tick * this._shimmerSpeed) % 360 + 360) % 360;
                avgHue += hue;
                count++;
                const wave = proximity * Math.sin(i * 0.1 + this.tick * 0.05) * 10;
                ctx.moveTo(0, i + wave);
                ctx.lineTo(W, i - wave);
            }
            if (count > 0) {
                ctx.strokeStyle = `hsla(${avgHue / count}, 95%, 60%, ${band.alpha})`;
                ctx.stroke();
            }
        }

        // Far-field dim lines (no per-line style change)
        ctx.strokeStyle = `hsla(${(this.tick * this._shimmerSpeed) % 360}, 80%, 50%, 0.03)`;
        ctx.beginPath();
        for (let i = 0; i < H; i += 6) {
            if (Math.abs(i - my) < 300) continue;
            ctx.moveTo(0, i);
            ctx.lineTo(W, i);
        }
        ctx.stroke();
    }

    _drawButterflyWing(ctx, W, H, mx, my, viewAngle) {
        const s = this._scaleSize;
        const halfS = s / 2;
        // Precompute hex vertices (normalized)
        const hexCos = [];
        const hexSin = [];
        for (let v = 0; v < 6; v++) {
            const angle = (v / 6) * TAU - Math.PI / 6;
            hexCos[v] = Math.cos(angle) * halfS;
            hexSin[v] = Math.sin(angle) * halfS;
        }

        for (let row = 0; row < this._scaleRows; row++) {
            const yOff = row % 2 === 0 ? 0 : halfS;
            for (let col = 0; col < this._scaleCols; col++) {
                const cx = col * s + yOff;
                const cy = row * s * 0.866;

                // Use distSq for proximity check, only sqrt for close cells
                const cdx = cx - mx;
                const cdy = cy - my;
                const distSq = cdx * cdx + cdy * cdy;
                if (distSq > 160000) continue; // Skip cells > 400px away (invisible)

                const dist = Math.sqrt(distSq);
                const proximity = Math.max(0, 1 - dist / 400);

                const cellSeed = row * 1000 + col;
                const baseHue = _prand(cellSeed) * 360;
                const hue = (baseHue + viewAngle * 40 + proximity * 60 + this.tick * 0.3) % 360;
                const alpha = 0.03 + proximity * 0.12;

                ctx.fillStyle = `hsla(${hue}, ${70 + proximity * 25}%, ${30 + proximity * 30}%, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(cx + hexCos[0], cy + hexSin[0]);
                for (let v = 1; v < 6; v++) {
                    ctx.lineTo(cx + hexCos[v], cy + hexSin[v]);
                }
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    _drawSoapFilm(ctx, W, H, mx, my) {
        // Thin-film interference - use larger grid step and batch by hue
        const gridStep = 10;
        const t = this.tick * 0.02;

        // Use 6 hue buckets for batching
        const buckets = [];
        for (let b = 0; b < 6; b++) buckets.push({ hue: b * 60, rects: [] });

        for (let x = 0; x < W; x += gridStep) {
            for (let y = 0; y < H; y += gridStep) {
                const dx = x - mx;
                const dy = y - my;
                // Use fast distance approximation for the wave pattern
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);

                const wave1 = Math.sin(dist * 0.03 - t * 2);
                const wave2 = Math.sin(x * 0.02 + y * 0.01 + t);
                // Mouse proximity adds extra interference ripple
                const mouseWave = distSq < 90000 ? Math.sin(dist * 0.08 + t * 3) * (1 - dist / 300) * 0.5 : 0;
                const interference = (wave1 + wave2 + mouseWave) * 0.5;

                const alpha = Math.abs(interference) * 0.08;
                if (alpha < 0.015) continue;

                const hue = ((interference * 180 + 180 + this.hue) % 360 + 360) % 360;
                const bucketIdx = Math.floor(hue / 60) % 6;
                buckets[bucketIdx].rects.push(x, y);
            }
        }

        // Draw each bucket with a single fillStyle
        for (const bucket of buckets) {
            if (bucket.rects.length === 0) continue;
            ctx.fillStyle = `hsla(${bucket.hue + 30}, 90%, 60%, 0.06)`;
            ctx.beginPath();
            for (let i = 0; i < bucket.rects.length; i += 2) {
                ctx.rect(bucket.rects[i], bucket.rects[i + 1], gridStep, gridStep);
            }
            ctx.fill();
        }
    }

    _drawHolographicSticker(ctx, W, H, mx, my, viewAngle) {
        const cs = this._cellSize;
        const cols = Math.ceil(W / cs) + 1;
        const rows = Math.ceil(H / cs) + 1;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * cs;
                const y = row * cs;

                const dx = x + cs / 2 - mx;
                const dy = y + cs / 2 - my;
                const distSq = dx * dx + dy * dy;

                const angle = Math.atan2(dy, dx);
                const cellPhase = _prand(row * 500 + col + 7) * TAU;
                const reflectAngle = angle + cellPhase + this._gridPhase;

                const angleDiff = Math.abs(reflectAngle - viewAngle) % TAU;
                const hue = (angleDiff * 57.3 * 3 + this.tick * 0.5) % 360;

                const catchLight = Math.cos(angleDiff) * 0.5 + 0.5;
                const proximity = distSq < 250000 ? Math.max(0, 1 - Math.sqrt(distSq) / 500) : 0;
                const alpha = (0.02 + catchLight * 0.08 + proximity * 0.05) * this.intensity;

                if (alpha > 0.01) {
                    ctx.fillStyle = `hsla(${hue}, 85%, ${45 + catchLight * 30}%, ${alpha})`;
                    ctx.fillRect(x, y, cs - 1, cs - 1);
                }
            }
        }
    }

    _drawWakeTrail(ctx) {
        if (this._wakeTrail.length < 2) return;
        for (const wp of this._wakeTrail) {
            const alpha = (wp.life / 40) * 0.2;
            const hue = (this.hue + wp.life * 8 + this.tick) % 360;
            const r = 5 + wp.speed * 0.5;
            ctx.fillStyle = `hsla(${hue}, 90%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(wp.x, wp.y, r, 0, TAU);
            ctx.fill();
            // Rainbow ring
            ctx.strokeStyle = `hsla(${(hue + 90) % 360}, 85%, 65%, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(wp.x, wp.y, r * 1.5, 0, TAU);
            ctx.stroke();
        }
    }

    _drawRings(ctx) {
        for (const r of this._rings) {
            // Batch all rings for this click into a single path per hue
            ctx.lineWidth = 2;
            for (let i = 0; i < r.ringCount; i++) {
                const ringR = r.radius * (i + 1) / r.ringCount;
                const hue = (i * 50 + this.tick * 2 + this.hue) % 360;
                ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${r.life * 0.3})`;
                ctx.beginPath();
                ctx.arc(r.x, r.y, ringR, 0, TAU);
                ctx.stroke();
            }
        }
    }
}
