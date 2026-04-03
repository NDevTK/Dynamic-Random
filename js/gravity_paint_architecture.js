/**
 * @file gravity_paint_architecture.js
 * @description Cursor acts as a paintbrush dropping blobs of "liquid paint" that
 * flow downward under gravity, splatter on collision, pool at the bottom, and mix
 * colors. Seeds change paint viscosity, gravity direction, color palette, blob size,
 * splatter behavior, and drip patterns. Clicking flings large splashes.
 * The canvas becomes a living abstract painting that evolves over time.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class GravityPaintArchitecture extends Architecture {
    constructor() {
        super();
        this.blobs = [];
        this.blobPool = [];
        this.puddles = [];
        this.drips = [];
        this.dripPool = [];
        this.splatterDots = [];
        this.gravityAngle = Math.PI / 2; // down
        this.gravityStrength = 0.15;
        this.viscosity = 0.98;
        this.palette = [];
        this.blobBaseSize = 8;
        this.splatChance = 0;
        this.trailOpacity = 0;
        this.fadeCanvas = null;
        this.fadeCtx = null;
        this.accumCanvas = null;
        this.accumCtx = null;
        this.lastDropTick = 0;
        this.autoEmitters = [];
    }

    init(system) {
        const rng = system.rng;

        // Gravity direction — not always down!
        const gravityDir = Math.floor(rng() * 6);
        if (gravityDir === 0) this.gravityAngle = Math.PI / 2;       // down
        else if (gravityDir === 1) this.gravityAngle = -Math.PI / 2;  // up
        else if (gravityDir === 2) this.gravityAngle = 0;              // right
        else if (gravityDir === 3) this.gravityAngle = Math.PI;        // left
        else if (gravityDir === 4) this.gravityAngle = Math.PI / 4;    // diagonal
        else this.gravityAngle = rng() * Math.PI * 2;                  // random

        this.gravityStrength = 0.05 + rng() * 0.25;
        this.viscosity = 0.93 + rng() * 0.06;
        this.blobBaseSize = 4 + rng() * 16;
        this.splatChance = 0.1 + rng() * 0.4;
        this.trailOpacity = 0.02 + rng() * 0.06;

        // Paint palette — 4-6 colors, dramatically different per seed
        const paletteType = Math.floor(rng() * 7);
        const baseHue = rng() * 360;
        this.palette = [];
        switch (paletteType) {
            case 0: // Neon
                for (let i = 0; i < 5; i++) this.palette.push(`hsl(${(baseHue + i * 72) % 360}, 100%, 55%)`);
                break;
            case 1: // Earth tones
                this.palette = ['#8B4513', '#D2691E', '#DEB887', '#556B2F', '#2F4F4F', '#CD853F'];
                break;
            case 2: // Ocean
                this.palette = ['#006994', '#40E0D0', '#7FFFD4', '#4169E1', '#00CED1', '#1E90FF'];
                break;
            case 3: // Sunset
                this.palette = ['#FF6B35', '#FF4500', '#FFD700', '#FF1493', '#8B0000', '#FF8C00'];
                break;
            case 4: // Pastel
                for (let i = 0; i < 6; i++) this.palette.push(`hsl(${(baseHue + i * 60) % 360}, 60%, 75%)`);
                break;
            case 5: // Monochrome
                for (let i = 0; i < 5; i++) this.palette.push(`hsl(${baseHue}, ${40 + i * 12}%, ${20 + i * 15}%)`);
                break;
            case 6: // Toxic
                this.palette = ['#39FF14', '#00FF7F', '#7FFF00', '#ADFF2F', '#00FA9A', '#32CD32'];
                break;
        }

        // Auto-emitters — paint sources that drip continuously
        this.autoEmitters = [];
        const emitterCount = 2 + Math.floor(rng() * 5);
        for (let i = 0; i < emitterCount; i++) {
            this.autoEmitters.push({
                x: system.width * (0.1 + rng() * 0.8),
                y: system.height * (0.05 + rng() * 0.2),
                rate: 5 + Math.floor(rng() * 15),
                colorIdx: Math.floor(rng() * this.palette.length),
                size: this.blobBaseSize * (0.5 + rng() * 1)
            });
        }

        // Persistent paint canvas
        this.accumCanvas = document.createElement('canvas');
        this.accumCanvas.width = system.width;
        this.accumCanvas.height = system.height;
        this.accumCtx = this.accumCanvas.getContext('2d', { alpha: true });
        this.accumCtx.clearRect(0, 0, system.width, system.height);

        this.blobs = [];
        this.blobPool = [];
        this.puddles = [];
        this.drips = [];
        this.dripPool = [];
        this.splatterDots = [];
    }

    _spawnBlob(x, y, vx, vy, size, color) {
        let blob = this.blobPool.length > 0 ? this.blobPool.pop() : {};
        blob.x = x;
        blob.y = y;
        blob.vx = vx;
        blob.vy = vy;
        blob.size = size;
        blob.color = color;
        blob.life = 1;
        blob.trail = [];
        this.blobs.push(blob);
    }

    _spawnDrip(x, y, size, color) {
        let drip = this.dripPool.length > 0 ? this.dripPool.pop() : {};
        drip.x = x;
        drip.y = y;
        drip.vy = 0.5 + Math.random() * 2;
        drip.size = size * 0.3;
        drip.color = color;
        drip.life = 200;
        this.drips.push(drip);
    }

    update(system) {
        const tick = system.tick;
        const gx = Math.cos(this.gravityAngle) * this.gravityStrength;
        const gy = Math.sin(this.gravityAngle) * this.gravityStrength;
        const rng = system.rng;
        const qualityScale = system.qualityScale || 1;
        const maxBlobs = Math.floor(300 * qualityScale);

        // Resize accumulation canvas if window size changed
        if (this.accumCanvas && (this.accumCanvas.width !== system.width || this.accumCanvas.height !== system.height)) {
            const old = this.accumCanvas;
            this.accumCanvas = document.createElement('canvas');
            this.accumCanvas.width = system.width;
            this.accumCanvas.height = system.height;
            this.accumCtx = this.accumCanvas.getContext('2d', { alpha: true });
            this.accumCtx.drawImage(old, 0, 0); // preserve existing paint
        }

        // Cursor drops paint
        if (tick % 2 === 0) {
            const color = this.palette[Math.floor(rng() * this.palette.length)];
            const size = this.blobBaseSize * (0.7 + rng() * 0.6);
            this._spawnBlob(mouse.x, mouse.y, (rng() - 0.5) * 2, (rng() - 0.5) * 2, size, color);
        }

        // Click splash
        if (isLeftMouseDown && tick % 3 === 0) {
            const count = 8 + Math.floor(rng() * 12);
            for (let i = 0; i < count; i++) {
                const angle = rng() * Math.PI * 2;
                const speed = 3 + rng() * 8;
                const color = this.palette[Math.floor(rng() * this.palette.length)];
                const size = this.blobBaseSize * (0.3 + rng() * 1.2);
                this._spawnBlob(
                    mouse.x, mouse.y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    size, color
                );
            }
        }

        // Auto-emitters
        for (const em of this.autoEmitters) {
            if (tick % em.rate === 0) {
                const color = this.palette[em.colorIdx];
                this._spawnBlob(
                    em.x + (rng() - 0.5) * 10,
                    em.y + (rng() - 0.5) * 5,
                    (rng() - 0.5) * 1.5,
                    rng() * 0.5,
                    em.size, color
                );
            }
        }

        // Update blobs
        for (let i = this.blobs.length - 1; i >= 0; i--) {
            const b = this.blobs[i];
            b.vx += gx;
            b.vy += gy;
            b.vx *= this.viscosity;
            b.vy *= this.viscosity;
            b.x += b.vx;
            b.y += b.vy;

            // Record trail
            if (b.trail.length < 20) {
                b.trail.push({ x: b.x, y: b.y });
            } else {
                if (b._tIdx === undefined) b._tIdx = 0;
                b.trail[b._tIdx].x = b.x;
                b.trail[b._tIdx].y = b.y;
                b._tIdx = (b._tIdx + 1) % 20;
            }

            // Paint onto accumulation canvas
            if (tick % 2 === 0) {
                this.accumCtx.globalAlpha = this.trailOpacity;
                this.accumCtx.fillStyle = b.color;
                this.accumCtx.beginPath();
                this.accumCtx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
                this.accumCtx.fill();
            }

            // Boundary: splatter or wrap
            const hitEdge =
                b.x < -50 || b.x > system.width + 50 ||
                b.y < -50 || b.y > system.height + 50;

            // Splatter when hitting bottom (or gravity edge)
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (speed < 0.3 || hitEdge) {
                // Leave a splatter mark
                if (rng() < this.splatChance && !hitEdge) {
                    const splatCount = 3 + Math.floor(rng() * 5);
                    for (let s = 0; s < splatCount; s++) {
                        this.splatterDots.push({
                            x: b.x + (rng() - 0.5) * b.size * 4,
                            y: b.y + (rng() - 0.5) * b.size * 4,
                            size: b.size * (0.1 + rng() * 0.4),
                            color: b.color,
                            alpha: 0.5 + rng() * 0.5
                        });
                    }
                    // Spawn drips from pooled paint
                    if (rng() < 0.3) {
                        this._spawnDrip(b.x, b.y, b.size, b.color);
                    }
                }

                this.blobPool.push(b);
                this.blobs[i] = this.blobs[this.blobs.length - 1];
                this.blobs.pop();
            }
        }

        // Update drips
        for (let i = this.drips.length - 1; i >= 0; i--) {
            const d = this.drips[i];
            d.y += d.vy;
            d.life--;
            // Paint drip trail
            this.accumCtx.globalAlpha = 0.03;
            this.accumCtx.fillStyle = d.color;
            this.accumCtx.fillRect(d.x - d.size / 2, d.y, d.size, d.vy * 2);

            if (d.life <= 0 || d.y > system.height + 10) {
                this.dripPool.push(d);
                this.drips[i] = this.drips[this.drips.length - 1];
                this.drips.pop();
            }
        }

        // Performance: cap arrays
        while (this.blobs.length > maxBlobs) {
            this.blobPool.push(this.blobs.shift());
        }
        const maxSplatter = Math.floor(300 * qualityScale);
        while (this.splatterDots.length > maxSplatter) {
            this.splatterDots.shift();
        }

        // Slowly fade accumulated paint so it doesn't become a solid block
        if (tick % 120 === 0) {
            this.accumCtx.globalAlpha = 0.01;
            this.accumCtx.globalCompositeOperation = 'destination-out';
            this.accumCtx.fillStyle = '#000';
            this.accumCtx.fillRect(0, 0, system.width, system.height);
            this.accumCtx.globalCompositeOperation = 'source-over';
            this.accumCtx.globalAlpha = 1;
        }
    }

    draw(system) {
        const ctx = system.ctx;

        // Draw accumulated paint layer
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(this.accumCanvas, 0, 0);
        ctx.restore();

        // Draw splatter dots
        for (const dot of this.splatterDots) {
            ctx.globalAlpha = dot.alpha;
            ctx.fillStyle = dot.color;
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw active blobs with glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const b of this.blobs) {
            // Trail
            if (b.trail.length > 2) {
                ctx.strokeStyle = b.color;
                ctx.lineWidth = b.size * 0.7;
                ctx.lineCap = 'round';
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(b.trail[0].x, b.trail[0].y);
                for (let j = 1; j < b.trail.length; j++) {
                    ctx.lineTo(b.trail[j].x, b.trail[j].y);
                }
                ctx.stroke();
            }

            // Blob body
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();

            // Specular highlight
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Draw drips
        ctx.globalAlpha = 0.6;
        for (const d of this.drips) {
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.size, d.size * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
