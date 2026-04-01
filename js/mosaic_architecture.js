/**
 * @file mosaic_architecture.js
 * @description Animated mosaic of tiles that ripple, rotate, and shift color
 * in response to cursor movement. Seeds dramatically alter tile shapes
 * (squares, hexagons, triangles, diamonds), animation patterns (wave, spiral,
 * cascade, random pop), color strategies, and gap sizes. Clicking shatters
 * nearby tiles which reassemble. Interactive and hypnotic.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class MosaicArchitecture extends Architecture {
    constructor() {
        super();
        this.tiles = [];
        this.tileShape = 0;
        this.animPattern = 0;
        this.colorStrategy = 0;
        this.gap = 2;
        this.tileSize = 40;
        this.ripples = [];
        this.baseHue = 0;
        this.hueRange = 60;
        this.rotationAmount = 0;
        this.breatheSpeed = 0;
        this.shimmerIntensity = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven tile shape
        this.tileShape = Math.floor(rng() * 5);
        // 0 = squares, 1 = hexagons, 2 = triangles, 3 = diamonds, 4 = circles

        // Seed-driven animation pattern
        this.animPattern = Math.floor(rng() * 5);
        // 0 = radial wave, 1 = diagonal cascade, 2 = spiral, 3 = random pop, 4 = row wave

        // Color strategy
        this.colorStrategy = Math.floor(rng() * 6);
        // 0 = monochrome, 1 = complementary, 2 = rainbow, 3 = warm/cool split
        // 4 = neon on dark, 5 = pastel

        this.baseHue = Math.floor(rng() * 360);
        this.hueRange = 30 + rng() * 180;
        this.gap = 1 + Math.floor(rng() * 5);
        this.tileSize = 25 + Math.floor(rng() * 50);
        this.rotationAmount = rng() * 0.3;
        this.breatheSpeed = 0.01 + rng() * 0.04;
        this.shimmerIntensity = 0.2 + rng() * 0.8;
        this.depthEffect = rng() > 0.5; // 3D depth illusion
        this.reactRadius = 100 + rng() * 200;

        this._buildGrid(system);
    }

    _buildGrid(system) {
        this.tiles = [];
        const cols = Math.ceil(system.width / this.tileSize) + 2;
        const rows = Math.ceil(system.height / this.tileSize) + 2;

        for (let row = -1; row < rows; row++) {
            for (let col = -1; col < cols; col++) {
                let x, y;
                if (this.tileShape === 1) {
                    // Hexagonal offset
                    x = col * this.tileSize * 0.87 + (row % 2) * this.tileSize * 0.435;
                    y = row * this.tileSize * 0.75;
                } else if (this.tileShape === 3) {
                    // Diamond offset
                    x = col * this.tileSize + (row % 2) * this.tileSize * 0.5;
                    y = row * this.tileSize * 0.7;
                } else {
                    x = col * this.tileSize;
                    y = row * this.tileSize;
                }

                const distFromCenter = Math.sqrt(
                    (x - system.width / 2) ** 2 + (y - system.height / 2) ** 2
                );
                const angleFromCenter = Math.atan2(y - system.height / 2, x - system.width / 2);

                this.tiles.push({
                    x, y, col, row,
                    baseX: x, baseY: y,
                    scale: 1, targetScale: 1,
                    rotation: 0, targetRotation: 0,
                    hueOffset: 0,
                    brightness: 0.5,
                    distFromCenter,
                    angleFromCenter,
                    shatterVx: 0, shatterVy: 0,
                    shattered: false, shatterLife: 0,
                    phase: distFromCenter * 0.01 + angleFromCenter
                });
            }
        }
    }

    _getTileColor(tile, tick) {
        let h, s, l;
        const phase = tile.phase + tick * this.breatheSpeed;

        switch (this.colorStrategy) {
            case 0: // Monochrome
                l = 20 + Math.sin(phase) * 15 + tile.brightness * 30;
                return `hsl(${this.baseHue}, 40%, ${l}%)`;
            case 1: // Complementary
                h = tile.col % 2 === 0 ? this.baseHue : (this.baseHue + 180) % 360;
                l = 25 + Math.sin(phase) * 15 + tile.brightness * 25;
                return `hsl(${h}, 70%, ${l}%)`;
            case 2: // Rainbow
                h = (this.baseHue + tile.hueOffset + tick * 0.5) % 360;
                l = 30 + Math.sin(phase) * 10 + tile.brightness * 20;
                return `hsl(${h}, 80%, ${l}%)`;
            case 3: // Warm/cool split
                h = tile.distFromCenter < 300
                    ? this.baseHue + Math.sin(phase) * 20
                    : (this.baseHue + 180 + Math.sin(phase) * 20) % 360;
                l = 25 + tile.brightness * 25;
                return `hsl(${h}, 65%, ${l}%)`;
            case 4: // Neon on dark
                h = (this.baseHue + tile.hueOffset + tick * 0.3) % 360;
                s = 90;
                l = tile.brightness > 0.3 ? 50 + tile.brightness * 20 : 5;
                return `hsl(${h}, ${s}%, ${l}%)`;
            case 5: // Pastel
                h = (this.baseHue + tile.hueOffset) % 360;
                l = 60 + Math.sin(phase) * 10 + tile.brightness * 15;
                return `hsl(${h}, 50%, ${l}%)`;
            default:
                return `hsl(${this.baseHue}, 50%, 30%)`;
        }
    }

    update(system) {
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;
        const qualityScale = system.qualityScale || 1;

        // Process ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            this.ripples[i].radius += this.ripples[i].speed;
            this.ripples[i].alpha -= 0.015;
            if (this.ripples[i].alpha <= 0) {
                this.ripples[i] = this.ripples[this.ripples.length - 1];
                this.ripples.pop();
            }
        }

        // Click creates ripple and shatters
        if (isLeftMouseDown && tick % 10 === 0) {
            this.ripples.push({ x: mx, y: my, radius: 0, speed: 8, alpha: 1 });
        }

        // Update tiles
        const tileCount = this.tiles.length;
        // Skip some tiles when quality is low
        const step = qualityScale < 0.5 ? 2 : 1;

        for (let i = 0; i < tileCount; i += step) {
            const t = this.tiles[i];

            const dx = mx - t.x;
            const dy = my - t.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Cursor proximity reaction
            if (dist < this.reactRadius) {
                const influence = 1 - dist / this.reactRadius;
                t.targetScale = 1 + influence * 0.4;
                t.brightness = influence;
                t.targetRotation = influence * this.rotationAmount * Math.sign(dx);
                t.hueOffset = influence * this.hueRange;

                // Push away slightly
                if (this.depthEffect) {
                    t.x = t.baseX + (dx / dist) * influence * -5;
                    t.y = t.baseY + (dy / dist) * influence * -5;
                }
            } else {
                t.targetScale = 1;
                t.brightness *= 0.95;
                t.targetRotation = 0;
                t.hueOffset *= 0.95;
                t.x += (t.baseX - t.x) * 0.1;
                t.y += (t.baseY - t.y) * 0.1;
            }

            // Animation pattern effects
            let animOffset = 0;
            switch (this.animPattern) {
                case 0: // Radial wave
                    animOffset = Math.sin(t.distFromCenter * 0.02 - tick * 0.05) * this.shimmerIntensity;
                    break;
                case 1: // Diagonal cascade
                    animOffset = Math.sin((t.col + t.row) * 0.3 - tick * 0.04) * this.shimmerIntensity;
                    break;
                case 2: // Spiral
                    animOffset = Math.sin(t.angleFromCenter * 3 + t.distFromCenter * 0.01 - tick * 0.03) * this.shimmerIntensity;
                    break;
                case 3: // Random pop
                    animOffset = Math.sin(t.phase * 50 + tick * 0.1) > 0.9 ? this.shimmerIntensity : 0;
                    break;
                case 4: // Row wave
                    animOffset = Math.sin(t.row * 0.5 - tick * 0.06) * this.shimmerIntensity;
                    break;
            }
            t.targetScale += animOffset * 0.15;
            t.brightness = Math.max(t.brightness, animOffset * 0.5 + 0.2);

            // Ripple influence
            for (const ripple of this.ripples) {
                const rd = Math.abs(Math.sqrt((t.x - ripple.x) ** 2 + (t.y - ripple.y) ** 2) - ripple.radius);
                if (rd < 40) {
                    const ri = (1 - rd / 40) * ripple.alpha;
                    t.targetScale += ri * 0.5;
                    t.brightness = Math.min(1, t.brightness + ri * 0.5);
                    t.hueOffset += ri * 60;

                    // Shatter effect from click
                    if (rd < 20 && !t.shattered && ripple.alpha > 0.7) {
                        t.shattered = true;
                        t.shatterLife = 60;
                        t.shatterVx = (t.x - ripple.x) * 0.05;
                        t.shatterVy = (t.y - ripple.y) * 0.05;
                    }
                }
            }

            // Shatter animation
            if (t.shattered) {
                t.shatterLife--;
                if (t.shatterLife > 30) {
                    t.x += t.shatterVx;
                    t.y += t.shatterVy;
                    t.rotation += 0.05;
                    t.scale *= 0.98;
                } else {
                    // Reassemble
                    t.x += (t.baseX - t.x) * 0.08;
                    t.y += (t.baseY - t.y) * 0.08;
                    t.rotation *= 0.9;
                    t.scale += (1 - t.scale) * 0.08;
                }
                if (t.shatterLife <= 0) {
                    t.shattered = false;
                    t.x = t.baseX;
                    t.y = t.baseY;
                }
            } else {
                // Smooth interpolation
                t.scale += (t.targetScale - t.scale) * 0.15;
                t.rotation += (t.targetRotation - t.rotation) * 0.1;
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const half = this.tileSize / 2 - this.gap;
        const qualityScale = system.qualityScale || 1;

        ctx.save();

        for (let i = 0; i < this.tiles.length; i++) {
            const t = this.tiles[i];

            // Skip offscreen tiles
            if (t.x < -this.tileSize || t.x > system.width + this.tileSize ||
                t.y < -this.tileSize || t.y > system.height + this.tileSize) continue;

            ctx.save();
            ctx.translate(t.x + half, t.y + half);
            if (t.rotation !== 0) ctx.rotate(t.rotation);
            ctx.scale(t.scale, t.scale);

            ctx.fillStyle = this._getTileColor(t, tick);

            // Depth shadow
            if (this.depthEffect && t.scale > 1.05 && qualityScale > 0.5) {
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = (t.scale - 1) * 20;
                ctx.shadowOffsetX = (t.scale - 1) * 3;
                ctx.shadowOffsetY = (t.scale - 1) * 3;
            }

            ctx.beginPath();
            switch (this.tileShape) {
                case 0: // Square
                    ctx.rect(-half, -half, half * 2, half * 2);
                    break;
                case 1: // Hexagon
                    for (let v = 0; v < 6; v++) {
                        const angle = (Math.PI / 3) * v - Math.PI / 6;
                        const px = Math.cos(angle) * half;
                        const py = Math.sin(angle) * half;
                        v === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    break;
                case 2: // Triangle
                    ctx.moveTo(0, -half);
                    ctx.lineTo(half, half);
                    ctx.lineTo(-half, half);
                    ctx.closePath();
                    break;
                case 3: // Diamond
                    ctx.moveTo(0, -half);
                    ctx.lineTo(half, 0);
                    ctx.lineTo(0, half);
                    ctx.lineTo(-half, 0);
                    ctx.closePath();
                    break;
                case 4: // Circle
                    ctx.arc(0, 0, half, 0, Math.PI * 2);
                    break;
            }
            ctx.fill();

            // Edge highlight for depth
            if (this.depthEffect && t.brightness > 0.3 && qualityScale > 0.5) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${t.brightness * 0.15})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        ctx.restore();
    }
}
