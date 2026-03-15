/**
 * @file pixel_sort_architecture.js
 * @description Glitch art pixel sorting effect with cascading color columns and rows.
 * Simulates the aesthetic of pixel-sorted photography. Mouse triggers sort cascades,
 * gravity well creates melt zones. Seed determines sort direction, color palette,
 * threshold patterns, and glitch intensity.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class PixelSortArchitecture extends Architecture {
    constructor() {
        super();
        this.columns = [];
        this.sortCascades = [];
        this.cascadePool = [];
        this.glitchBands = [];
        this.baseHue = 0;
        this.sortDirection = 0; // 0=vertical, 1=horizontal, 2=diagonal
        this.colorScheme = 0;
        this.scanlines = [];
        this.meltZones = [];
    }

    init(system) {
        const rng = system.rng;

        this.baseHue = rng() * 360;
        this.sortDirection = Math.floor(rng() * 3);
        this.colorScheme = Math.floor(rng() * 5);

        // Generate color columns/rows that will be "sorted"
        this.columns = [];
        const count = this.sortDirection === 1 ?
            Math.ceil(system.height / 4) :
            Math.ceil(system.width / 4);

        for (let i = 0; i < count; i++) {
            const segments = [];
            const segCount = 10 + Math.floor(rng() * 20);
            let pos = 0;

            for (let s = 0; s < segCount; s++) {
                const length = 20 + rng() * 100;
                const hue = this._getSegmentHue(rng, i / count);
                segments.push({
                    start: pos,
                    length,
                    hue,
                    saturation: 40 + rng() * 50,
                    lightness: 10 + rng() * 40,
                    alpha: 0.1 + rng() * 0.25,
                    sortOffset: 0,
                    targetSort: 0,
                    speed: 0.5 + rng() * 2
                });
                pos += length;
            }

            this.columns.push({
                segments,
                sorted: false,
                sortProgress: 0
            });
        }

        // Glitch bands (horizontal distortion)
        this.glitchBands = [];
        const bandCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < bandCount; i++) {
            this.glitchBands.push({
                y: rng() * system.height,
                height: 2 + rng() * 15,
                speed: (rng() - 0.5) * 0.5,
                offset: 0,
                maxOffset: 10 + rng() * 40,
                phase: rng() * Math.PI * 2,
                frequency: 0.01 + rng() * 0.05
            });
        }

        // Scanline positions for visual texture
        this.scanlines = [];
        for (let i = 0; i < 5 + Math.floor(rng() * 8); i++) {
            this.scanlines.push({
                pos: rng() * (this.sortDirection === 1 ? system.width : system.height),
                thickness: 1 + rng() * 3,
                alpha: 0.05 + rng() * 0.15,
                hue: this.baseHue + (rng() - 0.5) * 60
            });
        }

        this.sortCascades = [];
        this.cascadePool = [];
        this.meltZones = [];
    }

    _getSegmentHue(rng, position) {
        switch (this.colorScheme) {
            case 0: // Sunset gradient
                return 340 + position * 60;
            case 1: // Neon
                return [300, 180, 60, 120][Math.floor(rng() * 4)];
            case 2: // Monochrome with accent
                return rng() > 0.85 ? this.baseHue : this.baseHue + 180;
            case 3: // Pastel rainbow
                return position * 360;
            case 4: // Dark with bright streaks
                return this.baseHue + (rng() > 0.7 ? rng() * 360 : 0);
            default:
                return rng() * 360;
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;

        // Mouse triggers sort cascades
        if (system.speedMultiplier > 2 && tick % 5 === 0) {
            const colIdx = this.sortDirection === 1 ?
                Math.floor(my / 4) :
                Math.floor(mx / 4);

            if (colIdx >= 0 && colIdx < this.columns.length) {
                // Sort cascade: segments start moving to sorted positions
                const col = this.columns[colIdx];
                const sortedSegments = [...col.segments].sort((a, b) => a.lightness - b.lightness);
                for (let i = 0; i < col.segments.length; i++) {
                    const targetIdx = sortedSegments.indexOf(col.segments[i]);
                    col.segments[i].targetSort = (targetIdx - i) * 5;
                }
            }
        }

        // Update sort animations
        for (const col of this.columns) {
            for (const seg of col.segments) {
                seg.sortOffset += (seg.targetSort - seg.sortOffset) * 0.05;
                seg.targetSort *= 0.99; // Slowly reset
            }
        }

        // Gravity well creates melt zone
        if (system.isGravityWell) {
            this.meltZones.push({
                x: mx, y: my,
                radius: 0,
                maxRadius: 200,
                life: 1
            });
        }

        // Update melt zones
        for (let i = this.meltZones.length - 1; i >= 0; i--) {
            const z = this.meltZones[i];
            z.radius += 3;
            z.life = 1 - z.radius / z.maxRadius;
            if (z.life <= 0) {
                this.meltZones.splice(i, 1);
            }
        }
        // Cap melt zones
        while (this.meltZones.length > 10) this.meltZones.shift();

        // Update glitch bands
        for (const band of this.glitchBands) {
            band.phase += band.frequency;
            band.offset = Math.sin(band.phase + tick * 0.02) * band.maxOffset;
            band.y += band.speed;
            if (band.y < 0) band.y += system.height;
            if (band.y > system.height) band.y -= system.height;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const width = system.width;
        const height = system.height;

        ctx.save();

        // Draw sorted color columns/rows
        const stripWidth = 4;

        for (let c = 0; c < this.columns.length; c++) {
            const col = this.columns[c];

            for (const seg of col.segments) {
                const sortShift = seg.sortOffset;

                // Check if in a melt zone
                let meltFactor = 0;
                for (const zone of this.meltZones) {
                    let dist;
                    if (this.sortDirection === 1) {
                        dist = Math.abs(c * stripWidth - zone.y);
                    } else {
                        dist = Math.abs(c * stripWidth - zone.x);
                    }
                    if (dist < zone.radius) {
                        meltFactor = Math.max(meltFactor, zone.life * (1 - dist / zone.radius));
                    }
                }

                const alpha = seg.alpha * (1 + meltFactor * 2);
                ctx.fillStyle = `hsla(${seg.hue}, ${seg.saturation}%, ${seg.lightness + meltFactor * 30}%, ${Math.min(0.6, alpha)})`;

                if (this.sortDirection === 0) {
                    // Vertical strips
                    ctx.fillRect(c * stripWidth, seg.start + sortShift, stripWidth, seg.length);
                } else if (this.sortDirection === 1) {
                    // Horizontal strips
                    ctx.fillRect(seg.start + sortShift, c * stripWidth, seg.length, stripWidth);
                } else {
                    // Diagonal strips
                    ctx.save();
                    ctx.translate(width / 2, height / 2);
                    ctx.rotate(Math.PI / 4);
                    ctx.fillRect(c * stripWidth - width, seg.start + sortShift - height, stripWidth, seg.length);
                    ctx.restore();
                }
            }
        }

        // Draw glitch displacement bands
        ctx.globalCompositeOperation = 'lighter';
        for (const band of this.glitchBands) {
            const bAlpha = 0.05 + Math.abs(Math.sin(band.phase)) * 0.1;
            ctx.fillStyle = `hsla(${this.baseHue + band.offset * 3}, 80%, 50%, ${bAlpha})`;

            if (this.sortDirection === 1) {
                ctx.fillRect(band.y, 0, band.height, height);
            } else {
                ctx.fillRect(0 + band.offset, band.y, width, band.height);
            }

            // RGB channel shift on glitch bands
            if (Math.abs(band.offset) > 10) {
                ctx.fillStyle = `rgba(255, 0, 0, ${bAlpha * 0.5})`;
                ctx.fillRect(band.offset + 3, band.y, width, band.height / 3);
                ctx.fillStyle = `rgba(0, 255, 0, ${bAlpha * 0.5})`;
                ctx.fillRect(band.offset, band.y + band.height / 3, width, band.height / 3);
                ctx.fillStyle = `rgba(0, 0, 255, ${bAlpha * 0.5})`;
                ctx.fillRect(band.offset - 3, band.y + band.height * 2 / 3, width, band.height / 3);
            }
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw thin scanlines for texture
        for (const sl of this.scanlines) {
            ctx.fillStyle = `hsla(${sl.hue}, 60%, 50%, ${sl.alpha})`;
            if (this.sortDirection === 1) {
                ctx.fillRect(sl.pos, 0, sl.thickness, height);
            } else {
                ctx.fillRect(0, sl.pos, width, sl.thickness);
            }
        }

        // Mouse sort indicator
        if (system.speedMultiplier > 2) {
            const mx = mouse.x;
            const my = mouse.y;
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 80);
            grad.addColorStop(0, `hsla(${this.baseHue}, 80%, 70%, 0.15)`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(mx, my, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }
}
