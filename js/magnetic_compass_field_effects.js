/**
 * @file magnetic_compass_field_effects.js
 * @description A field of tiny compass needles that orient toward the cursor,
 * creating a flowing vector field visualization. Needles have inertia and
 * overshoot, creating mesmerizing wave propagation when the cursor moves.
 *
 * Modes:
 * 0 - Classic Field: Needles smoothly track cursor, color by alignment
 * 1 - Magnetic Storm: Needles jitter and spark when cursor moves fast
 * 2 - Ley Lines: Needles along invisible energy lines glow brighter
 * 3 - Tidal Pull: Needles sway like seaweed in current, cursor is the tide
 * 4 - Broken Compass: Some needles are "broken" and spin wildly, infecting neighbors
 * 5 - Ripple Propagation: Orientation changes propagate outward like waves
 */

const TAU = Math.PI * 2;

export class MagneticCompassField {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this._needles = null; // Float32Array: [angle, angularVel, targetAngle, brightness, broken, leyLine] per needle
        this._stride = 6;
        this._cols = 0;
        this._rows = 0;
        this._spacing = 28;
        this._needleLen = 10;
        this._hue = 200;
        this._hue2 = 320;
        this._damping = 0.88;
        this._stiffness = 0.08;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._clickWaves = []; // {cx, cy, radius, strength}
        this._intensity = 1;
        this._holdEmitTimer = 0;
    }

    configure(rng, hues) {
        this.tick = 0;
        this.mode = Math.floor(rng() * 6);
        this._clickWaves = [];
        this._holdEmitTimer = 0;

        this._hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._hue2 = hues.length > 1 ? hues[1].h : (this._hue + 140 + Math.floor(rng() * 80)) % 360;
        this._intensity = 0.6 + rng() * 0.5;

        this._spacing = 20 + Math.floor(rng() * 20);
        this._needleLen = 6 + Math.floor(rng() * 10);
        this._damping = 0.82 + rng() * 0.12;
        this._stiffness = 0.04 + rng() * 0.1;

        const W = window.innerWidth;
        const H = window.innerHeight;
        this._cols = Math.ceil(W / this._spacing) + 1;
        this._rows = Math.ceil(H / this._spacing) + 1;
        const count = this._cols * this._rows;
        this._needles = new Float32Array(count * this._stride);

        for (let i = 0; i < count; i++) {
            const base = i * this._stride;
            const angle = rng() * TAU;
            this._needles[base] = angle;      // current angle
            this._needles[base + 1] = 0;      // angular velocity
            this._needles[base + 2] = angle;  // target angle
            this._needles[base + 3] = 0.3;    // brightness
            this._needles[base + 4] = 0;      // broken flag (mode 4)
            this._needles[base + 5] = 0;      // ley line membership (mode 2)
        }

        // Mode 4: Mark ~8% of needles as "broken"
        if (this.mode === 4) {
            for (let i = 0; i < count; i++) {
                if (rng() < 0.08) {
                    this._needles[i * this._stride + 4] = 1;
                }
            }
        }

        // Mode 2: Create ley lines (diagonal paths of high energy)
        if (this.mode === 2) {
            const lineCount = 3 + Math.floor(rng() * 4);
            for (let l = 0; l < lineCount; l++) {
                const startCol = Math.floor(rng() * this._cols);
                const startRow = Math.floor(rng() * this._rows);
                const angle = rng() * Math.PI;
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);
                for (let step = -80; step < 80; step++) {
                    const col = Math.round(startCol + dx * step);
                    const row = Math.round(startRow + dy * step);
                    if (col >= 0 && col < this._cols && row >= 0 && row < this._rows) {
                        this._needles[(row * this._cols + col) * this._stride + 5] = 1;
                    }
                }
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        const dx = mx - this._pmx;
        const dy = my - this._pmy;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        // Click: emit a single wave; hold: emit repeated weaker waves
        if (isClicking && !this._wasClicking) {
            this._clickWaves.push({ cx: mx, cy: my, radius: 0, strength: 1 });
            this._holdEmitTimer = 0;
        } else if (isClicking) {
            this._holdEmitTimer++;
            if (this._holdEmitTimer % 12 === 0) {
                this._clickWaves.push({ cx: mx, cy: my, radius: 0, strength: 0.4 });
            }
        }
        if (this._clickWaves.length > 8) this._clickWaves.splice(0, this._clickWaves.length - 8);
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Update click waves
        for (let i = this._clickWaves.length - 1; i >= 0; i--) {
            const w = this._clickWaves[i];
            w.radius += 8;
            w.strength *= 0.97;
            if (w.strength < 0.01) {
                this._clickWaves[i] = this._clickWaves[this._clickWaves.length - 1];
                this._clickWaves.pop();
            }
        }

        if (!this._needles) return;

        const spacing = this._spacing;
        const cols = this._cols;
        const rows = this._rows;
        const stride = this._stride;
        const stiffness = this._stiffness;
        const damping = this._damping;
        const needles = this._needles;
        const mouseSpeedFactor = Math.min(1, this._mouseSpeed * 0.02);
        const waveCount = this._clickWaves.length;

        for (let row = 0; row < rows; row++) {
            const ny = row * spacing;
            for (let col = 0; col < cols; col++) {
                const nx = col * spacing;
                const idx = (row * cols + col) * stride;

                // Target angle points toward cursor
                const toMouseX = mx - nx;
                const toMouseY = my - ny;
                const distSq = toMouseX * toMouseX + toMouseY * toMouseY;
                let targetAngle = Math.atan2(toMouseY, toMouseX);

                const isBroken = needles[idx + 4] > 0;

                if (this.mode === 1) {
                    // Magnetic Storm: add jitter proportional to mouse speed
                    targetAngle += Math.sin(this.tick * 0.3 + col * 0.5) * mouseSpeedFactor * 1.5;
                } else if (this.mode === 3) {
                    // Tidal Pull: sinusoidal sway + cursor attraction
                    const tidalPhase = this.tick * 0.015 + col * 0.2 + row * 0.1;
                    targetAngle = targetAngle * 0.4 + Math.sin(tidalPhase) * Math.PI * 0.6;
                } else if (this.mode === 4 && isBroken) {
                    // Broken: spin wildly
                    targetAngle = needles[idx] + 0.2 + Math.sin(this.tick * 0.1 + col) * 0.5;
                } else if (this.mode === 5) {
                    // Ripple: delayed reaction based on distance (avoid sqrt for perf)
                    // Approximate delay using distSq scaled down
                    const approxDist = (Math.abs(toMouseX) + Math.abs(toMouseY)) * 0.7; // Manhattan approx
                    const delay = approxDist * 0.015;
                    const delayedTick = this.tick - delay;
                    targetAngle += Math.sin(delayedTick * 0.1) * 0.3;
                }

                // Click wave influence (use distSq to skip far waves)
                for (let wi = 0; wi < waveCount; wi++) {
                    const w = this._clickWaves[wi];
                    const wdx = nx - w.cx;
                    const wdy = ny - w.cy;
                    const wDistSq = wdx * wdx + wdy * wdy;
                    // Max possible influence: radius+40, so skip if distSq > (radius+40)^2
                    const maxDist = w.radius + 40;
                    if (wDistSq > maxDist * maxDist) continue;
                    const wDist = Math.sqrt(wDistSq);
                    const ringDist = Math.abs(wDist - w.radius);
                    if (ringDist < 40) {
                        const wavePush = (1 - ringDist / 40) * w.strength * Math.PI;
                        targetAngle += wavePush;
                    }
                }

                needles[idx + 2] = targetAngle;

                // Spring physics
                let angleDiff = targetAngle - needles[idx];
                // Normalize to [-PI, PI]
                angleDiff = ((angleDiff + Math.PI) % TAU + TAU) % TAU - Math.PI;

                const springStiff = isBroken ? stiffness * 0.3 : stiffness;
                needles[idx + 1] += angleDiff * springStiff;
                needles[idx + 1] *= damping;
                needles[idx] += needles[idx + 1];

                // Brightness: avoid sqrt - use approximate distance
                const approxDist = (Math.abs(toMouseX) + Math.abs(toMouseY)) * 0.7;
                const proximityBright = Math.max(0, 1 - approxDist / 400) * 0.5;
                const alignBright = Math.abs(Math.cos(angleDiff)) * 0.4;
                let brightness = 0.15 + proximityBright + alignBright;

                if (this.mode === 1) {
                    brightness += mouseSpeedFactor * 0.3;
                }
                if (this.mode === 2 && needles[idx + 5] > 0) {
                    brightness += 0.4 + Math.sin(this.tick * 0.05 + col * 0.3) * 0.15;
                }
                if (isBroken) {
                    brightness = 0.3 + Math.abs(Math.sin(this.tick * 0.15 + col)) * 0.5;
                }

                // Mode 4: broken needles infect neighbors (unique seed per neighbor)
                if (this.mode === 4 && isBroken && this.tick % 60 === 0) {
                    const offsets = [-cols, cols, -1, 1]; // up, down, left, right
                    const bounds = [row > 0, row < rows - 1, col > 0, col < cols - 1];
                    for (let n = 0; n < 4; n++) {
                        if (!bounds[n]) continue;
                        const nIdx = ((row * cols + col) + offsets[n]) * stride;
                        if (needles[nIdx + 4] === 0) {
                            // Unique pseudo-random per neighbor per tick
                            const seed = this.tick * 2654435761 + n * 1597334677 + row * 3266489917 + col * 2246822519;
                            if (((seed >>> 0) % 100) < 3) {
                                needles[nIdx + 4] = 1;
                            }
                        }
                    }
                }

                needles[idx + 3] = brightness;
            }
        }
    }

    draw(ctx, system) {
        if (!this._needles) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        const spacing = this._spacing;
        const cols = this._cols;
        const rows = this._rows;
        const stride = this._stride;
        const needles = this._needles;
        const len = this._needleLen;
        const hue = this._hue;
        const hue2 = this._hue2;
        const intensity = this._intensity;

        // Batch needles by brightness band for fewer fillStyle changes
        // Band 0: bright (>=0.5), Band 1: medium (0.3-0.5), Band 2: dim (<0.3)
        const bandConfigs = [
            { lo: 0.5, hi: 2,   alpha: (0.15 + 0.5 * 0.5) * intensity, lw: 1.5, light: 45 + 0.5 * 35 },
            { lo: 0.3, hi: 0.5, alpha: (0.15 + 0.3 * 0.5) * intensity, lw: 1.3, light: 45 + 0.3 * 35 },
            { lo: 0.0, hi: 0.3, alpha: 0.15 * intensity,                lw: 1.0, light: 45 },
        ];

        for (const band of bandConfigs) {
            ctx.strokeStyle = `hsla(${hue}, 65%, ${band.light}%, ${band.alpha.toFixed(3)})`;
            ctx.lineWidth = band.lw;
            ctx.beginPath();

            for (let row = 0; row < rows; row++) {
                const ny = row * spacing;
                for (let col = 0; col < cols; col++) {
                    const idx = (row * cols + col) * stride;
                    const brightness = needles[idx + 3];

                    if (brightness < band.lo || brightness >= band.hi) continue;

                    const nx = col * spacing;
                    const angle = needles[idx];
                    const cosA = Math.cos(angle);
                    const sinA = Math.sin(angle);
                    const halfLen = len * (0.5 + brightness * 0.5);

                    ctx.moveTo(nx - cosA * halfLen, ny - sinA * halfLen);
                    ctx.lineTo(nx + cosA * halfLen, ny + sinA * halfLen);
                }
            }
            ctx.stroke();
        }

        // Draw bright tips for high-brightness needles
        ctx.fillStyle = `hsla(${hue2}, 80%, 80%, ${0.4 * intensity})`;
        ctx.beginPath();
        for (let row = 0; row < rows; row++) {
            const ny = row * spacing;
            for (let col = 0; col < cols; col++) {
                const idx = (row * cols + col) * stride;
                const brightness = needles[idx + 3];
                if (brightness < 0.5) continue;
                const nx = col * spacing;
                const angle = needles[idx];
                const halfLen = len * (0.5 + brightness * 0.5);
                const tipX = nx + Math.cos(angle) * halfLen;
                const tipY = ny + Math.sin(angle) * halfLen;
                ctx.moveTo(tipX + 2, tipY);
                ctx.arc(tipX, tipY, 2, 0, TAU);
            }
        }
        ctx.fill();

        // Mode 1: Spark particles near fast-moving mouse
        if (this.mode === 1 && this._mouseSpeed > 5) {
            const sparkCount = Math.min(8, Math.floor(this._mouseSpeed * 0.3));
            ctx.fillStyle = `hsla(${hue2}, 90%, 85%, ${0.5 * intensity})`;
            for (let i = 0; i < sparkCount; i++) {
                const pr = ((this.tick * 2654435761 + i * 1597334677) >>> 0) / 4294967296;
                const pr2 = ((this.tick * 2246822519 + i * 3266489917) >>> 0) / 4294967296;
                const sx = this._mx + (pr - 0.5) * 60;
                const sy = this._my + (pr2 - 0.5) * 60;
                ctx.beginPath();
                ctx.arc(sx, sy, 1 + pr * 2, 0, TAU);
                ctx.fill();
            }
        }

        // Mode 2: Ley line glow — batched into a single path
        if (this.mode === 2) {
            ctx.fillStyle = `hsla(${hue2}, 80%, 60%, ${0.08 * intensity})`;
            ctx.beginPath();
            const glowR = spacing * 0.6;
            for (let row = 0; row < rows; row++) {
                const ny = row * spacing;
                for (let col = 0; col < cols; col++) {
                    const idx = (row * cols + col) * stride;
                    if (needles[idx + 5] > 0) {
                        const nx = col * spacing;
                        ctx.moveTo(nx + glowR, ny);
                        ctx.arc(nx, ny, glowR, 0, TAU);
                    }
                }
            }
            ctx.fill();
        }

        // Mode 4: Draw "corruption" glow around broken needles
        if (this.mode === 4) {
            ctx.fillStyle = `hsla(${(hue + 180) % 360}, 70%, 50%, ${0.04 * intensity})`;
            ctx.beginPath();
            for (let row = 0; row < rows; row++) {
                const ny = row * spacing;
                for (let col = 0; col < cols; col++) {
                    const idx = (row * cols + col) * stride;
                    if (needles[idx + 4] > 0) {
                        const nx = col * spacing;
                        ctx.moveTo(nx + spacing * 0.5, ny);
                        ctx.arc(nx, ny, spacing * 0.5, 0, TAU);
                    }
                }
            }
            ctx.fill();
        }

        // Click wave rings (visible ripple indicators)
        if (this._clickWaves.length > 0) {
            ctx.lineWidth = 1;
            for (const w of this._clickWaves) {
                if (w.radius < 5) continue;
                const alpha = w.strength * 0.3 * intensity;
                ctx.strokeStyle = `hsla(${hue2}, 70%, 70%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(w.cx, w.cy, w.radius, 0, TAU);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
