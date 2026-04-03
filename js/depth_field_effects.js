/**
 * @file depth_field_effects.js
 * @description Parallax depth field with floating geometric objects at different z-depths.
 * Mouse acts as a viewport, creating parallax shifting. Objects at different depths
 * move at different rates, creating a rich 3D illusion. Clicking spawns depth-aware bursts.
 *
 * Modes:
 * 0 - Cosmic Debris: Asteroids, dust rings, and distant stars at varying depths
 * 1 - Undersea Canyon: Floating jellyfish silhouettes, bubbles, kelp at ocean depths
 * 2 - Geometric Rain: Shapes falling at different speeds through layered fog planes
 * 3 - Floating Runes: Ancient symbols hovering at different depths, glowing softly
 * 4 - Particle Nebula: Dense clouds of particles forming nebula shapes across depth layers
 * 5 - Crystal Cavern: Stalactites and floating crystals with depth-based color shifts
 */

const TAU = Math.PI * 2;

export class DepthField {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Depth layers (0 = far background, higher = closer)
        this._layers = [];
        this._numLayers = 5;

        // Objects per layer
        this._objects = [];

        // Burst particles
        this._bursts = [];
        this._burstPool = [];

        // Parallax offset
        this._offsetX = 0;
        this._offsetY = 0;

        // Fog planes for geometric rain
        this._fogAlpha = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.intensity = 0.5 + rng() * 0.5;
        this._bursts = [];

        const W = window.innerWidth, H = window.innerHeight;
        this._numLayers = 4 + Math.floor(rng() * 3);

        // Generate depth layers
        this._layers = [];
        this._objects = [];
        this._fogAlpha = [];

