/**
 * @file liquid_metal_effects.js
 * @description Metallic metaball blobs that merge, split, and flow.
 * Cursor attracts/repels blobs; clicks spawn new ones; idle blobs wander.
 * Seed controls: blob count, metal type (gold/silver/chrome/copper/iridescent),
 * viscosity, merge threshold, glow color, and surface texture style.
 *
 * Performance: reuses ImageData, precomputes HSL-to-RGB LUT, skips pixels
 * outside blob bounding boxes.
 */

export class LiquidMetal {
    constructor() {
        this._blobs = [];
        this._metalType = 0;
        this._viscosity = 0.9;
        this._baseHue = 40;
        this._surfaceStyle = 0; // 0=smooth, 1=rippled, 2=crystalline
        this._attractStrength = 1;
        this._tick = 0;
        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;

        // Offscreen metaball computation
        this._mbCanvas = null;
        this._mbCtx = null;
        this._imageData = null;
        this._resolution = 4;

        // Precomputed color LUT (256 entries, avoids per-pixel HSL conversion)
        this._colorLUT = null;
    }

    configure(rng, hues) {
        this._tick = 0;
        this._metalType = Math.floor(rng() * 5); // 0=gold, 1=silver, 2=chrome, 3=copper, 4=iridescent
        this._viscosity = 0.85 + rng() * 0.1;
        this._baseHue = hues.length > 0 ? hues[0].h : this._getMetalBaseHue(rng);
        this._surfaceStyle = Math.floor(rng() * 3);
        this._attractStrength = 0.5 + rng() * 2;
        this._resolution = 3 + Math.floor(rng() * 3);

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Initialize blobs
        const blobCount = 8 + Math.floor(rng() * 12);
        this._blobs = [];
        for (let i = 0; i < blobCount; i++) {
            const baseRadius = 30 + rng() * 60;
            this._blobs.push({
                x: rng() * w,
                y: rng() * h,
                vx: (rng() - 0.5) * 2,
                vy: (rng() - 0.5) * 2,
                radius: baseRadius,
                baseRadius,
                phase: rng() * Math.PI * 2,
                pulseSpeed: 0.02 + rng() * 0.04,
                wanderAngle: rng() * Math.PI * 2,
                wanderSpeed: 0.02 + rng() * 0.03,
                hueOffset: (rng() - 0.5) * 30,
            });
        }

        // Metaball offscreen canvas
        if (!this._mbCanvas) {
            this._mbCanvas = document.createElement('canvas');
            this._mbCtx = this._mbCanvas.getContext('2d', { willReadFrequently: true });
        }
        const mbW = Math.ceil(w / this._resolution);
        const mbH = Math.ceil(h / this._resolution);
        this._mbCanvas.width = mbW;
        this._mbCanvas.height = mbH;
        // Reuse ImageData between frames
        this._imageData = this._mbCtx.createImageData(mbW, mbH);

        // Build color LUT for the metal type
        this._buildColorLUT();
    }

    _getMetalBaseHue(rng) {
        switch (this._metalType) {
            case 0: return 40 + rng() * 15;   // gold
            case 1: return 210 + rng() * 20;  // silver
            case 2: return 200 + rng() * 30;  // chrome
            case 3: return 15 + rng() * 15;   // copper
            case 4: return 0;                   // iridescent (hue varies per pixel)
            default: return 40;
        }
    }

    _buildColorLUT() {
        // 256 entries mapping intensity (0-255) to [r, g, b]
        this._colorLUT = new Uint8Array(256 * 3);
        const sat = this._metalType === 1 ? 10 : 60;
        for (let i = 0; i < 256; i++) {
            const intensity = i / 255;
            const lightness = 30 + intensity * 35;
            const rgb = this._hslToRgb(this._baseHue, sat, lightness);
            this._colorLUT[i * 3] = rgb.r;
            this._colorLUT[i * 3 + 1] = rgb.g;
            this._colorLUT[i * 3 + 2] = rgb.b;
        }
    }

    // Tick-based pseudo-random
    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._isClicking = isClicking;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Resize if needed
        const mbW = Math.ceil(w / this._resolution);
        const mbH = Math.ceil(h / this._resolution);
        if (this._mbCanvas && (this._mbCanvas.width !== mbW || this._mbCanvas.height !== mbH)) {
            this._mbCanvas.width = mbW;
            this._mbCanvas.height = mbH;
            this._imageData = this._mbCtx.createImageData(mbW, mbH);
        }

