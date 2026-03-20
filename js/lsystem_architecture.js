/**
 * @file lsystem_architecture.js
 * @description Background architecture that renders L-system fractal plants and patterns.
 * Each seed produces a unique plant/fractal shape via different rules, angles, and palettes.
 */

import { Architecture } from './background_architectures.js';
import { lSystem, seededLSystem, seededPalette } from './math_patterns.js';
import { mouse } from './state.js';

export class LSystemArchitecture extends Architecture {
    constructor() {
        super();
        this.segments = [];  // { x1, y1, x2, y2, depth, _sx1, _sy1, _sx2, _sy2 }
        this.palette = [];
        this.maxDepth = 1;
        this.visibleCount = 0;
        this.growMode = 0;   // 0 = instant, 1 = progressive
        this.growRate = 7;
        this.fullyGrown = false;
        this.fadeAlpha = 1;
        this.regrowTimer = 0;
        this.regrowAngleOffset = 0;
        this.baseAngle = 25;
        this.swayTime = 0;
    }

    init(system) {
        const { axiom, rules, angle, iter } = seededLSystem(system.rng);
        this.baseAngle = angle;
        this.regrowAngleOffset = 0;
        this.segments = this._buildSegments(lSystem(axiom, rules, iter), angle, system);
        this.palette = seededPalette(system.rng);
        this.growMode = system.rng() < 0.5 ? 0 : 1;
        this.growRate = 5 + Math.floor(system.rng() * 6);
        this.visibleCount = this.growMode === 0 ? this.segments.length : 0;
        this.fullyGrown = this.growMode === 0;
        this.fadeAlpha = 1;
        this.regrowTimer = 0;
        this.swayTime = 0;
    }

    _buildSegments(str, angleDeg, system) {
        const angleRad = (angleDeg * Math.PI) / 180;
        const stack = [], segs = [];
        let x = 0, y = 0, dir = -Math.PI / 2, depth = 0;

        for (const ch of str) {
            if (ch === 'F') {
                const nx = x + Math.cos(dir) * 10;
                const ny = y + Math.sin(dir) * 10;
                segs.push({ x1: x, y1: y, x2: nx, y2: ny, depth });
                x = nx; y = ny;
            } else if (ch === '+') { dir += angleRad;
            } else if (ch === '-') { dir -= angleRad;
            } else if (ch === '[') { stack.push({ x, y, dir, depth }); depth++;
            } else if (ch === ']') {
                const s = stack.pop();
                if (s) { x = s.x; y = s.y; dir = s.dir; depth = s.depth; }
            }
        }
        if (segs.length === 0) return segs;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const s of segs) {
            minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
            minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
        }

        const scale = Math.min(system.width * 0.8 / (maxX - minX || 1), system.height * 0.75 / (maxY - minY || 1));
        const cx = (minX + maxX) / 2;
        const ox = system.width / 2, oy = system.height * 0.92;

        this.maxDepth = 0;
        for (const s of segs) {
            s.x1 = (s.x1 - cx) * scale + ox; s.y1 = (s.y1 - maxY) * scale + oy;
            s.x2 = (s.x2 - cx) * scale + ox; s.y2 = (s.y2 - maxY) * scale + oy;
            if (s.depth > this.maxDepth) this.maxDepth = s.depth;
        }
        return segs;
    }

    _rebuild(system) {
        const { axiom, rules, iter } = seededLSystem(system.rng);
        this.segments = this._buildSegments(lSystem(axiom, rules, iter), this.baseAngle + this.regrowAngleOffset, system);
    }

    update(system) {
        this.swayTime += 0.012 * system.speedMultiplier;
        const windBias = ((mouse.x / (system.width || 1)) - 0.5) * 2;

        if (!this.fullyGrown) {
            this.visibleCount = Math.min(this.segments.length, this.visibleCount + this.growRate * system.speedMultiplier);
            if (this.visibleCount >= this.segments.length) { this.visibleCount = this.segments.length; this.fullyGrown = true; }
        }

        if (this.fullyGrown) {
            if (this.regrowTimer === 0) this.regrowTimer = 1;
            this.regrowTimer++;
            if (this.regrowTimer > 300) {
                this.fadeAlpha -= 0.008 * system.speedMultiplier;
                if (this.fadeAlpha <= 0) {
                    this.regrowAngleOffset += (system.rng() - 0.5) * 4; // ±2 degrees
                    this._rebuild(system);
                    this.visibleCount = this.growMode === 0 ? this.segments.length : 0;
                    this.fullyGrown = this.growMode === 0;
                    this.fadeAlpha = 1;
                    this.regrowTimer = 0;
                }
            }
        }

        // Sway: deeper branches (higher depth) sway more; wind via mouse x
        const depthMax = this.maxDepth || 1;
        const count = Math.floor(this.visibleCount);
        for (let i = 0; i < count; i++) {
            const seg = this.segments[i];
            const t = seg.depth / depthMax;
            const xOff = Math.sin(this.swayTime * (1 + t * 1.5) + seg.y1 * 0.01) * t * t * 6;
            const wOff = windBias * t * 4;
            seg._sx1 = seg.x1 + (t > 0.1 ? xOff * 0.5 + wOff * 0.5 : 0);
            seg._sy1 = seg.y1;
            seg._sx2 = seg.x2 + xOff + wOff;
            seg._sy2 = seg.y2 + xOff * 0.3;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        if (!this.segments.length) return;
        const depthMax = this.maxDepth || 1, palette = this.palette;
        const count = Math.floor(this.visibleCount), alpha = this.fadeAlpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.lineCap = 'round';

        // Main segment pass
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < count; i++) {
            const seg = this.segments[i];
            const t = seg.depth / depthMax;
            ctx.lineWidth = Math.max(0.5, 3 - t * 2.5);
            ctx.strokeStyle = palette[Math.min(palette.length - 1, Math.floor(t * (palette.length - 1)))];
            ctx.beginPath();
            ctx.moveTo(seg._sx1 ?? seg.x1, seg._sy1 ?? seg.y1);
            ctx.lineTo(seg._sx2 ?? seg.x2, seg._sy2 ?? seg.y2);
            ctx.stroke();
        }

        // Glow pass on tips ('lighter' composite, shadowBlur)
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.35;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < count; i++) {
            const seg = this.segments[i];
            const t = seg.depth / depthMax;
            if (t < 0.7) continue;
            const color = palette[Math.min(palette.length - 1, Math.floor(t * (palette.length - 1)))];
            ctx.strokeStyle = color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.moveTo(seg._sx1 ?? seg.x1, seg._sy1 ?? seg.y1);
            ctx.lineTo(seg._sx2 ?? seg.x2, seg._sy2 ?? seg.y2);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Buds / leaves at deepest branch tips
        ctx.globalAlpha = alpha * 0.8;
        const tipColor = palette[palette.length - 1];
        ctx.fillStyle = tipColor;
        ctx.shadowBlur = 6;
        ctx.shadowColor = tipColor;
        for (let i = 0; i < count; i++) {
            const seg = this.segments[i];
            if (seg.depth < depthMax - 1) continue;
            ctx.beginPath();
            ctx.arc(seg._sx2 ?? seg.x2, seg._sy2 ?? seg.y2, 2 + (seg.depth / depthMax) * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
