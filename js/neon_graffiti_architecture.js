/**
 * @file neon_graffiti_architecture.js
 * @description Neon graffiti art that grows, drips, and glows on a dark wall.
 *   Seed drives the spray patterns, neon tube colors, drip behavior, and tag styles.
 *   Click to spray new graffiti. Mouse movement leaves light trails.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class NeonGraffitiArchitecture extends Architecture {
    constructor() {
        super();
        this.strokes = [];
        this.drips = [];
        this.dripPool = [];
        this.glowPulses = [];
        this.neonTubes = [];
        this.splats = [];
        this.tick = 0;
        this.autoSprayTimer = 0;
        this.autoSprayInterval = 120;
        this.palette = [];
        this.wallTexture = null;
        this.brickPattern = false;
        this.flickerRate = 0;
        this._paintCanvas = null;
        this._paintCtx = null;
    }

    init(system) {
        const rng = system.rng;
        this.tick = 0;
        this.strokes = [];
        this.drips = [];
        this.splats = [];
        this.neonTubes = [];
        this.glowPulses = [];
        this.autoSprayTimer = 0;
        this.autoSprayInterval = 80 + Math.floor(rng() * 120);
        this.brickPattern = rng() > 0.5;
        this.flickerRate = 0.01 + rng() * 0.04;

        // Neon palette: 3-6 bright neon colors
        const numColors = 3 + Math.floor(rng() * 4);
        this.palette = [];
        for (let i = 0; i < numColors; i++) {
            this.palette.push({
                h: (system.hue + i * (360 / numColors) + rng() * 40) % 360,
                s: 85 + rng() * 15,
                l: 55 + rng() * 20
            });
        }

        // Paint persistence canvas
        this._paintCanvas = document.createElement('canvas');
        this._paintCanvas.width = system.width;
        this._paintCanvas.height = system.height;
        this._paintCtx = this._paintCanvas.getContext('2d');

        // Draw initial wall texture
        this._drawWall(system);

        // Spawn initial neon tubes (geometric shapes on the wall)
        const numTubes = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < numTubes; i++) {
            this._spawnNeonTube(system);
        }

        // Initial graffiti tags
        const numInitialTags = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < numInitialTags; i++) {
            this._spawnGraffitiTag(system, rng() * system.width, rng() * system.height);
        }
    }

    _drawWall(system) {
        const ctx = this._paintCtx;
        const rng = system.rng;
        // Dark wall base
        ctx.fillStyle = `hsl(${system.hue}, 5%, ${4 + rng() * 4}%)`;
        ctx.fillRect(0, 0, system.width, system.height);

        if (this.brickPattern) {
            ctx.strokeStyle = `rgba(255,255,255,0.02)`;
            ctx.lineWidth = 1;
            const brickW = 40 + Math.floor(rng() * 30);
            const brickH = 20 + Math.floor(rng() * 10);
            for (let y = 0; y < system.height; y += brickH) {
                const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
                for (let x = -brickW; x < system.width + brickW; x += brickW) {
                    ctx.strokeRect(x + offset, y, brickW, brickH);
                }
            }
        }
    }

    _spawnNeonTube(system) {
        const rng = system.rng;
        const color = this.palette[Math.floor(rng() * this.palette.length)];
        const type = rng() < 0.4 ? 'line' : rng() < 0.7 ? 'circle' : 'zigzag';
        const x = rng() * system.width;
        const y = rng() * system.height;

        const tube = {
            type,
            x, y,
            color,
            width: 2 + rng() * 3,
            phase: rng() * Math.PI * 2,
            flicker: rng() > 0.7,
            points: []
        };

        if (type === 'line') {
            const len = 80 + rng() * 200;
            const angle = rng() * Math.PI * 2;
            tube.points = [
                { x, y },
                { x: x + Math.cos(angle) * len, y: y + Math.sin(angle) * len }
            ];
        } else if (type === 'circle') {
            tube.radius = 30 + rng() * 80;
        } else {
            const segments = 3 + Math.floor(rng() * 5);
            tube.points = [{ x, y }];
            let cx = x, cy = y;
            for (let i = 0; i < segments; i++) {
                cx += (rng() - 0.5) * 100;
                cy += (rng() - 0.5) * 60;
                tube.points.push({ x: cx, y: cy });
            }
        }

        this.neonTubes.push(tube);
    }

    _spawnGraffitiTag(system, x, y) {
        const rng = system.rng;
        const color = this.palette[Math.floor(rng() * this.palette.length)];
        const numStrokes = 5 + Math.floor(rng() * 15);
        const baseSize = 20 + rng() * 60;

        for (let i = 0; i < numStrokes; i++) {
            const angle = rng() * Math.PI * 2;
            const dist = rng() * baseSize;
            const sx = x + Math.cos(angle) * dist;
            const sy = y + Math.sin(angle) * dist;
            const len = 10 + rng() * 40;
            const dir = rng() * Math.PI * 2;

            this.strokes.push({
                x1: sx,
                y1: sy,
                x2: sx + Math.cos(dir) * len,
                y2: sy + Math.sin(dir) * len,
                width: 2 + rng() * 8,
                color,
                alpha: 0,
                targetAlpha: 0.6 + rng() * 0.4,
                drawn: false
            });
        }

        // Splat effect
        if (rng() > 0.4) {
            this.splats.push({
                x, y,
                color,
                radius: 10 + rng() * 30,
                drips: 2 + Math.floor(rng() * 5),
                alpha: 0,
                spawned: false
            });
        }
    }

    _getDrip() {
        return this.dripPool.length > 0 ? this.dripPool.pop() : {};
    }

    update(system) {
        this.tick++;

        // Auto-spray new tags
        this.autoSprayTimer++;
        if (this.autoSprayTimer >= this.autoSprayInterval) {
            this.autoSprayTimer = 0;
            this._spawnGraffitiTag(system,
                system.rng() * system.width,
                system.rng() * system.height
            );
        }

        // Click sprays at cursor
        if (system.speedMultiplier > 5) {
            this._spawnGraffitiTag(system, mouse.x, mouse.y);
        }

        // Fade in strokes
        for (let i = 0; i < this.strokes.length; i++) {
            const s = this.strokes[i];
            if (s.alpha < s.targetAlpha) {
                s.alpha = Math.min(s.targetAlpha, s.alpha + 0.02);
            }
        }

        // Fade in splats and spawn drips
        for (let i = 0; i < this.splats.length; i++) {
            const sp = this.splats[i];
            if (sp.alpha < 0.8) sp.alpha += 0.02;
            if (!sp.spawned && sp.alpha > 0.3) {
                sp.spawned = true;
                for (let d = 0; d < sp.drips; d++) {
                    const drip = this._getDrip();
                    drip.x = sp.x + (system.rng() - 0.5) * sp.radius;
                    drip.y = sp.y + sp.radius * 0.5;
                    drip.vy = 0.3 + system.rng() * 0.8;
                    drip.width = 1 + system.rng() * 3;
                    drip.color = sp.color;
                    drip.life = 100 + Math.floor(system.rng() * 200);
                    drip.startY = drip.y;
                    this.drips.push(drip);
                }
            }
        }

        // Update drips (paint running down)
        for (let i = this.drips.length - 1; i >= 0; i--) {
            const d = this.drips[i];
            d.y += d.vy;
            d.vy *= 0.998; // slow down gradually
            d.life--;
            if (d.life <= 0 || d.y > system.height) {
                this.dripPool.push(d);
                this.drips[i] = this.drips[this.drips.length - 1];
                this.drips.pop();
            }
        }

        // Cap max strokes for performance
        if (this.strokes.length > 500) {
            // Bake old strokes to paint canvas and remove
            this._bakeStrokes(system, 200);
        }
    }

    _bakeStrokes(system, count) {
        const ctx = this._paintCtx;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < count && i < this.strokes.length; i++) {
            const s = this.strokes[i];
            ctx.strokeStyle = `hsla(${s.color.h}, ${s.color.s}%, ${s.color.l}%, ${s.alpha * 0.5})`;
            ctx.lineWidth = s.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        this.strokes.splice(0, count);
    }

    draw(system) {
        const ctx = system.ctx;

        // Draw persistent paint layer
        ctx.drawImage(this._paintCanvas, 0, 0);

        // Draw neon tubes with glow
        for (let i = 0; i < this.neonTubes.length; i++) {
            const tube = this.neonTubes[i];
            const flicker = tube.flicker
                ? (Math.sin(this.tick * this.flickerRate * 20 + tube.phase) > -0.3 ? 1 : 0.1)
                : 1;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 20 * flicker;
            ctx.shadowColor = `hsla(${tube.color.h}, ${tube.color.s}%, ${tube.color.l}%, ${0.8 * flicker})`;
            ctx.strokeStyle = `hsla(${tube.color.h}, ${tube.color.s}%, ${tube.color.l + 20}%, ${0.9 * flicker})`;
            ctx.lineWidth = tube.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (tube.type === 'circle') {
                ctx.beginPath();
                ctx.arc(tube.x, tube.y, tube.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(tube.points[0].x, tube.points[0].y);
                for (let j = 1; j < tube.points.length; j++) {
                    ctx.lineTo(tube.points[j].x, tube.points[j].y);
                }
                ctx.stroke();
            }

            // Double glow pass
            ctx.shadowBlur = 40 * flicker;
            ctx.globalAlpha = 0.3 * flicker;
            ctx.lineWidth = tube.width + 4;
            if (tube.type === 'circle') {
                ctx.beginPath();
                ctx.arc(tube.x, tube.y, tube.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(tube.points[0].x, tube.points[0].y);
                for (let j = 1; j < tube.points.length; j++) {
                    ctx.lineTo(tube.points[j].x, tube.points[j].y);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw live strokes with neon glow
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.strokes.length; i++) {
            const s = this.strokes[i];
            if (s.alpha < 0.01) continue;

            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = `hsla(${s.color.h}, ${s.color.s}%, ${s.color.l}%, ${s.alpha})`;
            ctx.strokeStyle = `hsla(${s.color.h}, ${s.color.s}%, ${s.color.l + 15}%, ${s.alpha})`;
            ctx.lineWidth = s.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw splats
        for (let i = 0; i < this.splats.length; i++) {
            const sp = this.splats[i];
            if (sp.alpha < 0.01) continue;
            const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.radius);
            g.addColorStop(0, `hsla(${sp.color.h}, ${sp.color.s}%, ${sp.color.l}%, ${sp.alpha * 0.6})`);
            g.addColorStop(0.7, `hsla(${sp.color.h}, ${sp.color.s}%, ${sp.color.l}%, ${sp.alpha * 0.2})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw drips
        for (let i = 0; i < this.drips.length; i++) {
            const d = this.drips[i];
            const alpha = Math.min(1, d.life / 50);
            ctx.fillStyle = `hsla(${d.color.h}, ${d.color.s}%, ${d.color.l}%, ${alpha * 0.7})`;
            ctx.fillRect(d.x - d.width / 2, d.startY, d.width, d.y - d.startY);
            // Drip tip glow
            ctx.save();
            ctx.shadowBlur = 6;
            ctx.shadowColor = `hsla(${d.color.h}, ${d.color.s}%, ${d.color.l}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.width, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';

        // Mouse light trail
        const mx = mouse.x;
        const my = mouse.y;
        const glowR = 60 + Math.sin(this.tick * 0.05) * 20;
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, glowR);
        const mColor = this.palette[Math.floor(this.tick / 60) % this.palette.length];
        mg.addColorStop(0, `hsla(${mColor.h}, ${mColor.s}%, ${mColor.l}%, 0.15)`);
        mg.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(mx, my, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
}
