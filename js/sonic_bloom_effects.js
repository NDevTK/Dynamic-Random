/**
 * @file sonic_bloom_effects.js
 * @description Expanding geometric mandalas and sacred geometry patterns that bloom
 * outward from click points and mouse movements. Each seed creates completely different
 * geometric personalities - from delicate snowflakes to aggressive starburst explosions.
 *
 * Modes:
 * 0 - Sacred Mandala: intricate rotating symmetrical patterns bloom on click
 * 1 - Shockwave Geometry: expanding polygons with morphing vertex counts
 * 2 - Fibonacci Spiral: golden-ratio spirals unfurl from interaction points
 * 3 - Crystal Growth: geometric crystals grow outward from clicks, branching
 * 4 - Pulse Nova: pulsating starburst rays that sync to an invisible rhythm
 * 5 - Tessellation Wave: expanding tile patterns that fill outward from origin
 */

export class SonicBloom {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 70;
        this.intensity = 1;

        // Active blooms
        this.blooms = [];
        this.bloomPool = [];
        this.maxBlooms = 8;

        // Ambient pulse (always-on subtle effect)
        this.ambientPhase = 0;
        this.ambientSpeed = 0.02;
        this.ambientSymmetry = 6;

        // Sacred Mandala
        this.mandalaLayers = 4;
        this.mandalaPetals = 8;
        this.mandalaRotationSpeed = 0.005;

        // Shockwave
        this.shockVertices = 6;
        this.shockMorph = false;

        // Fibonacci
        this.fiboGoldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
        this.fiboPointCount = 80;

        // Crystal Growth
        this.crystalBranches = 6;
        this.crystalGrowthSpeed = 2;

        // Pulse Nova
        this.novaRayCount = 12;
        this.novaBPM = 120;
        this.novaPulsePhase = 0;

        // Tessellation
        this.tessType = 0; // 0=hex, 1=triangle, 2=square
        this.tessCellSize = 30;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._clickRegistered = false;
        this._clickX = 0;
        this._clickY = 0;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.8;
        this.blooms = [];
        this.ambientPhase = rng() * Math.PI * 2;
        this.ambientSpeed = 0.01 + rng() * 0.03;

        switch (this.mode) {
            case 0:
                this.mandalaLayers = 2 + Math.floor(rng() * 5);
                this.mandalaPetals = 4 + Math.floor(rng() * 12);
                this.mandalaRotationSpeed = 0.002 + rng() * 0.01;
                this.ambientSymmetry = this.mandalaPetals;
                break;
            case 1:
                this.shockVertices = 3 + Math.floor(rng() * 8);
                this.shockMorph = rng() > 0.5;
                break;
            case 2:
                this.fiboPointCount = 40 + Math.floor(rng() * 80);
                break;
            case 3:
                this.crystalBranches = 4 + Math.floor(rng() * 6);
                this.crystalGrowthSpeed = 1 + rng() * 3;
                break;
            case 4:
                this.novaRayCount = 6 + Math.floor(rng() * 18);
                this.novaBPM = 60 + Math.floor(rng() * 120);
                break;
            case 5:
                this.tessType = Math.floor(rng() * 3);
                this.tessCellSize = 20 + rng() * 30;
                break;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;
        this.ambientPhase += this.ambientSpeed;

        // Detect new click
        if (isClicking && !this._isClicking) {
            this._clickRegistered = true;
            this._clickX = mx;
            this._clickY = my;
        }
        this._isClicking = isClicking;

        // Spawn bloom on click
        if (this._clickRegistered) {
            this._clickRegistered = false;
            if (this.blooms.length < this.maxBlooms) {
                const bloom = this.bloomPool.length > 0 ? this.bloomPool.pop() : {};
                bloom.x = this._clickX;
                bloom.y = this._clickY;
                bloom.age = 0;
                bloom.maxAge = 80 + Math.random() * 60;
                bloom.scale = 0;
                bloom.rotation = Math.random() * Math.PI * 2;
                bloom.hue = (this.hue + Math.random() * 40 - 20) % 360;
                this.blooms.push(bloom);
            }
        }

        // Update blooms
        for (let i = this.blooms.length - 1; i >= 0; i--) {
            const b = this.blooms[i];
            b.age++;
            const t = b.age / b.maxAge;
            b.scale = Math.sin(t * Math.PI) * (80 + b.maxAge * 0.5); // ease in-out
            b.rotation += this.mandalaRotationSpeed;
            if (b.age >= b.maxAge) {
                this.bloomPool.push(b);
                this.blooms[i] = this.blooms[this.blooms.length - 1];
                this.blooms.pop();
            }
        }

        // Nova pulse phase
        if (this.mode === 4) {
            this.novaPulsePhase += (this.novaBPM / 60) * (Math.PI * 2 / 60);
        }
    }