        // Spawn blob on click - tick-based RNG
        if (isClicking && this._tick % 20 === 0 && this._blobs.length < 30) {
            const seed = this._tick * 7 + 41;
            const mouseVx = mx - this._pmx;
            const mouseVy = my - this._pmy;
            const baseRadius = 20 + this._prand(seed) * 30;
            this._blobs.push({
                x: mx,
                y: my,
                vx: mouseVx * 0.3 + (this._prand(seed + 1) - 0.5) * 3,
                vy: mouseVy * 0.3 + (this._prand(seed + 2) - 0.5) * 3,
                radius: baseRadius,
                baseRadius,
                phase: this._prand(seed + 3) * Math.PI * 2,
                pulseSpeed: 0.02 + this._prand(seed + 4) * 0.04,
                wanderAngle: this._prand(seed + 5) * Math.PI * 2,
                wanderSpeed: 0.02 + this._prand(seed + 6) * 0.03,
                hueOffset: (this._prand(seed + 7) - 0.5) * 30,
            });
        }

        // Physics update with mouse speed affecting attraction strength
        const dynamicAttract = this._attractStrength * (1 + this._mouseSpeed * 0.01);

        for (let bi = 0; bi < this._blobs.length; bi++) {
            const blob = this._blobs[bi];

            // Cursor attraction/repulsion
            const dx = mx - blob.x;
            const dy = my - blob.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 1 && distSq < 160000) { // 400^2
                const dist = Math.sqrt(distSq);
                const force = dynamicAttract / (dist * 0.1);
                const nx = dx / dist;
                const ny = dy / dist;
                if (isClicking) {
                    blob.vx -= nx * force * 0.5;
                    blob.vy -= ny * force * 0.5;
                } else {
                    blob.vx += nx * force * 0.2;
                    blob.vy += ny * force * 0.2;
                }
            }

            // Wander behavior - tick-based
            blob.wanderAngle += (this._prand(this._tick * 13 + bi * 7) - 0.5) * blob.wanderSpeed;
            blob.vx += Math.cos(blob.wanderAngle) * 0.1;
            blob.vy += Math.sin(blob.wanderAngle) * 0.1;

            // Viscosity
            blob.vx *= this._viscosity;
            blob.vy *= this._viscosity;

            // Move
            blob.x += blob.vx;
            blob.y += blob.vy;

            // Pulse radius
            blob.phase += blob.pulseSpeed;
            blob.radius = blob.baseRadius + Math.sin(blob.phase) * blob.baseRadius * 0.2;

            // Bounce off edges
            if (blob.x < blob.radius) { blob.x = blob.radius; blob.vx *= -0.5; }
            if (blob.x > w - blob.radius) { blob.x = w - blob.radius; blob.vx *= -0.5; }
            if (blob.y < blob.radius) { blob.y = blob.radius; blob.vy *= -0.5; }
            if (blob.y > h - blob.radius) { blob.y = h - blob.radius; blob.vy *= -0.5; }

