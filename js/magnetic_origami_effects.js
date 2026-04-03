/**
 * @file magnetic_origami_effects.js
 * @description Geometric shapes that fold/unfold based on mouse proximity. Seed determines
 * base shape type, fold complexity, and material appearance. Clicking triggers fold
 * animations. Different seeds create entirely different origami patterns: paper cranes
 * that flap, stars that collapse, boxes that open, flowers that bloom.
 *
 * Modes (seed-selected):
 * 0 - Crane Flock: paper cranes that flap wings near cursor, fold when clicked
 * 1 - Star Collapse: multi-pointed stars that compress/expand with interaction
 * 2 - Box Array: cubes that open faces toward cursor, cascade folding
 * 3 - Lotus Bloom: layered petals that open/close based on distance
 * 4 - Fractal Fold: recursive triangles that subdivide near cursor
 */

const TAU = Math.PI * 2;

export class MagneticOrigami {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 340;
        this.saturation = 60;
        this._rng = Math.random;

        this.shapes = [];
        this.maxShapes = 30;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._mouseSpeed = 0;
        this._prevMX = 0;
        this._prevMY = 0;

        this._foldSpeed = 0.05;
        this._unfoldSpeed = 0.03;
        this._influenceRadius = 200;
        this._paperHue = 0;
        this._foldHue = 0;
        this._creaseAlpha = 0.1;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 5);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 40 + rng() * 40;
        this.tick = 0;
        this._rng = rng;
        this.shapes = [];

        this._foldSpeed = 0.03 + rng() * 0.05;
        this._unfoldSpeed = 0.02 + rng() * 0.03;
        this._influenceRadius = 150 + rng() * 120;
        this._paperHue = this.hue;
        this._foldHue = (this.hue + 30 + rng() * 40) % 360;
        this._creaseAlpha = 0.06 + rng() * 0.08;

        const W = window.innerWidth, H = window.innerHeight;
        const count = 12 + Math.floor(rng() * 18);

        for (let i = 0; i < count && this.shapes.length < this.maxShapes; i++) {
            const x = W * (0.08 + rng() * 0.84);
            const y = H * (0.08 + rng() * 0.84);

            switch (this.mode) {
                case 0: this.shapes.push(this._makeCrane(x, y, rng)); break;
                case 1: this.shapes.push(this._makeStar(x, y, rng)); break;
                case 2: this.shapes.push(this._makeBox(x, y, rng)); break;
                case 3: this.shapes.push(this._makeLotus(x, y, rng)); break;
                case 4: this.shapes.push(this._makeFractal(x, y, rng)); break;
            }
        }
    }

    _makeCrane(x, y, rng) {
        return {
            x, y,
            size: 20 + rng() * 25,
            fold: 0, // 0 = flat, 1 = fully folded
            targetFold: 0,
            wingAngle: 0,
            wingSpeed: 0.05 + rng() * 0.05,
            rotation: rng() * TAU,
            rotSpeed: (rng() - 0.5) * 0.005,
            hue: (this._paperHue + rng() * 30 - 15 + 360) % 360,
            drift: { x: (rng() - 0.5) * 0.3, y: (rng() - 0.5) * 0.3 },
        };
    }

    _makeStar(x, y, rng) {
        const points = 4 + Math.floor(rng() * 5);
        return {
            x, y,
            size: 25 + rng() * 30,
            fold: 0,
            targetFold: 0,
            points,
            innerRatio: 0.3 + rng() * 0.3,
            rotation: rng() * TAU,
            rotSpeed: (rng() - 0.5) * 0.01,
            hue: (this._paperHue + rng() * 40 - 20 + 360) % 360,
            pulsePhase: rng() * TAU,
        };
    }

    _makeBox(x, y, rng) {
        return {
            x, y,
            size: 18 + rng() * 20,
            fold: 0,
            targetFold: 0,
            openFace: -1, // Which face opens (-1 = none)
            rotation: rng() * 0.4 - 0.2,
            hue: (this._paperHue + rng() * 30 - 15 + 360) % 360,
            depth: 0.6 + rng() * 0.4, // Perspective depth
        };
    }

    _makeLotus(x, y, rng) {
        const layers = 3 + Math.floor(rng() * 3);
        const petalsPerLayer = 5 + Math.floor(rng() * 4);
        return {
            x, y,
            size: 30 + rng() * 25,
            fold: 1, // Starts closed
            targetFold: 1,
            layers,
            petalsPerLayer,
            rotation: rng() * TAU,
            rotSpeed: 0.001 + rng() * 0.003,
            hue: (this._paperHue + rng() * 20 - 10 + 360) % 360,
        };
    }

    _makeFractal(x, y, rng) {
        return {
            x, y,
            size: 35 + rng() * 30,
            fold: 0,
            targetFold: 0,
            depth: 0, // Current subdivision depth (0-3)
            maxDepth: 2 + Math.floor(rng() * 2),
            rotation: rng() * TAU,
            rotSpeed: (rng() - 0.5) * 0.005,
            hue: (this._paperHue + rng() * 40 - 20 + 360) % 360,
        };
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

        if (isClicking && !this._wasClicking) {
            // Trigger fold/unfold for shapes near click
            for (const s of this.shapes) {
                const sdx = s.x - mx, sdy = s.y - my;
                if (sdx * sdx + sdy * sdy < this._influenceRadius * this._influenceRadius) {
                    s.targetFold = s.targetFold > 0.5 ? 0 : 1;
                }
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        const W = window.innerWidth, H = window.innerHeight;

        for (const s of this.shapes) {
            // Distance to mouse
            const sdx = s.x - mx;
            const sdy = s.y - my;
            const dist = Math.sqrt(sdx * sdx + sdy * sdy);
            const proximity = Math.max(0, 1 - dist / this._influenceRadius);

            // Proximity-based fold influence
            if (this.mode === 3) {
                // Lotus: opens when cursor is near
                s.targetFold = 1 - proximity;
            } else if (this.mode === 4) {
                // Fractal: subdivides more when cursor is near
                s.depth = Math.floor(proximity * (s.maxDepth + 1));
            }

            // Smooth fold interpolation
            const foldDelta = s.targetFold - s.fold;
            if (Math.abs(foldDelta) > 0.001) {
                s.fold += foldDelta * (foldDelta > 0 ? this._foldSpeed : this._unfoldSpeed);
            }

            // Crane wing flapping
            if (this.mode === 0 && proximity > 0.3) {
                s.wingAngle = Math.sin(this.tick * s.wingSpeed) * proximity * 0.8;
            } else if (this.mode === 0) {
                s.wingAngle *= 0.95;
            }

            // Box face opening
            if (this.mode === 2) {
                if (proximity > 0.3) {
                    // Open face toward cursor
                    const angle = Math.atan2(-sdy, -sdx);
                    s.openFace = Math.round(((angle + TAU) % TAU) / (TAU / 4)) % 4;
                } else {
                    s.openFace = -1;
                }
            }

            // Rotation
            s.rotation += s.rotSpeed || 0;

            // Gentle drift
            if (s.drift) {
                s.x += s.drift.x;
                s.y += s.drift.y;
                if (s.x < -s.size) s.x = W + s.size;
                if (s.x > W + s.size) s.x = -s.size;
                if (s.y < -s.size) s.y = H + s.size;
                if (s.y > H + s.size) s.y = -s.size;
            }

            // Gentle push from cursor
            if (dist < this._influenceRadius && dist > 0) {
                const push = proximity * 0.5;
                s.x += (sdx / dist) * push;
                s.y += (sdy / dist) * push;
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const s of this.shapes) {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);

            switch (this.mode) {
                case 0: this._drawCrane(ctx, s); break;
                case 1: this._drawStar(ctx, s); break;
                case 2: this._drawBox(ctx, s); break;
                case 3: this._drawLotus(ctx, s); break;
                case 4: this._drawFractal(ctx, s, 0, 0, s.size, 0, s.depth); break;
            }

            ctx.restore();
        }

        ctx.restore();
    }

    _drawCrane(ctx, s) {
        const sz = s.size;
        const fold = s.fold;
        const wing = s.wingAngle;
        const alpha = 0.12 + (1 - fold) * 0.08;

        // Body (diamond)
        ctx.fillStyle = `hsla(${s.hue}, ${this.saturation}%, 55%, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.4);
        ctx.lineTo(sz * 0.15, 0);
        ctx.lineTo(0, sz * 0.6);
        ctx.lineTo(-sz * 0.15, 0);
        ctx.closePath();
        ctx.fill();

        // Left wing
        ctx.save();
        ctx.rotate(-wing);
        ctx.fillStyle = `hsla(${s.hue}, ${this.saturation}%, 60%, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.1);
        ctx.lineTo(-sz * (0.8 - fold * 0.4), -sz * 0.3 * (1 - fold));
        ctx.lineTo(-sz * 0.1, sz * 0.1);
        ctx.closePath();
        ctx.fill();
        // Crease line
        ctx.strokeStyle = `hsla(${this._foldHue}, ${this.saturation}%, 70%, ${this._creaseAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-sz * (0.5 - fold * 0.2), -sz * 0.15 * (1 - fold));
        ctx.stroke();
        ctx.restore();

        // Right wing (mirrored)
        ctx.save();
        ctx.rotate(wing);
        ctx.fillStyle = `hsla(${s.hue}, ${this.saturation}%, 60%, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.1);
        ctx.lineTo(sz * (0.8 - fold * 0.4), -sz * 0.3 * (1 - fold));
        ctx.lineTo(sz * 0.1, sz * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `hsla(${this._foldHue}, ${this.saturation}%, 70%, ${this._creaseAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sz * (0.5 - fold * 0.2), -sz * 0.15 * (1 - fold));
        ctx.stroke();
        ctx.restore();

        // Head
        ctx.fillStyle = `hsla(${s.hue}, ${this.saturation}%, 65%, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.4);
        ctx.lineTo(sz * 0.05, -sz * 0.6);
        ctx.lineTo(-sz * 0.05, -sz * 0.6);
        ctx.closePath();
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(0, sz * 0.6);
        ctx.lineTo(sz * 0.08, sz * 0.8);
        ctx.lineTo(-sz * 0.08, sz * 0.8);
        ctx.closePath();
        ctx.fill();
    }

    _drawStar(ctx, s) {
        const sz = s.size;
        const fold = s.fold;
        const alpha = 0.08 + (1 - fold) * 0.12;
        const pulse = Math.sin(this.tick * 0.02 + (s.pulsePhase || 0)) * 0.1;
        const outerR = sz * (1 - fold * 0.5) * (1 + pulse);
        const innerR = outerR * s.innerRatio;

        // Star shape
        ctx.fillStyle = `hsla(${s.hue}, ${this.saturation}%, 55%, ${alpha})`;
        ctx.strokeStyle = `hsla(${this._foldHue}, ${this.saturation}%, 70%, ${this._creaseAlpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < s.points * 2; i++) {
            const a = (i / (s.points * 2)) * TAU;
            const r = i % 2 === 0 ? outerR : innerR;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fold crease lines
        for (let i = 0; i < s.points; i++) {
            const a = (i / s.points) * TAU;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
            ctx.stroke();
        }

        // Center glow when folding
        if (fold > 0.2) {
            ctx.fillStyle = `hsla(${s.hue}, 80%, 75%, ${fold * 0.1})`;
            ctx.beginPath();
            ctx.arc(0, 0, innerR * fold, 0, TAU);
            ctx.fill();
        }
    }

    _drawBox(ctx, s) {
        const sz = s.size;
        const fold = s.fold;
        const d = s.depth;
        const alpha = 0.07 + (1 - fold) * 0.08;

        // Front face
        ctx.fillStyle = `hsla(${s.hue}, ${this.saturation}%, 50%, ${alpha})`;
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.strokeStyle = `hsla(${this._foldHue}, ${this.saturation}%, 65%, ${this._creaseAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);

        // Perspective depth lines
        const dx = sz * d * 0.3;
        const dy = -sz * d * 0.3;
        ctx.strokeStyle = `hsla(${s.hue}, ${this.saturation}%, 55%, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(sz / 2, -sz / 2); ctx.lineTo(sz / 2 + dx, -sz / 2 + dy);
        ctx.moveTo(sz / 2, sz / 2); ctx.lineTo(sz / 2 + dx, sz / 2 + dy);
        ctx.moveTo(-sz / 2, -sz / 2); ctx.lineTo(-sz / 2 + dx, -sz / 2 + dy);
        ctx.stroke();

        // Top face
        ctx.fillStyle = `hsla(${s.hue}, ${this.saturation}%, 60%, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(-sz / 2, -sz / 2);
        ctx.lineTo(-sz / 2 + dx, -sz / 2 + dy);
        ctx.lineTo(sz / 2 + dx, -sz / 2 + dy);
        ctx.lineTo(sz / 2, -sz / 2);
        ctx.closePath();
        ctx.fill();

        // Open face flap
        if (s.openFace >= 0) {
            const flapOpen = Math.sin(this.tick * 0.05) * 0.3 + 0.5;
            ctx.save();
            const flapAlpha = alpha * 0.8;
            ctx.fillStyle = `hsla(${(s.hue + 20) % 360}, ${this.saturation}%, 65%, ${flapAlpha * flapOpen})`;

            switch (s.openFace) {
                case 0: // Right
                    ctx.beginPath();
                    ctx.moveTo(sz / 2, -sz / 2);
                    ctx.lineTo(sz / 2 + sz * flapOpen, -sz / 2 * (1 - flapOpen));
                    ctx.lineTo(sz / 2 + sz * flapOpen, sz / 2 * (1 - flapOpen));
                    ctx.lineTo(sz / 2, sz / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 1: // Top
                    ctx.beginPath();
                    ctx.moveTo(-sz / 2, -sz / 2);
                    ctx.lineTo(-sz / 2 * (1 - flapOpen), -sz / 2 - sz * flapOpen);
                    ctx.lineTo(sz / 2 * (1 - flapOpen), -sz / 2 - sz * flapOpen);
                    ctx.lineTo(sz / 2, -sz / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 2: // Left
                    ctx.beginPath();
                    ctx.moveTo(-sz / 2, -sz / 2);
                    ctx.lineTo(-sz / 2 - sz * flapOpen, -sz / 2 * (1 - flapOpen));
                    ctx.lineTo(-sz / 2 - sz * flapOpen, sz / 2 * (1 - flapOpen));
                    ctx.lineTo(-sz / 2, sz / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 3: // Bottom
                    ctx.beginPath();
                    ctx.moveTo(-sz / 2, sz / 2);
                    ctx.lineTo(-sz / 2 * (1 - flapOpen), sz / 2 + sz * flapOpen);
                    ctx.lineTo(sz / 2 * (1 - flapOpen), sz / 2 + sz * flapOpen);
                    ctx.lineTo(sz / 2, sz / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
            }
            ctx.restore();
        }

        // Diagonal crease
        ctx.strokeStyle = `hsla(${this._foldHue}, ${this.saturation}%, 70%, ${this._creaseAlpha * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(-sz / 2, -sz / 2);
        ctx.lineTo(sz / 2, sz / 2);
        ctx.stroke();
    }

    _drawLotus(ctx, s) {
        const sz = s.size;
        const fold = s.fold; // 1 = closed, 0 = fully open
        const alpha = 0.06 + (1 - fold) * 0.1;

        for (let layer = s.layers - 1; layer >= 0; layer--) {
            const layerFold = Math.max(0, Math.min(1, fold + (layer - 1) * 0.15));
            const layerOffset = layer * (TAU / s.petalsPerLayer / s.layers) * 0.5;
            const layerSize = sz * (0.6 + layer * 0.15);
            const layerHue = (s.hue + layer * 15) % 360;

            for (let p = 0; p < s.petalsPerLayer; p++) {
                const baseAngle = (p / s.petalsPerLayer) * TAU + layerOffset;
                const openAngle = baseAngle;
                const petalLength = layerSize * (1 - layerFold * 0.6);
                const petalWidth = layerSize * 0.25 * (1 - layerFold * 0.3);

                // Petal lifts up when closed (z-axis simulation via size reduction)
                const zScale = 1 - layerFold * 0.4;

                ctx.fillStyle = `hsla(${layerHue}, ${this.saturation}%, ${50 + layer * 5}%, ${alpha * zScale})`;
                ctx.beginPath();

                const tipX = Math.cos(openAngle) * petalLength;
                const tipY = Math.sin(openAngle) * petalLength;
                const perpX = -Math.sin(openAngle) * petalWidth;
                const perpY = Math.cos(openAngle) * petalWidth;

                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(
                    tipX * 0.5 + perpX, tipY * 0.5 + perpY,
                    tipX, tipY
                );
                ctx.quadraticCurveTo(
                    tipX * 0.5 - perpX, tipY * 0.5 - perpY,
                    0, 0
                );
                ctx.fill();

                // Crease line
                ctx.strokeStyle = `hsla(${this._foldHue}, ${this.saturation}%, 70%, ${this._creaseAlpha * zScale})`;
                ctx.lineWidth = 0.3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(tipX * 0.9, tipY * 0.9);
                ctx.stroke();
            }
        }

        // Center dot
        ctx.fillStyle = `hsla(${(s.hue + 60) % 360}, 80%, 70%, ${0.15 * (1 - fold)})`;
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.1, 0, TAU);
        ctx.fill();
    }

    _drawFractal(ctx, s, cx, cy, size, angle, depth) {
        if (size < 4 || depth < 0) return;

        const h = size * 0.866; // sqrt(3)/2
        const alpha = 0.05 + (depth / (s.maxDepth + 1)) * 0.06;
        const hueShift = depth * 20;

        // Draw triangle
        ctx.strokeStyle = `hsla(${(s.hue + hueShift) % 360}, ${this.saturation}%, 60%, ${alpha})`;
        ctx.lineWidth = 0.5 + depth * 0.3;
        ctx.beginPath();

        const p1x = cx + Math.cos(angle - Math.PI / 2) * size;
        const p1y = cy + Math.sin(angle - Math.PI / 2) * size;
        const p2x = cx + Math.cos(angle + Math.PI / 6) * size;
        const p2y = cy + Math.sin(angle + Math.PI / 6) * size;
        const p3x = cx + Math.cos(angle + 5 * Math.PI / 6) * size;
        const p3y = cy + Math.sin(angle + 5 * Math.PI / 6) * size;

        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();
        ctx.stroke();

        // Fill with slight color
        ctx.fillStyle = `hsla(${(s.hue + hueShift) % 360}, ${this.saturation}%, 50%, ${alpha * 0.3})`;
        ctx.fill();

        // Recurse into sub-triangles
        if (depth > 0) {
            const newSize = size * 0.5;
            this._drawFractal(ctx, s, (p1x + p2x) / 2, (p1y + p2y) / 2, newSize, angle + 0.1, depth - 1);
            this._drawFractal(ctx, s, (p2x + p3x) / 2, (p2y + p3y) / 2, newSize, angle - 0.1, depth - 1);
            this._drawFractal(ctx, s, (p3x + p1x) / 2, (p3y + p1y) / 2, newSize, angle + 0.05, depth - 1);
        }
    }
}