    draw(ctx, system) {
        const w = system.width;
        const h = system.height;
        const mx = this._mouseX;
        const my = this._mouseY;

        // Draw ambient cursor-following effect (subtle, always on)
        this._drawAmbientGeometry(ctx, mx, my);

        // Draw active blooms
        for (const bloom of this.blooms) {
            const t = bloom.age / bloom.maxAge;
            switch (this.mode) {
                case 0: this._drawMandala(ctx, bloom, t); break;
                case 1: this._drawShockwave(ctx, bloom, t); break;
                case 2: this._drawFibonacci(ctx, bloom, t); break;
                case 3: this._drawCrystal(ctx, bloom, t); break;
                case 4: this._drawNova(ctx, bloom, t); break;
                case 5: this._drawTessellation(ctx, bloom, t, w, h); break;
            }
        }
    }

    _drawAmbientGeometry(ctx, mx, my) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(mx, my);
        ctx.rotate(this.ambientPhase * 0.5);

        const sym = this.ambientSymmetry;
        const pulse = Math.sin(this.ambientPhase) * 0.5 + 0.5;
        const r = 20 + pulse * 15;

        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${0.04 * this.intensity})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i <= sym; i++) {
            const a = (i / sym) * Math.PI * 2;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    _drawMandala(ctx, bloom, t) {
        const alpha = Math.sin(t * Math.PI) * 0.25 * this.intensity;
        if (alpha < 0.005) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(bloom.x, bloom.y);
        ctx.rotate(bloom.rotation);

        for (let layer = 0; layer < this.mandalaLayers; layer++) {
            const layerR = bloom.scale * (0.3 + layer * 0.25);
            const layerAlpha = alpha * (1 - layer / this.mandalaLayers);
            const hueShift = (bloom.hue + layer * 30) % 360;

            ctx.strokeStyle = `hsla(${hueShift}, ${this.saturation}%, 70%, ${layerAlpha})`;
            ctx.lineWidth = 1;

            // Petal pattern
            for (let p = 0; p < this.mandalaPetals; p++) {
                const angle = (p / this.mandalaPetals) * Math.PI * 2;
                ctx.save();
                ctx.rotate(angle);

                // Petal shape using bezier curves
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const petalLen = layerR;
                const petalWidth = layerR * 0.3;
                ctx.bezierCurveTo(
                    petalWidth, petalLen * 0.3,
                    petalWidth, petalLen * 0.7,
                    0, petalLen
                );
                ctx.bezierCurveTo(
                    -petalWidth, petalLen * 0.7,
                    -petalWidth, petalLen * 0.3,
                    0, 0
                );
                ctx.stroke();
                ctx.restore();
            }

            // Connecting circle
            ctx.beginPath();
            ctx.arc(0, 0, layerR * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawShockwave(ctx, bloom, t) {
        const alpha = Math.sin(t * Math.PI) * 0.3 * this.intensity;
        if (alpha < 0.005) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(bloom.x, bloom.y);
        ctx.rotate(bloom.rotation);

        const vertices = this.shockMorph
            ? Math.round(this.shockVertices + Math.sin(t * Math.PI * 3) * 2)
            : this.shockVertices;
        const vCount = Math.max(3, vertices);

        // Multiple expanding polygons
        for (let ring = 0; ring < 3; ring++) {
            const r = bloom.scale * (0.5 + ring * 0.3) * (0.5 + t);
            const ringAlpha = alpha * (1 - ring * 0.3);
            const hueShift = (bloom.hue + ring * 40 + t * 60) % 360;

            ctx.strokeStyle = `hsla(${hueShift}, ${this.saturation}%, 70%, ${ringAlpha})`;
            ctx.lineWidth = 2 - ring * 0.5;
            ctx.beginPath();
            for (let i = 0; i <= vCount; i++) {
                const a = (i / vCount) * Math.PI * 2;
                const wobble = Math.sin(a * 3 + this.tick * 0.1) * r * 0.05;
                const px = Math.cos(a) * (r + wobble);
                const py = Math.sin(a) * (r + wobble);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawFibonacci(ctx, bloom, t) {
        const alpha = Math.sin(t * Math.PI) * 0.2 * this.intensity;
        if (alpha < 0.005) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const pointsToShow = Math.floor(this.fiboPointCount * t);
        const maxR = bloom.scale;

        for (let i = 0; i < pointsToShow; i++) {
            const angle = i * this.fiboGoldenAngle + bloom.rotation;
            const r = Math.sqrt(i / this.fiboPointCount) * maxR;
            const px = bloom.x + Math.cos(angle) * r;
            const py = bloom.y + Math.sin(angle) * r;
            const pointAlpha = alpha * (1 - i / this.fiboPointCount) * 0.8;
            const size = 1 + (1 - i / this.fiboPointCount) * 3;
            const hueShift = (bloom.hue + i * 3) % 360;

            ctx.fillStyle = `hsla(${hueShift}, ${this.saturation}%, 70%, ${pointAlpha})`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Connecting spiral arms
        ctx.strokeStyle = `hsla(${bloom.hue}, ${this.saturation}%, 65%, ${alpha * 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < pointsToShow; i++) {
            const angle = i * this.fiboGoldenAngle + bloom.rotation;
            const r = Math.sqrt(i / this.fiboPointCount) * maxR;
            const px = bloom.x + Math.cos(angle) * r;
            const py = bloom.y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.restore();
    }

    _drawCrystal(ctx, bloom, t) {
        const alpha = Math.sin(t * Math.PI) * 0.25 * this.intensity;
        if (alpha < 0.005) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(bloom.x, bloom.y);

        const branches = this.crystalBranches;
        const maxLen = bloom.scale;
        const growT = Math.min(1, t * 2); // Grows in first half, fades in second

        for (let b = 0; b < branches; b++) {
            const angle = (b / branches) * Math.PI * 2 + bloom.rotation;
            const hueShift = (bloom.hue + b * 20) % 360;

            this._drawCrystalBranch(ctx, 0, 0, angle, maxLen * growT, alpha, hueShift, 3);
        }

        // Central crystal node
        const nodeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
        nodeGrad.addColorStop(0, `hsla(${bloom.hue}, 80%, 90%, ${alpha})`);
        nodeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nodeGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawCrystalBranch(ctx, x, y, angle, length, alpha, hue, depth) {
        if (depth <= 0 || length < 5) return;

        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 75%, ${alpha * (depth / 3)})`;
        ctx.lineWidth = depth * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Sub-branches
        const subAngleSpread = 0.5 + (3 - depth) * 0.2;
        this._drawCrystalBranch(ctx, endX, endY, angle - subAngleSpread, length * 0.6, alpha * 0.7, (hue + 15) % 360, depth - 1);
        this._drawCrystalBranch(ctx, endX, endY, angle + subAngleSpread, length * 0.6, alpha * 0.7, (hue + 15) % 360, depth - 1);
    }

    _drawNova(ctx, bloom, t) {
        const alpha = Math.sin(t * Math.PI) * 0.2 * this.intensity;
        if (alpha < 0.005) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(bloom.x, bloom.y);

        const pulseBeat = Math.sin(this.novaPulsePhase) * 0.5 + 0.5;
        const rays = this.novaRayCount;

        for (let i = 0; i < rays; i++) {
            const angle = (i / rays) * Math.PI * 2 + bloom.rotation;
            const rayLen = bloom.scale * (0.5 + pulseBeat * 0.5);
            const rayWidth = Math.max(0.2, 3 * (1 - t));
            const hueShift = (bloom.hue + i * (360 / rays)) % 360;

            // Tapered ray
            const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
            grad.addColorStop(0, `hsla(${hueShift}, ${this.saturation}%, 80%, ${alpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.strokeStyle = grad;
            ctx.lineWidth = rayWidth;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
            ctx.stroke();
        }

        // Central pulse glow
        const glowR = 15 * pulseBeat * (1 - t) + 5;
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
        glowGrad.addColorStop(0, `hsla(${bloom.hue}, 90%, 85%, ${alpha * 1.5})`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawTessellation(ctx, bloom, t, w, h) {
        const alpha = Math.sin(t * Math.PI) * 0.08 * this.intensity;
        if (alpha < 0.003) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const maxDist = bloom.scale * 1.5;
        const cellSize = this.tessCellSize;

        // Determine cells within range of bloom
        const minCol = Math.max(0, Math.floor((bloom.x - maxDist) / cellSize));
        const maxCol = Math.min(Math.ceil(w / cellSize), Math.ceil((bloom.x + maxDist) / cellSize));
        const minRow = Math.max(0, Math.floor((bloom.y - maxDist) / cellSize));
        const maxRow = Math.min(Math.ceil(h / cellSize), Math.ceil((bloom.y + maxDist) / cellSize));

        for (let row = minRow; row < maxRow; row++) {
            for (let col = minCol; col < maxCol; col++) {
                const cx = col * cellSize + cellSize * 0.5;
                const cy = row * cellSize + cellSize * 0.5;
                const dx = cx - bloom.x;
                const dy = cy - bloom.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > maxDist) continue;

                const cellAlpha = alpha * (1 - dist / maxDist);
                const hueShift = (bloom.hue + dist * 0.5) % 360;

                ctx.strokeStyle = `hsla(${hueShift}, ${this.saturation}%, 65%, ${cellAlpha})`;
                ctx.lineWidth = 0.5;

                if (this.tessType === 0) {
                    // Hexagon
                    this._drawHex(ctx, cx, cy, cellSize * 0.45);
                } else if (this.tessType === 1) {
                    // Triangle
                    const flip = (row + col) % 2 === 0;
                    this._drawTri(ctx, cx, cy, cellSize * 0.45, flip);
                } else {
                    // Diamond/square rotated
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(Math.PI / 4 + dist * 0.01);
                    ctx.strokeRect(-cellSize * 0.3, -cellSize * 0.3, cellSize * 0.6, cellSize * 0.6);
                    ctx.restore();
                }
            }
        }

        ctx.restore();
    }

    _drawHex(ctx, cx, cy, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }

    _drawTri(ctx, cx, cy, r, flip) {
        ctx.beginPath();
        const offset = flip ? 0 : Math.PI;
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + offset - Math.PI / 2;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }
}
