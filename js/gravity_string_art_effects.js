/**
 * @file gravity_string_art_effects.js
 * @description Dynamic string art webs that stretch between seed-placed anchor pins
 * and the cursor. The strings vibrate, resonate, and produce interference patterns.
 * Clicking plucks strings causing rippling wave propagation along them.
 *
 * Modes:
 * 0 - Harp: Parallel strings from top anchors, cursor bends them like plucking a harp
 * 1 - Spider Web: Radial + spiral strings from center, cursor distorts the web
 * 2 - Cat's Cradle: Strings between finger-like anchor points, cursor weaves new patterns
 * 3 - Loom: Warp and weft threads that the cursor pulls into woven patterns
 * 4 - Tension Bridge: Catenary curves between towers, cursor adds weight/lift
 * 5 - Dreamcatcher: Concentric rings with woven inner threads, cursor creates vortex
 */

const TAU = Math.PI * 2;

export class GravityStringArt {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 70;
        this.intensity = 1;
        this._rng = Math.random;

        this.anchors = [];
        this.strings = [];
        this.maxStrings = 80;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMX = 0;
        this._prevMY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Pluck waves traveling along strings
        this._pluckWaves = [];
        this._pluckPool = [];
        this._maxPlucks = 30;

        // Vibration state per string
        this._vibrations = new Float32Array(0);

        // Per-string cached perpendicular normals (avoid recomputing per segment)
        this._stringNormals = null;

        // Cached values
        this._webAngle = 0;
        this._webPulse = 0;
        this._loomPhase = 0;
        this._cachedCenterX = 0;
        this._cachedCenterY = 0;

        // Mode-specific damping and resonance
        this._dampingRate = 0.95;
        this._resonanceFreq = 4;
        this._resonanceSpeed = 0.3;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.6;
        this.tick = 0;
        this._pluckWaves = [];

        const W = window.innerWidth, H = window.innerHeight;
        this._cachedCenterX = W / 2;
        this._cachedCenterY = H / 2;
        this.anchors = [];
        this.strings = [];

        // Mode-specific physics tuning
        switch (this.mode) {
            case 0:
                this._dampingRate = 0.93; // Harp: faster decay, twangy
                this._resonanceFreq = 6 + rng() * 4;
                this._resonanceSpeed = 0.4 + rng() * 0.3;
                this._setupHarp(rng, W, H);
                break;
            case 1:
                this._dampingRate = 0.97; // Web: slow decay, eerie
                this._resonanceFreq = 2 + rng() * 2;
                this._resonanceSpeed = 0.15 + rng() * 0.1;
                this._setupSpiderWeb(rng, W, H);
                break;
            case 2:
                this._dampingRate = 0.94;
                this._resonanceFreq = 3 + rng() * 3;
                this._resonanceSpeed = 0.25 + rng() * 0.2;
                this._setupCatsCradle(rng, W, H);
                break;
            case 3:
                this._dampingRate = 0.96; // Loom: medium decay
                this._resonanceFreq = 2 + rng() * 2;
                this._resonanceSpeed = 0.2 + rng() * 0.15;
                this._setupLoom(rng, W, H);
                break;
            case 4:
                this._dampingRate = 0.98; // Bridge: very slow decay, heavy
                this._resonanceFreq = 1.5 + rng() * 1.5;
                this._resonanceSpeed = 0.1 + rng() * 0.1;
                this._setupBridge(rng, W, H);
                break;
            case 5:
                this._dampingRate = 0.96;
                this._resonanceFreq = 3 + rng() * 3;
                this._resonanceSpeed = 0.2 + rng() * 0.2;
                this._setupDreamcatcher(rng, W, H);
                break;
        }

        this._vibrations = new Float32Array(this.strings.length);
        this._webAngle = rng() * TAU;