            // Blob-blob soft repulsion (only check later blobs to avoid double-counting)
            for (let bj = bi + 1; bj < this._blobs.length; bj++) {
                const other = this._blobs[bj];
                const bDx = blob.x - other.x;
                const bDy = blob.y - other.y;
                const bDistSq = bDx * bDx + bDy * bDy;
                const minDist = (blob.radius + other.radius) * 0.4;
                if (bDistSq < minDist * minDist && bDistSq > 0) {
                    const bDist = Math.sqrt(bDistSq);
                    const push = (minDist - bDist) * 0.01;
                    const pnx = bDx / bDist;
                    const pny = bDy / bDist;
                    blob.vx += pnx * push;
                    blob.vy += pny * push;
                    other.vx -= pnx * push;
                    other.vy -= pny * push;
                }
            }
        }

        // Cap blobs
        while (this._blobs.length > 30) this._blobs.pop();
    }

    draw(ctx, system) {
        if (this._blobs.length === 0 || !this._mbCanvas || !this._imageData) return;

        const w = system.width || window.innerWidth;
        const h = system.height || window.innerHeight;
        const res = this._resolution;
        const mbW = this._mbCanvas.width;
        const mbH = this._mbCanvas.height;
        const data = this._imageData.data;
        const lut = this._colorLUT;
        const isIridescent = this._metalType === 4;
        const surfStyle = this._surfaceStyle;
        const tick = this._tick;

        // Compute bounding box of all blobs in low-res space for early-out
        let minBX = mbW, minBY = mbH, maxBX = 0, maxBY = 0;
        for (const blob of this._blobs) {
            const r = blob.radius * 2.5; // influence extends beyond radius
            const lx = Math.max(0, Math.floor((blob.x - r) / res));
            const ly = Math.max(0, Math.floor((blob.y - r) / res));
            const hx = Math.min(mbW - 1, Math.ceil((blob.x + r) / res));
            const hy = Math.min(mbH - 1, Math.ceil((blob.y + r) / res));
            if (lx < minBX) minBX = lx;
            if (ly < minBY) minBY = ly;
            if (hx > maxBX) maxBX = hx;
            if (hy > maxBY) maxBY = hy;
        }

        // Clear the image data in the active region
        for (let py = minBY; py <= maxBY; py++) {
            const rowBase = py * mbW;
            for (let px = minBX; px <= maxBX; px++) {
                const idx = (rowBase + px) * 4;
                data[idx + 3] = 0;
            }
        }

        // Compute metaball field only within bounding box
        for (let py = minBY; py <= maxBY; py++) {
            const worldY = py * res;
            const rowBase = py * mbW;
            for (let px = minBX; px <= maxBX; px++) {
                const worldX = px * res;
                let sum = 0;

                for (const blob of this._blobs) {
                    const dx = worldX - blob.x;
                    const dy = worldY - blob.y;
                    sum += (blob.radius * blob.radius) / (dx * dx + dy * dy + 1);
                }

                if (sum > 1.0) {
                    const intensity = Math.min(1, (sum - 1) * 2);
                    const highlight = Math.min(1, Math.max(0, sum - 1.5) * 3);
                    const idx = (rowBase + px) * 4;

                    let r, g, b;
                    if (isIridescent) {
                        // Per-pixel hue shift for iridescent
                        const hue = (worldX * 0.2 + worldY * 0.1 + tick * 0.5) % 360;
                        const rgb = this._hslToRgb(hue, 60, 30 + intensity * 35);
                        r = rgb.r; g = rgb.g; b = rgb.b;
                    } else {
                        // Use LUT for fast color lookup
                        const lutIdx = Math.min(255, (intensity * 255) | 0) * 3;
                        r = lut[lutIdx];
                        g = lut[lutIdx + 1];
                        b = lut[lutIdx + 2];
                    }

                    // Specular highlight
                    r = Math.min(255, r + highlight * 200);
                    g = Math.min(255, g + highlight * 200);
                    b = Math.min(255, b + highlight * 200);

                    // Rim lighting: boost brightness at metaball edges
                    if (sum < 1.3) {
                        const rim = (1.3 - sum) / 0.3;
                        r = Math.min(255, r + rim * 80);
                        g = Math.min(255, g + rim * 80);
                        b = Math.min(255, b + rim * 80);
                    }

                    // Surface texture
                    if (surfStyle === 1) {
                        const ripple = Math.sin(worldX * 0.05 + worldY * 0.05 + tick * 0.05) * 20;
                        r = Math.min(255, Math.max(0, r + ripple));
                        g = Math.min(255, Math.max(0, g + ripple));
                        b = Math.min(255, Math.max(0, b + ripple));
                    } else if (surfStyle === 2) {
                        const facet = Math.abs(Math.sin(worldX * 0.1) * Math.cos(worldY * 0.1)) * 40;
                        r = Math.min(255, Math.max(0, r + facet));
                        g = Math.min(255, Math.max(0, g + facet));
                        b = Math.min(255, Math.max(0, b + facet));
                    }

                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = Math.min(255, intensity * 220);
                }
            }
        }

        this._mbCtx.putImageData(this._imageData, 0, 0);

        // Draw scaled up to main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this._mbCanvas, 0, 0, w, h);
        ctx.restore();
    }

    _hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        if (s === 0) {
            const v = (l * 255 + 0.5) | 0;
            return { r: v, g: v, b: v };
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        return {
            r: (hue2rgb(p, q, h + 1/3) * 255 + 0.5) | 0,
            g: (hue2rgb(p, q, h) * 255 + 0.5) | 0,
            b: (hue2rgb(p, q, h - 1/3) * 255 + 0.5) | 0,
        };
    }
}
