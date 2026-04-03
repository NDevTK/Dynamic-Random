/**
 * @file dimensional_echoes.js
 * @description Creates otherworldly parallel dimension effects that overlay the background.
 * Each seed picks a different "dimension type" and rendering style, making the
 * background feel like it has depth, history, and parallel realities bleeding through.
 *
 * Modes:
 * 0 - Kaleidoscope Mirror: mouse movement is reflected in symmetric patterns
 * 1 - Time Echoes: ghost copies of cursor trail replay with increasing delay
 * 2 - Dimensional Tears: cracks in reality show a "different world" underneath
 * 3 - Parallax Layers: multiple depth planes shift with mouse creating 3D feel
 * 4 - Shadow Theater: dramatic shadows cast from cursor as if it's a light source
 * 5 - Quantum Superposition: multiple potential cursor positions shown simultaneously
 */

export class DimensionalEchoes {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 70;

        // Mouse tracking (shared across all modes)
        this._mouseX = 0;
        this._mouseY = 0;
        this._rng = Math.random;

        // Kaleidoscope
        this.symmetry = 6;
        this.kaleidoTrail = [];
        this.maxKaleidoTrail = 30;

        // Time echoes
        this.echoHistory = [];
        this.echoHistoryMax = 300;
        this.echoLayers = 5;
        this.echoDelays = [];

        // Dimensional tears
        this.tears = [];
        this.tearPool = [];
        this.maxTears = 8;
        this.tearHue = 0;
        this.tearStyle = 0;
        this._ambientTearTimer = 0;

        // Parallax layers
        this.layers = [];

        // Shadow theater
        this.shadowObjects = [];
        this.shadowCount = 0;

        // Quantum superposition
        this.quantumPaths = [];
        this.quantumBranches = 4;
        this.quantumDrift = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? (palette[0].h || Math.floor(rng() * 360)) : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this.echoHistory = [];
        this.tears = [];
        this.kaleidoTrail = [];
        this._ambientTearTimer = 0;
        this._rng = rng;