        for (let layer = 0; layer < this._numLayers; layer++) {
            const depth = layer / (this._numLayers - 1); // 0 = far, 1 = near
            const parallax = 0.1 + depth * 0.9; // Far layers move less
            const objectCount = this.mode === 4
                ? 15 + Math.floor(rng() * 15)
                : 5 + Math.floor(rng() * 8);

            this._layers.push({ depth, parallax });
            this._fogAlpha.push(0.02 + (1 - depth) * 0.04);

            const layerObjects = [];
            for (let i = 0; i < objectCount; i++) {
                const obj = this._createObject(rng, W, H, layer, depth);
                layerObjects.push(obj);
            }
            this._objects.push(layerObjects);
        }
    }

    _createObject(rng, W, H, layer, depth) {
        const baseSize = (2 + rng() * 8) * (0.3 + depth * 0.7);
        const obj = {
            baseX: rng() * W * 1.4 - W * 0.2,
            baseY: rng() * H * 1.4 - H * 0.2,
            size: baseSize,
            rotation: rng() * TAU,
            rotSpeed: (rng() - 0.5) * 0.01 * (1 + depth),
            hueOffset: (rng() - 0.5) * 50,
            phase: rng() * TAU,
            bobSpeed: 0.005 + rng() * 0.01,
            bobAmount: 3 + rng() * 8,
            type: Math.floor(rng() * 4), // shape variant
            brightness: 0.3 + rng() * 0.7,
            drift: (rng() - 0.5) * 0.2,
        };

        // Mode-specific properties
        if (this.mode === 0) {
            obj.type = Math.floor(rng() * 3); // star, asteroid, ring
            if (layer === 0) obj.brightness *= 0.4; // Distant stars dimmer
        } else if (this.mode === 1) {
            obj.type = Math.floor(rng() * 3); // jellyfish, bubble, kelp
            obj.bobAmount *= 1.5;
        } else if (this.mode === 2) {
            obj.fallSpeed = 0.3 + rng() * 1.5 * (0.5 + depth);
            obj.type = Math.floor(rng() * 5); // various shapes
        } else if (this.mode === 3) {
            obj.runeType = Math.floor(rng() * 8); // different rune shapes
            obj.pulsePhase = rng() * TAU;
            obj.pulseSpeed = 0.02 + rng() * 0.03;
        } else if (this.mode === 4) {
            obj.size *= 0.5;
            obj.type = 0; // Always circles for nebula
        } else if (this.mode === 5) {
            obj.type = Math.floor(rng() * 3); // crystal, stalactite, gem
            obj.facets = 4 + Math.floor(rng() * 4);
        }

        return obj;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx; this._pmy = this._my;
        this._mx = mx; this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        const W = window.innerWidth, H = window.innerHeight;
        const cx = W / 2, cy = H / 2;

        // Parallax offset based on mouse position
        this._offsetX = (mx - cx) * 0.03;
        this._offsetY = (my - cy) * 0.03;

        // Update objects
        for (let layer = 0; layer < this._objects.length; layer++) {
            for (const obj of this._objects[layer]) {
                obj.rotation += obj.rotSpeed;
                obj.phase += obj.bobSpeed;
                obj.baseX += obj.drift;

                // Geometric rain mode: falling
                if (this.mode === 2) {
                    obj.baseY += obj.fallSpeed;
                    if (obj.baseY > H + 50) {
                        obj.baseY = -50;
                        obj.baseX = Math.random() * W * 1.4 - W * 0.2;
                    }
                }

                // Wrap horizontally
                if (obj.baseX < -W * 0.3) obj.baseX = W * 1.3;
                if (obj.baseX > W * 1.3) obj.baseX = -W * 0.3;
            }
        }

        // Click burst
        if (isClicking && !this._wasClicking) {
            for (let i = 0; i < 8; i++) {
                const burst = this._burstPool.length > 0 ? this._burstPool.pop() : {};
                const angle = (i / 8) * TAU + Math.random() * 0.3;
                burst.x = mx; burst.y = my;
                burst.vx = Math.cos(angle) * (2 + Math.random() * 3);
                burst.vy = Math.sin(angle) * (2 + Math.random() * 3);
                burst.life = 1.0;
                burst.size = 2 + Math.random() * 3;
                burst.hue = (this.hue + Math.random() * 40) % 360;
                burst.layer = Math.floor(Math.random() * this._numLayers);
                this._bursts.push(burst);
            }
        }
        this._wasClicking = isClicking;

        // Update bursts
        for (let i = this._bursts.length - 1; i >= 0; i--) {
            const b = this._bursts[i];
            b.x += b.vx; b.y += b.vy;
            b.vx *= 0.96; b.vy *= 0.96;
            b.life -= 0.02;
            if (b.life <= 0) {
                this._burstPool.push(b);
                this._bursts[i] = this._bursts[this._bursts.length - 1];
                this._bursts.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw from back to front
        for (let layer = 0; layer < this._objects.length; layer++) {
            const layerInfo = this._layers[layer];
            const px = this._offsetX * layerInfo.parallax;
            const py = this._offsetY * layerInfo.parallax;
            const depth = layerInfo.depth;
            const depthAlpha = (0.05 + depth * 0.1) * this.intensity;

            // Fog plane between layers
            if (layer > 0 && this.mode === 2) {
                ctx.fillStyle = `rgba(0,0,0,${this._fogAlpha[layer]})`;
                ctx.fillRect(0, 0, system.width, system.height);
            }

            for (const obj of this._objects[layer]) {
                const x = obj.baseX + px + Math.sin(obj.phase) * obj.bobAmount;
                const y = obj.baseY + py + Math.cos(obj.phase * 0.7) * obj.bobAmount * 0.5;
                const alpha = obj.brightness * depthAlpha;
                const hue = (this.hue + obj.hueOffset + depth * 20 + 360) % 360;

                if (this.mode === 0) this._drawCosmic(ctx, obj, x, y, hue, alpha, depth);
                else if (this.mode === 1) this._drawUndersea(ctx, obj, x, y, hue, alpha, depth);
                else if (this.mode === 2) this._drawGeoRain(ctx, obj, x, y, hue, alpha, depth);
                else if (this.mode === 3) this._drawRune(ctx, obj, x, y, hue, alpha, depth);
                else if (this.mode === 4) this._drawNebula(ctx, obj, x, y, hue, alpha, depth);
                else if (this.mode === 5) this._drawCrystalCavern(ctx, obj, x, y, hue, alpha, depth);
            }

            // Draw bursts for this layer
            for (const b of this._bursts) {
                if (b.layer !== layer) continue;
                const bx = b.x + px;
                const by = b.y + py;
                const bAlpha = b.life * 0.2 * this.intensity;
                ctx.fillStyle = `hsla(${b.hue}, 80%, 75%, ${bAlpha})`;
                ctx.beginPath();
                ctx.arc(bx, by, b.size * b.life, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawCosmic(ctx, obj, x, y, hue, alpha, depth) {
        if (obj.type === 0) {
            // Star: cross + dot
            const size = obj.size;
            const twinkle = (Math.sin(this.tick * 0.03 + obj.phase) + 1) / 2;
            const sa = alpha * (0.5 + twinkle * 0.5);
            ctx.fillStyle = `hsla(${hue}, 30%, 90%, ${sa})`;
            ctx.fillRect(x - size * 0.1, y - size, size * 0.2, size * 2);
            ctx.fillRect(x - size, y - size * 0.1, size * 2, size * 0.2);
            ctx.beginPath();
            ctx.arc(x, y, size * 0.4, 0, TAU);
            ctx.fill();
        } else if (obj.type === 1) {
            // Asteroid: rough circle
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(obj.rotation);
            ctx.fillStyle = `hsla(${hue}, 20%, 40%, ${alpha})`;
            ctx.beginPath();
            for (let a = 0; a < 8; a++) {
                const angle = (a / 8) * TAU;
                const r = obj.size * (0.7 + Math.sin(a * 2.3 + obj.phase) * 0.3);
                if (a === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else {
            // Dust ring
            ctx.strokeStyle = `hsla(${hue}, 50%, 60%, ${alpha * 0.5})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(x, y, obj.size * 2, obj.size * 0.5, obj.rotation, 0, TAU);
            ctx.stroke();
        }
    }

    _drawUndersea(ctx, obj, x, y, hue, alpha, depth) {
        if (obj.type === 0) {
            // Jellyfish silhouette
            const size = obj.size;
            ctx.fillStyle = `hsla(${hue}, 50%, 60%, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.ellipse(x, y, size, size * 0.6, 0, Math.PI, 0);
            ctx.fill();
            // Tentacles
            ctx.strokeStyle = `hsla(${hue}, 40%, 55%, ${alpha * 0.3})`;
            ctx.lineWidth = 0.5;
            for (let t = 0; t < 4; t++) {
                const tx = x - size * 0.6 + (t + 1) * (size * 1.2 / 5);
                ctx.beginPath();
                ctx.moveTo(tx, y);
                ctx.quadraticCurveTo(tx + Math.sin(this.tick * 0.02 + t) * 5,
                    y + size, tx, y + size * 1.5);
                ctx.stroke();
            }
        } else if (obj.type === 1) {
            // Bubble
            ctx.strokeStyle = `hsla(${hue + 40}, 30%, 80%, ${alpha * 0.5})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(x, y, obj.size, 0, TAU);
            ctx.stroke();
            // Highlight
            ctx.fillStyle = `hsla(${hue + 40}, 20%, 95%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(x - obj.size * 0.3, y - obj.size * 0.3, obj.size * 0.2, 0, TAU);
            ctx.fill();
        } else {
            // Kelp strand
            ctx.strokeStyle = `hsla(${(hue + 60) % 360}, 40%, 35%, ${alpha * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            const sway = Math.sin(this.tick * 0.01 + obj.phase) * 10;
            ctx.quadraticCurveTo(x + sway, y - obj.size * 2, x + sway * 0.5, y - obj.size * 4);
            ctx.stroke();
        }
    }

    _drawGeoRain(ctx, obj, x, y, hue, alpha, depth) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(obj.rotation);
        const size = obj.size;
        ctx.fillStyle = `hsla(${hue}, 60%, 55%, ${alpha})`;
        ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${alpha * 1.5})`;
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        if (obj.type === 0) {
            ctx.arc(0, 0, size, 0, TAU);
        } else if (obj.type === 1) {
            ctx.rect(-size, -size, size * 2, size * 2);
        } else if (obj.type === 2) {
            ctx.moveTo(0, -size); ctx.lineTo(size, size); ctx.lineTo(-size, size); ctx.closePath();
        } else if (obj.type === 3) {
            // Diamond
            ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, 0);
            ctx.lineTo(0, size); ctx.lineTo(-size * 0.7, 0); ctx.closePath();
        } else {
            // Hexagon
            for (let s = 0; s <= 6; s++) {
                const a = (s / 6) * TAU;
                if (s === 0) ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size);
                else ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
            }
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    _drawRune(ctx, obj, x, y, hue, alpha, depth) {
        const pulse = (Math.sin(this.tick * obj.pulseSpeed + obj.pulsePhase) + 1) / 2;
        const runeAlpha = alpha * (0.5 + pulse * 0.5);
        const size = obj.size;

        // Glow
        if (pulse > 0.5) {
            ctx.fillStyle = `hsla(${hue}, 60%, 60%, ${runeAlpha * 0.15})`;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, TAU);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(obj.rotation);
        ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${runeAlpha})`;
        ctx.lineWidth = 1;

        // Draw rune based on type (simple geometric symbols)
        const s = size;
        ctx.beginPath();
        switch (obj.runeType) {
            case 0: // Circle with cross
                ctx.arc(0, 0, s, 0, TAU);
                ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
                ctx.moveTo(0, -s); ctx.lineTo(0, s);
                break;
            case 1: // Triangle with dot
                ctx.moveTo(0, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath();
                break;
            case 2: // Diamond with lines
                ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath();
                ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(s * 0.5, s * 0.5);
                break;
            case 3: // Zigzag
                ctx.moveTo(-s, -s); ctx.lineTo(0, 0); ctx.lineTo(s, -s);
                ctx.moveTo(-s, s); ctx.lineTo(0, 0); ctx.lineTo(s, s);
                break;
            case 4: // Concentric arcs
                ctx.arc(0, 0, s, 0, Math.PI);
                ctx.moveTo(s * 0.6, 0); ctx.arc(0, 0, s * 0.6, 0, Math.PI);
                break;
            case 5: // Arrow
                ctx.moveTo(0, -s); ctx.lineTo(0, s);
                ctx.moveTo(-s * 0.5, -s * 0.3); ctx.lineTo(0, -s); ctx.lineTo(s * 0.5, -s * 0.3);
                break;
            case 6: // Eye
                ctx.ellipse(0, 0, s, s * 0.4, 0, 0, TAU);
                ctx.moveTo(s * 0.3, 0); ctx.arc(0, 0, s * 0.3, 0, TAU);
                break;
            default: // Spiral
                for (let a = 0; a < TAU * 2; a += 0.2) {
                    const r = (a / (TAU * 2)) * s;
                    const px = Math.cos(a) * r, py = Math.sin(a) * r;
                    if (a === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
        }
        ctx.stroke();
        ctx.restore();
    }

    _drawNebula(ctx, obj, x, y, hue, alpha, depth) {
        const size = obj.size * 2;
        const nebAlpha = alpha * 0.3;
        ctx.fillStyle = `hsla(${hue}, 60%, 50%, ${nebAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
    }

    _drawCrystalCavern(ctx, obj, x, y, hue, alpha, depth) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(obj.rotation);
        const size = obj.size;

        if (obj.type === 0) {
            // Crystal: elongated polygon
            const facets = obj.facets;
            ctx.fillStyle = `hsla(${hue}, 50%, 55%, ${alpha * 0.5})`;
            ctx.strokeStyle = `hsla(${hue}, 60%, 75%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let f = 0; f <= facets; f++) {
                const a = (f / facets) * TAU;
                const r = size * (f % 2 === 0 ? 1 : 0.6);
                if (f === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 2);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (obj.type === 1) {
            // Stalactite: pointed downward
            ctx.fillStyle = `hsla(${hue - 20}, 30%, 40%, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.moveTo(-size * 0.5, -size);
            ctx.lineTo(size * 0.5, -size);
            ctx.lineTo(0, size * 2);
            ctx.closePath();
            ctx.fill();
        } else {
            // Gem: diamond with refraction
            ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha * 0.4})`;
            ctx.strokeStyle = `hsla(${hue}, 80%, 80%, ${alpha * 0.7})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -size); ctx.lineTo(size, 0);
            ctx.lineTo(0, size * 0.6); ctx.lineTo(-size, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Inner refraction line
            ctx.beginPath();
            ctx.moveTo(-size * 0.3, -size * 0.3);
            ctx.lineTo(size * 0.3, size * 0.1);
            ctx.stroke();
        }

        ctx.restore();
    }
}
