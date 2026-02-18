/**
 * @file voronoi_architecture.js
 * @description Dynamic Voronoi diagram background that shifts and morphs continuously.
 * Seeds produce unique movement patterns, cell counts, and color schemes.
 * Cells shatter and reform around mouse, with distance-field based coloring.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class VoronoiArchitecture extends Architecture {
    constructor() {
        super();
        this.sites = [];
        this.colorMode = 0;
        this.hueBase = 0;
        this.edgeGlow = false;
        this.cellFill = true;
        this.motionStyle = 0;
        this.offscreen = null;
        this.offCtx = null;
        this.imageData = null;
        this.pixelScale = 3;
        this.cols = 0;
        this.rows = 0;
    }

    init(system) {
        const rng = system.rng;
        this.pixelScale = 3;
        this.cols = Math.ceil(system.width / this.pixelScale);
        this.rows = Math.ceil(system.height / this.pixelScale);

        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.cols;
        this.offscreen.height = this.rows;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(this.cols, this.rows);

        // Seed-driven site count and motion
        const siteCount = 12 + Math.floor(rng() * 25);
        this.hueBase = system.hue || rng() * 360;
        this.colorMode = Math.floor(rng() * 6);
        this.edgeGlow = rng() > 0.5;
        this.cellFill = rng() > 0.3;
        this.motionStyle = Math.floor(rng() * 5);

        this.sites = [];
        for (let i = 0; i < siteCount; i++) {
            this.sites.push({
                x: rng() * this.cols,
                y: rng() * this.rows,
                vx: (rng() - 0.5) * 0.8,
                vy: (rng() - 0.5) * 0.8,
                hue: (this.hueBase + rng() * 120) % 360,
                phase: rng() * Math.PI * 2,
                orbitR: 20 + rng() * 80,
                orbitSpeed: 0.002 + rng() * 0.008,
                baseX: rng() * this.cols,
                baseY: rng() * this.rows,
                mass: 0.5 + rng() * 1.5
            });
        }
    }

    update(system) {
        const tick = system.tick;
        const mx = mouse.x / this.pixelScale;
        const my = mouse.y / this.pixelScale;
        const isGravity = system.isGravityWell;

        for (const site of this.sites) {
            switch (this.motionStyle) {
                case 0: // Orbital
                    site.x = site.baseX + Math.cos(tick * site.orbitSpeed + site.phase) * site.orbitR;
                    site.y = site.baseY + Math.sin(tick * site.orbitSpeed * 1.3 + site.phase) * site.orbitR * 0.7;
                    break;
                case 1: // Brownian drift
                    site.vx += (system.rng() - 0.5) * 0.1;
                    site.vy += (system.rng() - 0.5) * 0.1;
                    site.vx *= 0.98;
                    site.vy *= 0.98;
                    site.x += site.vx;
                    site.y += site.vy;
                    break;
                case 2: // Lissajous
                    site.x = site.baseX + Math.sin(tick * site.orbitSpeed * 2 + site.phase) * site.orbitR;
                    site.y = site.baseY + Math.sin(tick * site.orbitSpeed * 3 + site.phase * 1.5) * site.orbitR * 0.6;
                    break;
                case 3: // Mouse-responsive: sites flee from cursor
                    site.x += site.vx;
                    site.y += site.vy;
                    site.vx *= 0.99;
                    site.vy *= 0.99;
                    break;
                case 4: // Breathing
                    const breathe = 1 + 0.3 * Math.sin(tick * 0.01 + site.phase);
                    site.x = this.cols / 2 + (site.baseX - this.cols / 2) * breathe;
                    site.y = this.rows / 2 + (site.baseY - this.rows / 2) * breathe;
                    break;
            }

            // Mouse repulsion/attraction
            const dx = site.x - mx;
            const dy = site.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80 && dist > 0) {
                const force = (80 - dist) / 80 * (isGravity ? -0.8 : 0.4);
                site.x += (dx / dist) * force;
                site.y += (dy / dist) * force;
            }

            // Wrap
            if (site.x < -20) site.x += this.cols + 40;
            if (site.x > this.cols + 20) site.x -= this.cols + 40;
            if (site.y < -20) site.y += this.rows + 40;
            if (site.y > this.rows + 20) site.y -= this.rows + 40;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const data = this.imageData.data;
        const cols = this.cols;
        const rows = this.rows;
        const sites = this.sites;
        const tick = system.tick;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const pi = (y * cols + x) * 4;
                let minDist = Infinity;
                let secondDist = Infinity;
                let closestIdx = 0;

                // Find two closest sites
                for (let i = 0; i < sites.length; i++) {
                    const dx = x - sites[i].x;
                    const dy = y - sites[i].y;
                    const d = dx * dx + dy * dy;
                    if (d < minDist) {
                        secondDist = minDist;
                        minDist = d;
                        closestIdx = i;
                    } else if (d < secondDist) {
                        secondDist = d;
                    }
                }

                minDist = Math.sqrt(minDist);
                secondDist = Math.sqrt(secondDist);
                const edgeDist = secondDist - minDist;
                const site = sites[closestIdx];

                let r, g, b;

                if (this.edgeGlow && edgeDist < 3) {
                    // Edge highlight
                    const edgeAlpha = 1 - edgeDist / 3;
                    const hue = (this.hueBase + tick * 0.5) % 360;
                    const rgb = this._hslToRgb(hue, 80, 70 + edgeAlpha * 30);
                    r = rgb[0] * edgeAlpha;
                    g = rgb[1] * edgeAlpha;
                    b = rgb[2] * edgeAlpha;
                } else if (this.cellFill) {
                    switch (this.colorMode) {
                        case 0: { // Distance gradient
                            const v = Math.min(1, minDist / 60);
                            const rgb = this._hslToRgb(site.hue, 70, 10 + v * 30);
                            r = rgb[0]; g = rgb[1]; b = rgb[2];
                            break;
                        }
                        case 1: { // Neon edges only
                            const edge = Math.max(0, 1 - edgeDist / 8);
                            const rgb = this._hslToRgb((site.hue + tick * 0.3) % 360, 100, edge * 60);
                            r = rgb[0]; g = rgb[1]; b = rgb[2];
                            break;
                        }
                        case 2: { // Stained glass
                            const cellV = 0.4 + 0.6 * Math.min(1, minDist / 40);
                            const edgeV = edgeDist < 2 ? 0 : cellV;
                            const rgb = this._hslToRgb(site.hue, 60, edgeV * 25);
                            r = rgb[0]; g = rgb[1]; b = rgb[2];
                            break;
                        }
                        case 3: { // Heat map
                            const heat = Math.min(1, minDist / 50);
                            r = heat * 200 + (1 - heat) * 30;
                            g = (1 - Math.abs(heat - 0.5) * 2) * 120;
                            b = (1 - heat) * 180;
                            break;
                        }
                        case 4: { // Topographic
                            const contour = Math.sin(minDist * 0.3) * 0.5 + 0.5;
                            const rgb = this._hslToRgb(site.hue, 50, contour * 30 + 5);
                            r = rgb[0]; g = rgb[1]; b = rgb[2];
                            break;
                        }
                        case 5: { // Crystal facets with specular
                            const angle = Math.atan2(y - site.y, x - site.x);
                            const facet = (Math.sin(angle * 3 + site.phase) * 0.5 + 0.5);
                            const rgb = this._hslToRgb(site.hue, 50 + facet * 30, 8 + facet * 25);
                            r = rgb[0]; g = rgb[1]; b = rgb[2];
                            break;
                        }
                        default:
                            r = g = b = 0;
                    }
                } else {
                    r = g = b = 0;
                }

                data[pi] = Math.min(255, r);
                data[pi + 1] = Math.min(255, g);
                data[pi + 2] = Math.min(255, b);
                data[pi + 3] = 255;
            }
        }

        this.offCtx.putImageData(this.imageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.offscreen, 0, 0, system.width, system.height);
    }

    _hslToRgb(h, s, l) {
        h = h % 360;
        s /= 100;
        l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }
}
