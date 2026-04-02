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

        // Kaleidoscope
        this.symmetry = 6;
        this.kaleidoTrail = [];
        this.maxKaleidoTrail = 30;

        // Time echoes
        this.echoHistory = []; // ring buffer of past positions
        this.echoHistoryMax = 300;
        this.echoLayers = 5;
        this.echoDelays = [];

        // Dimensional tears
        this.tears = [];
        this.tearPool = [];
        this.maxTears = 8;
        this.tearHue = 0;
        this.tearStyle = 0;

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

        switch (this.mode) {
            case 0: // Kaleidoscope
                this.symmetry = 4 + Math.floor(rng() * 8); // 4-11 fold symmetry
                break;

            case 1: // Time echoes
                this.echoLayers = 3 + Math.floor(rng() * 5);
                this.echoDelays = [];
                for (let i = 0; i < this.echoLayers; i++) {
                    this.echoDelays.push(20 + Math.floor(rng() * 40) * (i + 1));
                }
                break;

            case 2: // Dimensional tears
                this.tearHue = (this.hue + 120 + rng() * 60) % 360; // contrasting hue
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
                        shape: Math.floor(rng() * 4), // 0=circle 1=square 2=triangle 3=diamond
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

        switch (this.mode) {
            case 0: // Kaleidoscope
                this.kaleidoTrail.push({ x: mx, y: my });
                while (this.kaleidoTrail.length > this.maxKaleidoTrail) this.kaleidoTrail.shift();
                break;

            case 1: // Time echoes
                this.echoHistory.push({ x: mx, y: my });
                while (this.echoHistory.length > this.echoHistoryMax) this.echoHistory.shift();
                break;

            case 2: // Dimensional tears
                if (isClicking && this.tears.length < this.maxTears) {
                    const tear = this.tearPool.length > 0 ? this.tearPool.pop() : {};
                    tear.x = mx;
                    tear.y = my;
                    tear.width = 0;
                    tear.height = 0;
                    tear.maxWidth = 30 + Math.random() * 60;
                    tear.maxHeight = 60 + Math.random() * 120;
                    tear.life = 200;
                    tear.angle = Math.random() * Math.PI;
                    tear.phase = 0;
                    this.tears.push(tear);
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
                }
                break;

            case 5: // Quantum superposition
                for (const path of this.quantumPaths) {
                    const offsetX = Math.sin(this.tick * path.freqX + path.phaseX) * this.quantumDrift;
                    const offsetY = Math.cos(this.tick * path.freqY + path.phaseY) * this.quantumDrift;
                    path.points.push({ x: mx + offsetX, y: my + offsetY });
                    while (path.points.length > path.maxPoints) path.points.shift();
                }
                break;
        }
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
        if (this.kaleidoTrail.length < 2) return;
        const cx = w / 2, cy = h / 2;

        for (let s = 0; s < this.symmetry; s++) {
            const angle = (s / this.symmetry) * Math.PI * 2;
            const mirror = s % 2 === 0 ? 1 : -1;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.scale(mirror, 1);
            ctx.translate(-cx, -cy);

            ctx.beginPath();
            ctx.lineWidth = 1.5;
            const alpha = 0.15 / Math.sqrt(this.symmetry);
            ctx.strokeStyle = `hsla(${(this.hue + s * 20) % 360}, ${this.saturation}%, 65%, ${alpha})`;

            for (let i = 0; i < this.kaleidoTrail.length; i++) {
                const p = this.kaleidoTrail[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            // Draw dots at trail points
            for (let i = 0; i < this.kaleidoTrail.length; i += 3) {
                const p = this.kaleidoTrail[i];
                const dotAlpha = (i / this.kaleidoTrail.length) * alpha;
                ctx.fillStyle = `hsla(${(this.hue + s * 20 + i * 5) % 360}, 80%, 70%, ${dotAlpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    _drawTimeEchoes(ctx, w, h) {
        if (this.echoHistory.length < 10) return;

        for (let layer = 0; layer < this.echoLayers; layer++) {
            const delay = this.echoDelays[layer];
            const startIdx = Math.max(0, this.echoHistory.length - delay - 20);
            const endIdx = Math.max(0, this.echoHistory.length - delay);

            if (startIdx >= endIdx) continue;

            const alpha = 0.08 / (layer + 1);
            const hue = (this.hue + layer * 40) % 360;
            const scale = 1 + layer * 0.05;

            ctx.save();
            // Slight scale to give depth illusion
            ctx.translate(w / 2, h / 2);
            ctx.scale(scale, scale);
            ctx.translate(-w / 2, -h / 2);

            // Draw echo trail
            ctx.beginPath();
            ctx.lineWidth = 2 + layer;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
            for (let i = startIdx; i < endIdx; i++) {
                const p = this.echoHistory[i];
                if (i === startIdx) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            // Ghost dot at echo head
            if (endIdx > 0) {
                const head = this.echoHistory[endIdx - 1];
                ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha * 3})`;
                ctx.beginPath();
                ctx.arc(head.x, head.y, 4 + layer * 2, 0, Math.PI * 2);
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

            // The tear crack
            ctx.strokeStyle = `hsla(${this.tearHue}, 90%, 80%, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const segments = 8;
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const y = (t - 0.5) * tear.height;
                const wobble = Math.sin(t * Math.PI * 3 + tear.phase * 0.05) * tear.width * 0.3;
                if (i === 0) ctx.moveTo(wobble, y);
                else ctx.lineTo(wobble, y);
            }
            ctx.stroke();

            // Glow around tear
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(tear.width, tear.height));
            grad.addColorStop(0, `hsla(${this.tearHue}, 80%, 70%, ${alpha * 0.5})`);
            grad.addColorStop(0.5, `hsla(${this.tearHue}, 60%, 40%, ${alpha * 0.2})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(-tear.width * 2, -tear.height, tear.width * 4, tear.height * 2);

            // "Other dimension" streaks emanating from tear
            if (this.tearStyle >= 1) {
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * Math.PI * 2 + tear.phase * 0.02;
                    const len = 20 + Math.sin(tear.phase * 0.1 + i) * 15;
                    ctx.strokeStyle = `hsla(${(this.tearHue + 60) % 360}, 70%, 60%, ${alpha * 0.4})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                    ctx.stroke();
                }
            }

            ctx.restore();
        }
    }

    _drawParallaxLayers(ctx, w, h) {
        const mx = w / 2;
        const my = h / 2;

        for (const layer of this.layers) {
            const offsetX = (mx - w / 2) * layer.depth * 0.1;
            const offsetY = (my - h / 2) * layer.depth * 0.1;
            const drift = this.tick * 0.2 * layer.depth;

            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.globalAlpha = layer.opacity;

            for (const el of layer.elements) {
                const x = ((el.x + drift) % (w + 100)) - 50;
                const y = el.y;
                const size = el.size * (0.5 + layer.depth * 0.5);

                ctx.fillStyle = `hsla(${layer.hue}, ${this.saturation}%, 50%, 0.5)`;
                ctx.strokeStyle = `hsla(${layer.hue}, ${this.saturation}%, 70%, 0.3)`;
                ctx.lineWidth = 0.5;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(el.rotation + this.tick * 0.001 * layer.depth);

                switch (el.shape) {
                    case 0: // Circle
                        ctx.beginPath();
                        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                        ctx.stroke();
                        break;
                    case 1: // Line
                        ctx.beginPath();
                        ctx.moveTo(-size / 2, 0);
                        ctx.lineTo(size / 2, 0);
                        ctx.stroke();
                        break;
                    case 2: // Cross
                        ctx.beginPath();
                        ctx.moveTo(-size / 3, 0); ctx.lineTo(size / 3, 0);
                        ctx.moveTo(0, -size / 3); ctx.lineTo(0, size / 3);
                        ctx.stroke();
                        break;
                }

                ctx.restore();
            }

            ctx.restore();
        }
    }

    _drawShadowTheater(ctx, w, h) {
        // Use mouse position as light source
        const lightX = this.kaleidoTrail?.length > 0 ? this.kaleidoTrail[this.kaleidoTrail.length - 1]?.x : w / 2;
        const lightY = this.kaleidoTrail?.length > 0 ? this.kaleidoTrail[this.kaleidoTrail.length - 1]?.y : h / 2;

        for (const obj of this.shadowObjects) {
            const dx = obj.x - (lightX || w / 2);
            const dy = obj.y - (lightY || h / 2);
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

            switch (obj.shape) {
                case 0:
                    ctx.beginPath(); ctx.arc(0, 0, obj.size / 2, 0, Math.PI * 2); ctx.fill();
                    break;
                case 1:
                    ctx.fillRect(-obj.size / 2, -obj.size / 2, obj.size, obj.size);
                    break;
                case 2:
                    ctx.beginPath();
                    ctx.moveTo(0, -obj.size / 2);
                    ctx.lineTo(obj.size / 2, obj.size / 2);
                    ctx.lineTo(-obj.size / 2, obj.size / 2);
                    ctx.closePath(); ctx.fill();
                    break;
                case 3:
                    ctx.beginPath();
                    ctx.moveTo(0, -obj.size / 2);
                    ctx.lineTo(obj.size / 2, 0);
                    ctx.lineTo(0, obj.size / 2);
                    ctx.lineTo(-obj.size / 2, 0);
                    ctx.closePath(); ctx.fill();
                    break;
            }
            ctx.restore();

            // Draw the object itself (faint outline)
            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 50%, 0.08)`;
            ctx.lineWidth = 0.5;
            ctx.globalCompositeOperation = 'lighter';
            switch (obj.shape) {
                case 0:
                    ctx.beginPath(); ctx.arc(0, 0, obj.size / 2, 0, Math.PI * 2); ctx.stroke();
                    break;
                case 1:
                    ctx.strokeRect(-obj.size / 2, -obj.size / 2, obj.size, obj.size);
                    break;
                case 2:
                    ctx.beginPath();
                    ctx.moveTo(0, -obj.size / 2);
                    ctx.lineTo(obj.size / 2, obj.size / 2);
                    ctx.lineTo(-obj.size / 2, obj.size / 2);
                    ctx.closePath(); ctx.stroke();
                    break;
                case 3:
                    ctx.beginPath();
                    ctx.moveTo(0, -obj.size / 2);
                    ctx.lineTo(obj.size / 2, 0);
                    ctx.lineTo(0, obj.size / 2);
                    ctx.lineTo(-obj.size / 2, 0);
                    ctx.closePath(); ctx.stroke();
                    break;
            }

            ctx.restore();
        }
    }

    _drawQuantumSuperposition(ctx) {
        for (let b = 0; b < this.quantumPaths.length; b++) {
            const path = this.quantumPaths[b];
            if (path.points.length < 2) continue;

            const alpha = 0.12 / this.quantumBranches;
            const hue = (this.hue + path.hueOffset + 360) % 360;

            // Draw path
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
            for (let i = 0; i < path.points.length; i++) {
                const p = path.points[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            // Draw quantum "probability cloud" at head
            const head = path.points[path.points.length - 1];
            const cloudSize = 8 + Math.sin(this.tick * 0.05 + b) * 4;
            ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha * 2})`;
            ctx.beginPath();
            ctx.arc(head.x, head.y, cloudSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw "collapse" connections between branches
            if (b > 0) {
                const prevPath = this.quantumPaths[b - 1];
                if (prevPath.points.length > 0) {
                    const prevHead = prevPath.points[prevPath.points.length - 1];
                    const dx = head.x - prevHead.x;
                    const dy = head.y - prevHead.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.strokeStyle = `hsla(${this.hue}, 40%, 50%, ${(1 - dist / 100) * alpha})`;
                        ctx.lineWidth = 0.3;
                        ctx.setLineDash([2, 4]);
                        ctx.beginPath();
                        ctx.moveTo(head.x, head.y);
                        ctx.lineTo(prevHead.x, prevHead.y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }
        }
    }
}
