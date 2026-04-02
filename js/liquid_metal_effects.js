/**
 * @file liquid_metal_effects.js
 * @description Metallic metaball blobs that merge, split, and flow.
 * Cursor attracts/repels blobs; clicks spawn new ones; idle blobs wander.
 * Seed controls: blob count, metal type (gold/silver/chrome/copper/iridescent),
 * viscosity, merge threshold, glow color, and surface texture style.
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

        // Offscreen metaball computation
        this._mbCanvas = null;
        this._mbCtx = null;
        this._resolution = 4; // pixel skip for metaball field
    }

    configure(rng, hues) {
        this._tick = 0;
        this._metalType = Math.floor(rng() * 5); // 0=gold, 1=silver, 2=chrome, 3=copper, 4=iridescent
        this._viscosity = 0.85 + rng() * 0.1;
        this._baseHue = hues.length > 0 ? hues[0].h : this._getMetalBaseHue(rng);
        this._surfaceStyle = Math.floor(rng() * 3);
        this._attractStrength = 0.5 + rng() * 2;
        this._resolution = 3 + Math.floor(rng() * 3); // 3-5 pixel skip

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Initialize blobs
        const blobCount = 8 + Math.floor(rng() * 12); // 8-19
        this._blobs = [];
        for (let i = 0; i < blobCount; i++) {
            this._blobs.push({
                x: rng() * w,
                y: rng() * h,
                vx: (rng() - 0.5) * 2,
                vy: (rng() - 0.5) * 2,
                radius: 30 + rng() * 60,
                baseRadius: 30 + rng() * 60,
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
        this._mbCanvas.width = Math.ceil(w / this._resolution);
        this._mbCanvas.height = Math.ceil(h / this._resolution);
    }

    _getMetalBaseHue(rng) {
        switch (this._metalType) {
            case 0: return 40 + rng() * 15;   // gold
            case 1: return 210 + rng() * 20;  // silver
            case 2: return 200 + rng() * 30;  // chrome
            case 3: return 15 + rng() * 15;   // copper
            case 4: return rng() * 360;        // iridescent
            default: return 40;
        }
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._isClicking = isClicking;

        const w = window.innerWidth;
        const h = window.innerHeight;

        if (this._mbCanvas && (this._mbCanvas.width !== Math.ceil(w / this._resolution) ||
            this._mbCanvas.height !== Math.ceil(h / this._resolution))) {
            this._mbCanvas.width = Math.ceil(w / this._resolution);
            this._mbCanvas.height = Math.ceil(h / this._resolution);
        }

        // Spawn blob on click
        if (isClicking && this._tick % 20 === 0 && this._blobs.length < 30) {
            const mouseVx = mx - this._pmx;
            const mouseVy = my - this._pmy;
            this._blobs.push({
                x: mx,
                y: my,
                vx: mouseVx * 0.3 + (Math.random() - 0.5) * 3,
                vy: mouseVy * 0.3 + (Math.random() - 0.5) * 3,
                radius: 20 + Math.random() * 30,
                baseRadius: 20 + Math.random() * 30,
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.02 + Math.random() * 0.04,
                wanderAngle: Math.random() * Math.PI * 2,
                wanderSpeed: 0.02 + Math.random() * 0.03,
                hueOffset: (Math.random() - 0.5) * 30,
            });
        }

        for (const blob of this._blobs) {
            // Cursor attraction/repulsion
            const dx = mx - blob.x;
            const dy = my - blob.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1 && dist < 400) {
                const force = this._attractStrength / (dist * 0.1);
                if (isClicking) {
                    // Repel on click
                    blob.vx -= (dx / dist) * force * 0.5;
                    blob.vy -= (dy / dist) * force * 0.5;
                } else {
                    // Attract on hover
                    blob.vx += (dx / dist) * force * 0.2;
                    blob.vy += (dy / dist) * force * 0.2;
                }
            }

            // Wander behavior
            blob.wanderAngle += (Math.random() - 0.5) * blob.wanderSpeed;
            blob.vx += Math.cos(blob.wanderAngle) * 0.1;
            blob.vy += Math.sin(blob.wanderAngle) * 0.1;

            // Apply viscosity
            blob.vx *= this._viscosity;
            blob.vy *= this._viscosity;

            // Move
            blob.x += blob.vx;
            blob.y += blob.vy;

            // Pulse radius
            blob.phase += blob.pulseSpeed;
            blob.radius = blob.baseRadius + Math.sin(blob.phase) * blob.baseRadius * 0.2;

            // Bounce off edges with damping
            if (blob.x < blob.radius) { blob.x = blob.radius; blob.vx *= -0.5; }
            if (blob.x > w - blob.radius) { blob.x = w - blob.radius; blob.vx *= -0.5; }
            if (blob.y < blob.radius) { blob.y = blob.radius; blob.vy *= -0.5; }
            if (blob.y > h - blob.radius) { blob.y = h - blob.radius; blob.vy *= -0.5; }

            // Blob-blob repulsion (prevent overlapping too much)
            for (const other of this._blobs) {
                if (other === blob) continue;
                const bDx = blob.x - other.x;
                const bDy = blob.y - other.y;
                const bDist = Math.sqrt(bDx * bDx + bDy * bDy);
                const minDist = (blob.radius + other.radius) * 0.4;
                if (bDist < minDist && bDist > 0) {
                    const push = (minDist - bDist) * 0.01;
                    blob.vx += (bDx / bDist) * push;
                    blob.vy += (bDy / bDist) * push;
                }
            }
        }

        // Remove excess blobs
        while (this._blobs.length > 30) {
            this._blobs.pop();
        }
    }

    draw(ctx, system) {
        if (this._blobs.length === 0 || !this._mbCanvas) return;

        const w = system.width || window.innerWidth;
        const h = system.height || window.innerHeight;
        const res = this._resolution;
        const mbW = this._mbCanvas.width;
        const mbH = this._mbCanvas.height;
        const mbCtx = this._mbCtx;

        // Compute metaball field on low-res canvas
        const imageData = mbCtx.createImageData(mbW, mbH);
        const data = imageData.data;

        for (let py = 0; py < mbH; py++) {
            const worldY = py * res;
            for (let px = 0; px < mbW; px++) {
                const worldX = px * res;
                let sum = 0;

                for (const blob of this._blobs) {
                    const dx = worldX - blob.x;
                    const dy = worldY - blob.y;
                    const r2 = blob.radius * blob.radius;
                    sum += r2 / (dx * dx + dy * dy + 1);
                }

                const idx = (py * mbW + px) * 4;
                if (sum > 1.0) {
                    // Inside metaball - compute color
                    const intensity = Math.min(1, (sum - 1) * 2);
                    const highlight = Math.min(1, Math.max(0, sum - 1.5) * 3);

                    let r, g, b;
                    const hue = this._metalType === 4
                        ? (this._baseHue + worldX * 0.2 + worldY * 0.1 + this._tick * 0.5) % 360
                        : this._baseHue;

                    // Convert hue to RGB for metal shading
                    const rgb = this._hslToRgb(hue, this._metalType === 1 ? 10 : 60, 30 + intensity * 35);

                    // Add specular highlight
                    r = Math.min(255, rgb.r + highlight * 200);
                    g = Math.min(255, rgb.g + highlight * 200);
                    b = Math.min(255, rgb.b + highlight * 200);

                    // Surface texture
                    if (this._surfaceStyle === 1) {
                        // Rippled: add sine-based pattern
                        const ripple = Math.sin(worldX * 0.05 + worldY * 0.05 + this._tick * 0.05) * 20;
                        r = Math.min(255, Math.max(0, r + ripple));
                        g = Math.min(255, Math.max(0, g + ripple));
                        b = Math.min(255, Math.max(0, b + ripple));
                    } else if (this._surfaceStyle === 2) {
                        // Crystalline: faceted look
                        const facet = Math.abs(Math.sin(worldX * 0.1) * Math.cos(worldY * 0.1)) * 40;
                        r = Math.min(255, Math.max(0, r + facet));
                        g = Math.min(255, Math.max(0, g + facet));
                        b = Math.min(255, Math.max(0, b + facet));
                    }

                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = Math.min(255, intensity * 200);
                } else {
                    data[idx + 3] = 0;
                }
            }
        }

        mbCtx.putImageData(imageData, 0, 0);

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
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }
}