        switch (this.mode) {
            case 0: // Kaleidoscope
                this.symmetry = 4 + Math.floor(rng() * 8);
                break;

            case 1: // Time echoes
                this.echoLayers = 3 + Math.floor(rng() * 5);
                this.echoDelays = [];
                for (let i = 0; i < this.echoLayers; i++) {
                    this.echoDelays.push(20 + Math.floor(rng() * 40) * (i + 1));
                }
                break;

            case 2: // Dimensional tears
                this.tearHue = (this.hue + 120 + rng() * 60) % 360;
                this.tearStyle = Math.floor(rng() * 3);
                break;

            case 3: // Parallax layers
                this.layers = [];
                const layerCount = 3 + Math.floor(rng() * 4);
                for (let i = 0; i < layerCount; i++) {
                    this.layers.push({
                        depth: 0.1 + (i / layerCount) * 0.9,
                        hue: (this.hue + i * 30) % 360,
                        elements: this._generateParallaxElements(rng, 5 + Math.floor(rng() * 10)),
                        opacity: 0.05 + rng() * 0.1,
                    });
                }
                break;

            case 4: // Shadow theater
                this.shadowCount = 5 + Math.floor(rng() * 10);
                this.shadowObjects = [];
                for (let i = 0; i < this.shadowCount; i++) {
                    this.shadowObjects.push({
                        x: rng() * window.innerWidth,
                        y: rng() * window.innerHeight,
                        size: 20 + rng() * 80,
                        shape: Math.floor(rng() * 4),
                        rotation: rng() * Math.PI * 2,
                        rotSpeed: (rng() - 0.5) * 0.01,
                    });
                }
                break;

            case 5: // Quantum superposition
                this.quantumBranches = 3 + Math.floor(rng() * 5);
                this.quantumDrift = 20 + rng() * 60;
                this.quantumPaths = [];
                for (let i = 0; i < this.quantumBranches; i++) {
                    this.quantumPaths.push({
                        points: [],
                        phaseX: rng() * Math.PI * 2,
                        phaseY: rng() * Math.PI * 2,
                        freqX: 0.02 + rng() * 0.04,
                        freqY: 0.02 + rng() * 0.04,
                        hueOffset: rng() * 60 - 30,
                        maxPoints: 50,
                    });
                }
                break;
        }
    }

    _generateParallaxElements(rng, count) {
        const elements = [];
        for (let i = 0; i < count; i++) {
            elements.push({
                x: rng() * window.innerWidth,
                y: rng() * window.innerHeight,
                size: 5 + rng() * 40,
                shape: Math.floor(rng() * 3),
                rotation: rng() * Math.PI * 2,
            });
        }
        return elements;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;

        switch (this.mode) {
            case 0: // Kaleidoscope
                this.kaleidoTrail.push({ x: mx, y: my });
                if (this.kaleidoTrail.length > this.maxKaleidoTrail + 10) {
                    this.kaleidoTrail.splice(0, this.kaleidoTrail.length - this.maxKaleidoTrail);
                }
                break;

            case 1: // Time echoes
                this.echoHistory.push({ x: mx, y: my });
                if (this.echoHistory.length > this.echoHistoryMax + 20) {
                    this.echoHistory.splice(0, this.echoHistory.length - this.echoHistoryMax);
                }
                break;

            case 2: // Dimensional tears
                // Click-spawned burst of tears
                if (isClicking && this.tears.length < this.maxTears) {
                    this._spawnTear(mx, my);
                    // Burst: spawn extra tears radiating from click
                    if (this.tick % 8 === 0) {
                        const rng = this._rng;
                        const ox = (rng() - 0.5) * 80;
                        const oy = (rng() - 0.5) * 80;
                        if (this.tears.length < this.maxTears) {
                            this._spawnTear(mx + ox, my + oy);
                        }
                    }
                }

                // Ambient tears spawn periodically near cursor
                this._ambientTearTimer++;
                if (this._ambientTearTimer > 120 && this.tears.length < this.maxTears) {
                    this._ambientTearTimer = 0;
                    const rng = this._rng;
                    const ox = (rng() - 0.5) * 200;
                    const oy = (rng() - 0.5) * 200;
                    this._spawnTear(mx + ox, my + oy, true);
                }

                for (let i = this.tears.length - 1; i >= 0; i--) {
                    const t = this.tears[i];
                    t.phase++;
                    t.width = Math.min(t.maxWidth, t.width + 2);
                    t.height = Math.min(t.maxHeight, t.height + 3);
                    t.life--;
                    if (t.life <= 0) {
                        this.tearPool.push(t);
                        this.tears[i] = this.tears[this.tears.length - 1];
                        this.tears.pop();
                    }
                }
                break;

            case 4: // Shadow theater
                for (const obj of this.shadowObjects) {
                    obj.rotation += obj.rotSpeed;
                    // Cursor proximity subtly steers rotation
                    const dx = mx - obj.x;
                    const dy = my - obj.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 1;
                    if (dist < 300) {
                        obj.rotSpeed += dx / (dist * 5000);
                    }
                }
                break;

            case 5: // Quantum superposition
                for (const path of this.quantumPaths) {
                    const offsetX = Math.sin(this.tick * path.freqX + path.phaseX) * this.quantumDrift;
                    const offsetY = Math.cos(this.tick * path.freqY + path.phaseY) * this.quantumDrift;
                    path.points.push({ x: mx + offsetX, y: my + offsetY });
                    if (path.points.length > path.maxPoints + 10) {
                        path.points.splice(0, path.points.length - path.maxPoints);
                    }
                }
                break;
        }
    }

    _spawnTear(x, y, ambient = false) {
        const rng = this._rng;
        const tear = this.tearPool.length > 0 ? this.tearPool.pop() : {};
        tear.x = x;
        tear.y = y;
        tear.width = 0;
        tear.height = 0;
        tear.maxWidth = ambient ? 15 + rng() * 30 : 30 + rng() * 60;
        tear.maxHeight = ambient ? 30 + rng() * 60 : 60 + rng() * 120;
        tear.life = ambient ? 100 + Math.floor(rng() * 60) : 200;
        tear.angle = rng() * Math.PI;
        tear.phase = 0;
        this.tears.push(tear);
    }

    draw(ctx, system) {
        const w = system.width, h = system.height;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        switch (this.mode) {
            case 0: this._drawKaleidoscope(ctx, w, h); break;
            case 1: this._drawTimeEchoes(ctx, w, h); break;
            case 2: this._drawDimensionalTears(ctx, w, h); break;
            case 3: this._drawParallaxLayers(ctx, w, h); break;
            case 4: this._drawShadowTheater(ctx, w, h); break;
            case 5: this._drawQuantumSuperposition(ctx); break;
        }

        ctx.restore();
    }

    _drawKaleidoscope(ctx, w, h) {
        const cxCenter = w / 2, cyCenter = h / 2;

        // Ambient pulsing ring at center even when idle
        const pulse = 0.5 + Math.sin(this.tick * 0.02) * 0.5;
        const ringR = 15 + pulse * 10;
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, ${0.03 + pulse * 0.02})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cxCenter, cyCenter, ringR, 0, Math.PI * 2);
        ctx.stroke();

        if (this.kaleidoTrail.length < 2) return;

        for (let s = 0; s < this.symmetry; s++) {
            const angle = (s / this.symmetry) * Math.PI * 2;
            const mirror = s % 2 === 0 ? 1 : -1;

            ctx.save();
            ctx.translate(cxCenter, cyCenter);
            ctx.rotate(angle);
            ctx.scale(mirror, 1);
            ctx.translate(-cxCenter, -cyCenter);

            ctx.beginPath();
            ctx.lineWidth = 0.8 + (s % 2) * 1.5; // Alternate thin/thick for depth
            const alpha = 0.15 / Math.sqrt(this.symmetry);
            ctx.strokeStyle = `hsla(${(this.hue + s * 20) % 360}, ${this.saturation}%, 65%, ${alpha})`;

            for (let i = 0; i < this.kaleidoTrail.length; i++) {
                const p = this.kaleidoTrail[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            // Draw dots at trail points with varying size
            for (let i = 0; i < this.kaleidoTrail.length; i += 2) {
                const p = this.kaleidoTrail[i];
                const dotAlpha = (i / this.kaleidoTrail.length) * alpha;
                const dotSize = 1.5 + (i / this.kaleidoTrail.length) * 2;
                ctx.fillStyle = `hsla(${(this.hue + s * 20 + i * 5) % 360}, 80%, 70%, ${dotAlpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    _drawTimeEchoes(ctx, w, h) {
        if (this.echoHistory.length < 3) return;

        for (let layer = 0; layer < this.echoLayers; layer++) {
            const delay = this.echoDelays[layer];
            const startIdx = Math.max(0, this.echoHistory.length - delay - 20);
            const endIdx = Math.max(0, this.echoHistory.length - delay);

            if (startIdx >= endIdx) continue;

            const alpha = 0.08 / (layer + 1);
            const hue = (this.hue + layer * 40) % 360;
            const scale = 1 + layer * 0.05;

            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.scale(scale, scale);
            ctx.translate(-w / 2, -h / 2);

            // Draw echo trail with smooth curve
            ctx.beginPath();
            ctx.lineWidth = 2 + layer;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
            for (let i = startIdx; i < endIdx; i++) {
                const p = this.echoHistory[i];
                if (i === startIdx) ctx.moveTo(p.x, p.y);
                else {
                    // Use quadratic curve for smoother trails
                    const prev = this.echoHistory[i - 1];
                    const cpx = (prev.x + p.x) / 2;
                    const cpy = (prev.y + p.y) / 2;
                    ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
                }
            }
            ctx.stroke();

            // Ghost dot at echo head with pulsing glow
            if (endIdx > 0) {
                const head = this.echoHistory[endIdx - 1];
                const pulse = 0.7 + Math.sin(this.tick * 0.1 + layer) * 0.3;
                // Outer glow
                ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha * 2 * pulse})`;
                ctx.beginPath();
                ctx.arc(head.x, head.y, 6 + layer * 3, 0, Math.PI * 2);
                ctx.fill();
                // Inner core
                ctx.fillStyle = `hsla(${hue}, 90%, 85%, ${alpha * 4 * pulse})`;
                ctx.beginPath();
                ctx.arc(head.x, head.y, 2 + layer, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    _drawDimensionalTears(ctx, w, h) {
        for (const tear of this.tears) {
            const lifeRatio = tear.life / 200;
            const fadeIn = Math.min(1, tear.phase / 20);
            const fadeOut = lifeRatio < 0.2 ? lifeRatio / 0.2 : 1;
            const alpha = fadeIn * fadeOut * 0.3;

            ctx.save();
            ctx.translate(tear.x, tear.y);
            ctx.rotate(tear.angle);

            // The tear crack with jagged edges
            ctx.strokeStyle = `hsla(${this.tearHue}, 90%, 80%, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const segments = 10;
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const y = (t - 0.5) * tear.height;
                const wobble = Math.sin(t * Math.PI * 3 + tear.phase * 0.05) * tear.width * 0.3;
                const jag = Math.sin(t * Math.PI * 7 + tear.phase * 0.08) * tear.width * 0.1;
                if (i === 0) ctx.moveTo(wobble + jag, y);
                else ctx.lineTo(wobble + jag, y);
            }
            ctx.stroke();

            // Inner glow (the "other dimension" light)
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(tear.width, tear.height));
            grad.addColorStop(0, `hsla(${this.tearHue}, 80%, 70%, ${alpha * 0.5})`);
            grad.addColorStop(0.5, `hsla(${this.tearHue}, 60%, 40%, ${alpha * 0.2})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(-tear.width * 2, -tear.height, tear.width * 4, tear.height * 2);

            // "Other dimension" streaks emanating from tear
            if (this.tearStyle >= 1) {
                const streakCount = this.tearStyle === 2 ? 8 : 5;
                for (let i = 0; i < streakCount; i++) {
                    const a = (i / streakCount) * Math.PI * 2 + tear.phase * 0.02;
                    const len = 20 + Math.sin(tear.phase * 0.1 + i) * 15;
                    ctx.strokeStyle = `hsla(${(this.tearHue + 60) % 360}, 70%, 60%, ${alpha * 0.4})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                    ctx.stroke();
                }
            }

            // Particle leak effect - small dots drifting out of tear
            if (tear.phase > 10 && tear.phase % 3 === 0) {
                const dotAngle = tear.phase * 0.2;
                const dotDist = (tear.phase % 30) * 1.5;
                const dotAlpha = alpha * Math.max(0, 1 - dotDist / 45);
                ctx.fillStyle = `hsla(${this.tearHue}, 80%, 75%, ${dotAlpha})`;
                ctx.beginPath();
                ctx.arc(Math.cos(dotAngle) * dotDist, Math.sin(dotAngle) * dotDist, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    _drawParallaxLayers(ctx, w, h) {
        // Use actual mouse position normalized to -0.5..0.5 for proper parallax
        const normMx = this._mouseX / w - 0.5;
        const normMy = this._mouseY / h - 0.5;
        const tick = this.tick;
        const sat = this.saturation;

        for (const layer of this.layers) {
            const offsetX = normMx * layer.depth * 80;
            const offsetY = normMy * layer.depth * 80;
            const drift = tick * 0.2 * layer.depth;
            const depthRotSpeed = tick * 0.001 * layer.depth;
            const sizeScale = 0.5 + layer.depth * 0.5;

            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.globalAlpha = layer.opacity;
            ctx.strokeStyle = `hsla(${layer.hue}, ${sat}%, 70%, 0.3)`;
            ctx.lineWidth = 0.5;

            for (const el of layer.elements) {
                const x = ((el.x + drift) % (w + 100)) - 50;
                const y = el.y;
                const size = el.size * sizeScale;
                const halfSize = size / 2;
                const thirdSize = size / 3;
                const rot = el.rotation + depthRotSpeed;

                // Use manual transform math to avoid save/restore per element
                const cos = Math.cos(rot);
                const sin = Math.sin(rot);

                switch (el.shape) {
                    case 0: // Circle (rotation doesn't matter)
                        ctx.beginPath();
                        ctx.arc(x, y, halfSize, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.fillStyle = `hsla(${layer.hue}, ${sat}%, 50%, 0.1)`;
                        ctx.fill();
                        break;
                    case 1: // Line
                        ctx.beginPath();
                        ctx.moveTo(x - cos * halfSize, y - sin * halfSize);
                        ctx.lineTo(x + cos * halfSize, y + sin * halfSize);
                        ctx.stroke();
                        break;
                    case 2: // Cross
                        ctx.beginPath();
                        ctx.moveTo(x - cos * thirdSize, y - sin * thirdSize);
                        ctx.lineTo(x + cos * thirdSize, y + sin * thirdSize);
                        ctx.moveTo(x + sin * thirdSize, y - cos * thirdSize);
                        ctx.lineTo(x - sin * thirdSize, y + cos * thirdSize);
                        ctx.stroke();
                        break;
                }
            }

            ctx.restore();
        }
    }

    _drawShadowTheater(ctx, w, h) {
        // Use tracked mouse position as light source
        const lightX = this._mouseX;
        const lightY = this._mouseY;

        for (const obj of this.shadowObjects) {
            const dx = obj.x - lightX;
            const dy = obj.y - lightY;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            const shadowLen = Math.min(200, 5000 / dist);
            const shadowAngle = Math.atan2(dy, dx);
            const alpha = Math.max(0.02, 0.15 - dist / 3000);

            ctx.save();
            ctx.translate(obj.x, obj.y);
            ctx.rotate(obj.rotation);

            // Draw the shadow (stretched away from light)
            ctx.save();
            ctx.rotate(shadowAngle - obj.rotation);
            ctx.scale(1 + shadowLen / 50, 1);
            ctx.fillStyle = `hsla(${this.hue}, 30%, 10%, ${alpha})`;
            ctx.globalCompositeOperation = 'source-over';

            this._drawShape(ctx, obj.shape, obj.size, true);
            ctx.restore();

            // Draw the object itself (faint outline with glow)
            ctx.globalCompositeOperation = 'lighter';

            // Object glow based on proximity to light
            const glowIntensity = Math.max(0, 0.08 - dist / 5000);
            if (glowIntensity > 0.01) {
                ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, ${glowIntensity})`;
                this._drawShape(ctx, obj.shape, obj.size * 1.5, true);
            }

            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 50%, 0.08)`;
            ctx.lineWidth = 0.5;
            this._drawShape(ctx, obj.shape, obj.size, false);

            ctx.restore();
        }
    }

    _drawShape(ctx, shape, size, fill) {
        ctx.beginPath();
        switch (shape) {
            case 0:
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                break;
            case 1:
                ctx.rect(-size / 2, -size / 2, size, size);
                break;
            case 2:
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2, size / 2);
                ctx.lineTo(-size / 2, size / 2);
                ctx.closePath();
                break;
            case 3:
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2, 0);
                ctx.lineTo(0, size / 2);
                ctx.lineTo(-size / 2, 0);
                ctx.closePath();
                break;
        }
        if (fill) ctx.fill();
        else ctx.stroke();
    }

    _drawQuantumSuperposition(ctx) {
        for (let b = 0; b < this.quantumPaths.length; b++) {
            const path = this.quantumPaths[b];
            if (path.points.length < 2) continue;

            const alpha = 0.12 / this.quantumBranches;
            const hue = (this.hue + path.hueOffset + 360) % 360;

            // Draw path with smooth interpolation
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                const prev = path.points[i - 1];
                const cur = path.points[i];
                const cpx = (prev.x + cur.x) / 2;
                const cpy = (prev.y + cur.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
            }
            ctx.stroke();

            // Draw quantum "probability cloud" at head with shimmer
            const head = path.points[path.points.length - 1];
            const shimmer = 0.7 + Math.sin(this.tick * 0.08 + b * 1.5) * 0.3;
            const cloudSize = (8 + Math.sin(this.tick * 0.05 + b) * 4) * shimmer;

            // Outer probability cloud
            ctx.fillStyle = `hsla(${hue}, 60%, 55%, ${alpha * 1.5})`;
            ctx.beginPath();
            ctx.arc(head.x, head.y, cloudSize * 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright core
            ctx.fillStyle = `hsla(${hue}, 80%, 75%, ${alpha * 3})`;
            ctx.beginPath();
            ctx.arc(head.x, head.y, cloudSize * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Draw "collapse" connections between branches (manual dashes to avoid setLineDash overhead)
            if (b > 0) {
                const prevPath = this.quantumPaths[b - 1];
                if (prevPath.points.length > 0) {
                    const prevHead = prevPath.points[prevPath.points.length - 1];
                    const pdx = head.x - prevHead.x;
                    const pdy = head.y - prevHead.y;
                    const dist = Math.sqrt(pdx * pdx + pdy * pdy);
                    if (dist < 100) {
                        const lineAlpha = (1 - dist / 100) * alpha;
                        ctx.strokeStyle = `hsla(${this.hue}, 40%, 50%, ${lineAlpha})`;
                        ctx.lineWidth = 0.3;
                        // Manual dashed line (avoids setLineDash/resetLineDash per frame)
                        const nx = pdx / dist, ny = pdy / dist;
                        const dashLen = 2, gapLen = 4, stepLen = dashLen + gapLen;
                        ctx.beginPath();
                        for (let d = 0; d < dist; d += stepLen) {
                            const sx = prevHead.x + nx * d;
                            const sy = prevHead.y + ny * d;
                            const segEnd = Math.min(d + dashLen, dist);
                            ctx.moveTo(sx, sy);
                            ctx.lineTo(prevHead.x + nx * segEnd, prevHead.y + ny * segEnd);
                        }
                        ctx.stroke();
                    }
                }
            }
        }

        // Draw interference pattern at center of all quantum paths
        if (this.quantumPaths.length > 1 && this.tick % 2 === 0) {
            let avgX = 0, avgY = 0, count = 0;
            for (const path of this.quantumPaths) {
                if (path.points.length > 0) {
                    const head = path.points[path.points.length - 1];
                    avgX += head.x;
                    avgY += head.y;
                    count++;
                }
            }
            if (count > 0) {
                avgX /= count;
                avgY /= count;
                const interferenceAlpha = 0.03 + Math.sin(this.tick * 0.15) * 0.02;
                ctx.strokeStyle = `hsla(${this.hue}, 50%, 60%, ${interferenceAlpha})`;
                ctx.lineWidth = 0.3;
                ctx.beginPath();
                ctx.arc(avgX, avgY, 15 + Math.sin(this.tick * 0.1) * 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
}