        // Precompute string normals
        this._stringNormals = new Float32Array(this.strings.length * 2);
        this._recomputeNormals();
    }

    _recomputeNormals() {
        for (let i = 0; i < this.strings.length; i++) {
            const str = this.strings[i];
            const a = this.anchors[str.a];
            const b = this.anchors[str.b];
            const dx = b.x - a.x, dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            this._stringNormals[i * 2] = -dy / len;
            this._stringNormals[i * 2 + 1] = dx / len;
        }
    }

    _setupHarp(rng, W, H) {
        const count = 15 + Math.floor(rng() * 20);
        const startX = W * 0.1;
        const endX = W * 0.9;
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const x = startX + t * (endX - startX);
            const topY = 10 + rng() * 40;
            const botY = H - 10 - rng() * 40;
            this.anchors.push({ x, y: topY, fixed: true });
            this.anchors.push({ x, y: botY, fixed: true });
            this.strings.push({
                a: this.anchors.length - 2,
                b: this.anchors.length - 1,
                tension: 0.8 + rng() * 0.2,
                hueShift: rng() * 60 - 30,
                segments: 12 + Math.floor(rng() * 8),
                // Harp: each string has a unique pitch (frequency multiplier)
                pitch: 0.5 + t * 2,
            });
        }
    }

    _setupSpiderWeb(rng, W, H) {
        const cx = W / 2, cy = H / 2;
        const rings = 4 + Math.floor(rng() * 4);
        const spokes = 8 + Math.floor(rng() * 8);
        const maxR = Math.min(W, H) * 0.4;

        this.anchors.push({ x: cx, y: cy, fixed: true });
        const centerIdx = 0;

        const ringAnchors = [];
        for (let r = 1; r <= rings; r++) {
            const ring = [];
            const radius = (r / rings) * maxR;
            for (let s = 0; s < spokes; s++) {
                const angle = (s / spokes) * TAU + rng() * 0.1;
                this.anchors.push({
                    x: cx + Math.cos(angle) * radius,
                    y: cy + Math.sin(angle) * radius,
                    fixed: r === rings,
                    baseAngle: angle,
                    baseRadius: radius,
                });
                ring.push(this.anchors.length - 1);
            }
            ringAnchors.push(ring);
        }

        for (let s = 0; s < spokes; s++) {
            this.strings.push({
                a: centerIdx, b: ringAnchors[0][s],
                tension: 0.9, hueShift: s * 10, segments: 6,
            });
            for (let r = 0; r < rings - 1; r++) {
                this.strings.push({
                    a: ringAnchors[r][s], b: ringAnchors[r + 1][s],
                    tension: 0.85, hueShift: s * 10 + r * 5, segments: 6,
                });
            }
        }

        for (let r = 0; r < rings; r++) {
            for (let s = 0; s < spokes; s++) {
                const next = (s + 1) % spokes;
                this.strings.push({
                    a: ringAnchors[r][s], b: ringAnchors[r][next],
                    tension: 0.7, hueShift: r * 15, segments: 4,
                });
            }
        }
    }

    _setupCatsCradle(rng, W, H) {
        const fingerCount = 6 + Math.floor(rng() * 4);
        for (let i = 0; i < fingerCount; i++) {
            const side = Math.floor(rng() * 4);
            let x, y;
            if (side === 0) { x = rng() * W; y = 5; }
            else if (side === 1) { x = rng() * W; y = H - 5; }
            else if (side === 2) { x = 5; y = rng() * H; }
            else { x = W - 5; y = rng() * H; }
            this.anchors.push({ x, y, fixed: true });
        }

        for (let i = 0; i < fingerCount; i++) {
            const connections = 2 + Math.floor(rng() * 3);
            for (let c = 0; c < connections; c++) {
                let target = Math.floor(rng() * fingerCount);
                if (target === i) target = (target + 1) % fingerCount;
                this.strings.push({
                    a: i, b: target,
                    tension: 0.5 + rng() * 0.4,
                    hueShift: rng() * 80 - 40,
                    segments: 10 + Math.floor(rng() * 10),
                });
            }
        }
    }

    _setupLoom(rng, W, H) {
        const warpCount = 12 + Math.floor(rng() * 10);
        const weftCount = 8 + Math.floor(rng() * 8);

        for (let i = 0; i < warpCount; i++) {
            const x = W * 0.1 + (i / (warpCount - 1)) * W * 0.8;
            this.anchors.push({ x, y: 0, fixed: true });
            this.anchors.push({ x, y: H, fixed: true });
            this.strings.push({
                a: this.anchors.length - 2, b: this.anchors.length - 1,
                tension: 0.9, hueShift: 0, segments: 16,
                isWarp: true, warpIndex: i,
            });
        }

        for (let i = 0; i < weftCount; i++) {
            const y = H * 0.1 + (i / (weftCount - 1)) * H * 0.8;
            this.anchors.push({ x: 0, y, fixed: true });
            this.anchors.push({ x: W, y, fixed: true });
            this.strings.push({
                a: this.anchors.length - 2, b: this.anchors.length - 1,
                tension: 0.9, hueShift: 120, segments: 16,
                isWeft: true, weftIndex: i,
            });
        }
    }

    _setupBridge(rng, W, H) {
        const towerCount = 2 + Math.floor(rng() * 3);
        const cablesPerSpan = 6 + Math.floor(rng() * 6);

        for (let t = 0; t < towerCount; t++) {
            const x = W * (0.15 + (t / (towerCount - 1)) * 0.7);
            this.anchors.push({ x, y: H * 0.2, fixed: true });
            this.anchors.push({ x, y: H * 0.8, fixed: true });
        }

        for (let t = 0; t < towerCount - 1; t++) {
            this.strings.push({
                a: t * 2, b: (t + 1) * 2,
                tension: 0.3 + rng() * 0.3,
                hueShift: 0, segments: 20,
                catenary: true,
            });

            for (let c = 0; c < cablesPerSpan; c++) {
                const ct = (c + 1) / (cablesPerSpan + 1);
                const ax = this.anchors[t * 2].x;
                const bx = this.anchors[(t + 1) * 2].x;
                const x = ax + ct * (bx - ax);
                this.anchors.push({ x, y: H * 0.2, fixed: false, suspender: true });
                this.anchors.push({ x, y: H * 0.75, fixed: true });
                this.strings.push({
                    a: this.anchors.length - 2, b: this.anchors.length - 1,
                    tension: 0.95, hueShift: c * 8, segments: 6,
                });
            }
        }
    }

    _setupDreamcatcher(rng, W, H) {
        const cx = W / 2, cy = H / 2;
        const outerR = Math.min(W, H) * 0.35;
        const ringCount = 3 + Math.floor(rng() * 3);
        const pointsPerRing = 12 + Math.floor(rng() * 8);

        for (let r = 0; r < ringCount; r++) {
            const radius = outerR * ((r + 1) / ringCount);
            const prev = [];
            for (let p = 0; p < pointsPerRing; p++) {
                const angle = (p / pointsPerRing) * TAU;
                this.anchors.push({
                    x: cx + Math.cos(angle) * radius,
                    y: cy + Math.sin(angle) * radius,
                    fixed: r === ringCount - 1,
                    baseAngle: angle,
                    baseRadius: radius,
                });
                const idx = this.anchors.length - 1;
                prev.push(idx);

                if (p > 0) {
                    this.strings.push({
                        a: idx - 1, b: idx,
                        tension: 0.8, hueShift: r * 30, segments: 3,
                    });
                }
            }
            this.strings.push({
                a: prev[0], b: prev[prev.length - 1],
                tension: 0.8, hueShift: r * 30, segments: 3,
            });

            if (r > 0) {
                const innerStart = prev[0] - pointsPerRing;
                for (let p = 0; p < pointsPerRing; p++) {
                    const offset = Math.floor(rng() * 3) - 1;
                    const target = innerStart + ((p + offset + pointsPerRing) % pointsPerRing);
                    if (target >= 0 && target < this.anchors.length) {
                        this.strings.push({
                            a: prev[p], b: target,
                            tension: 0.5, hueShift: p * 5 + r * 20, segments: 5,
                        });
                    }
                }
            }
        }
    }

    _computeStringCurve(str, strIdx, mx, my, isClicking, vibration) {
        const a = this.anchors[str.a];
        const b = this.anchors[str.b];
        const segs = str.segments;
        const points = [];

        // Use cached perpendicular normal
        const nx = this._stringNormals[strIdx * 2];
        const ny = this._stringNormals[strIdx * 2 + 1];
        const pullRadius = isClicking ? 300 : 180;
        const pullForce = isClicking ? 40 : 15;
        const pitch = str.pitch || 1;

        // Check for active pluck waves on this string
        let pluckOffset = 0;
        for (const pw of this._pluckWaves) {
            if (pw.stringIdx === strIdx) {
                pluckOffset = pw.amplitude;
            }
        }

        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            let x = a.x + t * (b.x - a.x);
            let y = a.y + t * (b.y - a.y);

            const midFactor = Math.sin(t * Math.PI);
            const dx = mx - x, dy = my - y;
            const distSq = dx * dx + dy * dy;
            const pullRadiusSq = pullRadius * pullRadius;

            if (distSq < pullRadiusSq) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / pullRadius) * midFactor * pullForce;
                x += (dx / dist) * force;
                y += (dy / dist) * force;
            }

            // Catenary sag
            if (str.catenary) {
                y += midFactor * 60 * (1 - str.tension);
            }

            // Loom weaving: alternating over/under displacement
            if (str.isWeft && this.mode === 3) {
                const weaveAmt = Math.sin((t * 8 + this._loomPhase) * Math.PI) * 3 * midFactor;
                y += weaveAmt;
            }

            // Vibration wave with mode-specific frequency and pitch
            const totalVib = vibration + pluckOffset;
            if (totalVib > 0.01) {
                const wave = Math.sin(t * Math.PI * this._resonanceFreq * pitch + this.tick * this._resonanceSpeed) * totalVib * midFactor * 15;
                x += nx * wave;
                y += ny * wave;
            }

            points.push(x, y);
        }
        return points;
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

        // Click triggers pluck waves and string vibrations
        if (isClicking && !this._wasClicking) {
            const pullRadius = 200;
            for (let i = 0; i < this.strings.length; i++) {
                const str = this.strings[i];
                const a = this.anchors[str.a];
                const b = this.anchors[str.b];
                // Point-to-segment distance for more accurate pluck detection
                const abx = b.x - a.x, aby = b.y - a.y;
                const apx = mx - a.x, apy = my - a.y;
                const abLenSq = abx * abx + aby * aby;
                const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abLenSq || 1)));
                const closestX = a.x + t * abx;
                const closestY = a.y + t * aby;
                const distSq = (mx - closestX) ** 2 + (my - closestY) ** 2;

                if (distSq < pullRadius * pullRadius) {
                    const dist = Math.sqrt(distSq);
                    const strength = (1 - dist / pullRadius);
                    this._vibrations[i] = Math.min(1, this._vibrations[i] + strength * 0.9);

                    // Spawn pluck wave
                    if (this._pluckWaves.length < this._maxPlucks && strength > 0.2) {
                        const pw = this._pluckPool.length > 0 ? this._pluckPool.pop() : {};
                        pw.stringIdx = i;
                        pw.position = t; // Where on the string it was plucked
                        pw.amplitude = strength * 0.6;
                        pw.life = 30 + Math.floor(strength * 20);
                        pw.maxLife = pw.life;
                        this._pluckWaves.push(pw);
                    }
                }
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Mouse speed triggers nearby string vibrations (with speed-proportional intensity)
        if (this._mouseSpeed > 2) {
            const speedFactor = Math.min(1, this._mouseSpeed * 0.02);
            for (let i = 0; i < this.strings.length; i++) {
                const str = this.strings[i];
                const a = this.anchors[str.a];
                const b = this.anchors[str.b];
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                const distSq = (mx - midX) ** 2 + (my - midY) ** 2;
                if (distSq < 22500) { // 150^2
                    const dist = Math.sqrt(distSq);
                    this._vibrations[i] = Math.min(1, this._vibrations[i] + speedFactor * 0.15 * (1 - dist / 150));
                }
            }
        }

        // Decay vibrations with mode-specific damping
        for (let i = 0; i < this._vibrations.length; i++) {
            this._vibrations[i] *= this._dampingRate;
        }

        // Spider web and dreamcatcher: rotate non-fixed anchors
        if (this.mode === 1 || this.mode === 5) {
            this._webAngle += 0.002;
            this._webPulse = Math.sin(this.tick * 0.02) * 0.05;
            const cx = this._cachedCenterX;
            const cy = this._cachedCenterY;
            for (const anchor of this.anchors) {
                if (!anchor.fixed && anchor.baseAngle !== undefined) {
                    const r = anchor.baseRadius * (1 + this._webPulse);
                    const angle = anchor.baseAngle + this._webAngle;
                    anchor.x = cx + Math.cos(angle) * r;
                    anchor.y = cy + Math.sin(angle) * r;
                }
            }
            this._recomputeNormals();
        }

        // Loom: weave phase
        if (this.mode === 3) {
            this._loomPhase += 0.01;
        }

        // Pluck wave decay
        for (let i = this._pluckWaves.length - 1; i >= 0; i--) {
            const pw = this._pluckWaves[i];
            pw.life--;
            pw.amplitude *= 0.92;
            if (pw.life <= 0) {
                this._pluckPool.push(pw);
                this._pluckWaves[i] = this._pluckWaves[this._pluckWaves.length - 1];
                this._pluckWaves.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        const mx = this._mouseX;
        const my = this._mouseY;
        const clicking = this._isClicking;

        for (let i = 0; i < this.strings.length; i++) {
            const str = this.strings[i];
            const vib = this._vibrations[i] || 0;
            const points = this._computeStringCurve(str, i, mx, my, clicking, vib);

            const hue = (this.hue + (str.hueShift || 0) + 360) % 360;
            const baseAlpha = (0.08 + vib * 0.35) * this.intensity;
            const lightness = 50 + vib * 35;

            // Wide glow pass (only for vibrating strings)
            if (vib > 0.05) {
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, ${lightness + 10}%, ${baseAlpha * 0.2})`;
                ctx.lineWidth = 6 + vib * 8;
                ctx.beginPath();
                ctx.moveTo(points[0], points[1]);
                for (let j = 2; j < points.length; j += 2) {
                    ctx.lineTo(points[j], points[j + 1]);
                }
                ctx.stroke();

                // Inner glow pass
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, ${lightness}%, ${baseAlpha * 0.5})`;
                ctx.lineWidth = 2 + vib * 4;
                ctx.beginPath();
                ctx.moveTo(points[0], points[1]);
                for (let j = 2; j < points.length; j += 2) {
                    ctx.lineTo(points[j], points[j + 1]);
                }
                ctx.stroke();
            }

            // Core string
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, ${lightness}%, ${baseAlpha + 0.06})`;
            ctx.lineWidth = 0.5 + vib * 2;
            ctx.beginPath();
            ctx.moveTo(points[0], points[1]);
            for (let j = 2; j < points.length; j += 2) {
                ctx.lineTo(points[j], points[j + 1]);
            }
            ctx.stroke();
        }

        // Draw pluck wave flash points
        for (const pw of this._pluckWaves) {
            if (pw.amplitude < 0.05) continue;
            const str = this.strings[pw.stringIdx];
            if (!str) continue;
            const a = this.anchors[str.a];
            const b = this.anchors[str.b];
            const px = a.x + pw.position * (b.x - a.x);
            const py = a.y + pw.position * (b.y - a.y);
            const alpha = pw.amplitude * 0.4 * this.intensity;
            const hue = (this.hue + (str.hueShift || 0) + 360) % 360;
            ctx.fillStyle = `hsla(${hue}, 90%, 85%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 3 + pw.amplitude * 6, 0, TAU);
            ctx.fill();
        }

        // Anchor points with glow
        for (const a of this.anchors) {
            if (!a.fixed) continue;
            // Outer glow
            const alpha = 0.06 * this.intensity;
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 5, 0, TAU);
            ctx.fill();
            // Core
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 90%, ${alpha * 2})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 1.5, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }
}
