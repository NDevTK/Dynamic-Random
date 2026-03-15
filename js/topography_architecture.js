/**
 * @file topography_architecture.js
 * @description Animated topographic contour map with elevation that responds to mouse.
 * Mouse acts as a mountain peak that raises terrain, gravity well creates a valley.
 * Seed determines terrain shape, color scheme, and contour density.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class TopographyArchitecture extends Architecture {
    constructor() {
        super();
        this.heightMap = null;
        this.gridW = 0;
        this.gridH = 0;
        this.cellSize = 8;
        this.peaks = [];
        this.colorMode = 0;
        this.contourInterval = 0.08;
        this.flowParticles = [];
        this.flowPool = [];
        this.mouseInfluence = 0;
        this.animPhase = 0;
    }

    init(system) {
        const rng = system.rng;

        this.cellSize = 8;
        this.gridW = Math.ceil(system.width / this.cellSize) + 1;
        this.gridH = Math.ceil(system.height / this.cellSize) + 1;
        this.heightMap = new Float32Array(this.gridW * this.gridH);

        // Color modes for the topo map
        this.colorMode = Math.floor(rng() * 6);
        // 0=earth tones, 1=ocean depth, 2=heat map, 3=forest, 4=alien, 5=minimal

        this.contourInterval = 0.06 + rng() * 0.06;

        // Generate terrain peaks and valleys
        this.peaks = [];
        const peakCount = 4 + Math.floor(rng() * 6);
        for (let i = 0; i < peakCount; i++) {
            this.peaks.push({
                x: rng() * this.gridW,
                y: rng() * this.gridH,
                height: (rng() - 0.3) * 1.5, // Can be negative (valleys)
                spread: 15 + rng() * 40,
                drift: {
                    dx: (rng() - 0.5) * 0.02,
                    dy: (rng() - 0.5) * 0.02
                }
            });
        }

        // Water flow particles that follow terrain gradient
        this.flowParticles = [];
        this.flowPool = [];
        const flowCount = 80 + Math.floor(rng() * 60);
        for (let i = 0; i < flowCount; i++) {
            this.flowParticles.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: 0,
                vy: 0,
                life: 0.5 + rng() * 0.5,
                maxLife: 1,
                trail: []
            });
        }

        this.mouseInfluence = 0;
        this.animPhase = rng() * Math.PI * 2;
        this.staticMap = null; // Cached static peaks (recomputed only when peaks drift)
        this.staticMapTick = -100;

        this._computeStaticMap(system);
        this._computeHeightMap(system);
    }

    _computeStaticMap() {
        const gw = this.gridW;
        const gh = this.gridH;
        if (!this.staticMap || this.staticMap.length !== gw * gh) {
            this.staticMap = new Float32Array(gw * gh);
        }
        this.staticMap.fill(0);

        for (const peak of this.peaks) {
            const spreadSq = peak.spread * peak.spread;
            const range = Math.ceil(peak.spread * 2);
            const startGY = Math.max(0, Math.floor(peak.y - range));
            const endGY = Math.min(gh, Math.ceil(peak.y + range));
            const startGX = Math.max(0, Math.floor(peak.x - range));
            const endGX = Math.min(gw, Math.ceil(peak.x + range));

            for (let gy = startGY; gy < endGY; gy++) {
                for (let gx = startGX; gx < endGX; gx++) {
                    const dx = gx - peak.x;
                    const dy = gy - peak.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < spreadSq * 4) {
                        this.staticMap[gy * gw + gx] += peak.height * Math.exp(-distSq / (2 * spreadSq));
                    }
                }
            }
        }
    }

    _computeHeightMap(system) {
        const gw = this.gridW;
        const gh = this.gridH;
        const map = this.heightMap;

        // Copy static peaks into height map
        map.set(this.staticMap);

        // Add mouse influence (localized)
        const mx = mouse.x / this.cellSize;
        const my = mouse.y / this.cellSize;
        const mouseSpread = 20;
        const mouseSq = mouseSpread * mouseSpread;

        if (Math.abs(this.mouseInfluence) > 0.01) {
            for (let gy = Math.max(0, Math.floor(my - mouseSpread * 2)); gy < Math.min(gh, Math.ceil(my + mouseSpread * 2)); gy++) {
                for (let gx = Math.max(0, Math.floor(mx - mouseSpread * 2)); gx < Math.min(gw, Math.ceil(mx + mouseSpread * 2)); gx++) {
                    const dx = gx - mx;
                    const dy = gy - my;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < mouseSq * 4) {
                        map[gy * gw + gx] += this.mouseInfluence * Math.exp(-distSq / (2 * mouseSq));
                    }
                }
            }
        }

        // Add animated noise
        const phase = this.animPhase;
        for (let gy = 0; gy < gh; gy++) {
            const cosVal = Math.cos(gy * 0.07 + phase * 0.7) * 0.15;
            for (let gx = 0; gx < gw; gx++) {
                map[gy * gw + gx] += Math.sin(gx * 0.05 + phase) * cosVal;
            }
        }
    }

    _getContourColor(height, alpha) {
        const h = (height + 1) * 0.5; // normalize to 0-1
        switch (this.colorMode) {
            case 0: // Earth tones
                if (h < 0.3) return `hsla(200, 40%, ${20 + h * 50}%, ${alpha})`; // low = blue
                if (h < 0.5) return `hsla(120, 30%, ${30 + h * 30}%, ${alpha})`; // mid = green
                if (h < 0.7) return `hsla(40, 50%, ${40 + h * 20}%, ${alpha})`;  // high = brown
                return `hsla(0, 0%, ${60 + h * 30}%, ${alpha})`;                   // peak = white
            case 1: // Ocean depth
                return `hsla(${200 + h * 40}, ${50 + h * 30}%, ${15 + h * 50}%, ${alpha})`;
            case 2: // Heat map
                return `hsla(${(1 - h) * 240}, 80%, ${30 + h * 40}%, ${alpha})`;
            case 3: // Forest
                return `hsla(${100 + h * 40}, ${40 + h * 30}%, ${15 + h * 40}%, ${alpha})`;
            case 4: // Alien
                return `hsla(${280 + h * 80}, 70%, ${20 + h * 50}%, ${alpha})`;
            case 5: // Minimal
                return `hsla(0, 0%, ${h * 80}%, ${alpha * 0.6})`;
            default:
                return `hsla(0, 0%, ${h * 100}%, ${alpha})`;
        }
    }

    update(system) {
        this.animPhase += 0.005 * system.speedMultiplier;

        // Recompute static map every 60 frames (peaks drift slowly)
        this.staticMapTick++;
        if (this.staticMapTick >= 60) {
            this.staticMapTick = 0;
            this._computeStaticMap();
        }

        // Mouse raises terrain, gravity well lowers it
        if (system.isGravityWell) {
            this.mouseInfluence = Math.max(-1.5, this.mouseInfluence - 0.05);
        } else if (system.speedMultiplier > 2) {
            this.mouseInfluence = Math.min(1.5, this.mouseInfluence + 0.03);
        } else {
            this.mouseInfluence *= 0.97;
        }

        // Drift peaks slowly
        for (const peak of this.peaks) {
            peak.x += peak.drift.dx;
            peak.y += peak.drift.dy;
            // Soft boundary bounce
            if (peak.x < 5 || peak.x > this.gridW - 5) peak.drift.dx *= -1;
            if (peak.y < 5 || peak.y > this.gridH - 5) peak.drift.dy *= -1;
        }

        this._computeHeightMap(system);

        // Update flow particles (follow downhill gradient)
        const gw = this.gridW;
        const cs = this.cellSize;
        for (const p of this.flowParticles) {
            const gx = Math.floor(p.x / cs);
            const gy = Math.floor(p.y / cs);

            if (gx > 0 && gx < gw - 1 && gy > 0 && gy < this.gridH - 1) {
                // Gradient (downhill direction)
                const gradX = this.heightMap[gy * gw + gx + 1] - this.heightMap[gy * gw + gx - 1];
                const gradY = this.heightMap[(gy + 1) * gw + gx] - this.heightMap[(gy - 1) * gw + gx];
                // Flow downhill (negative gradient)
                p.vx -= gradX * 0.8;
                p.vy -= gradY * 0.8;
            }

            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift();

            p.x += p.vx * system.speedMultiplier;
            p.y += p.vy * system.speedMultiplier;
            p.vx *= 0.9;
            p.vy *= 0.9;
            p.life -= 0.003;

            // Respawn if dead or off-screen
            if (p.life <= 0 || p.x < 0 || p.x > system.width || p.y < 0 || p.y > system.height) {
                p.x = system.rng() * system.width;
                p.y = system.rng() * system.height;
                p.vx = 0;
                p.vy = 0;
                p.life = 0.5 + system.rng() * 0.5;
                p.trail = [];
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const gw = this.gridW;
        const gh = this.gridH;
        const cs = this.cellSize;
        const map = this.heightMap;
        const interval = this.contourInterval;

        ctx.save();

        // Draw filled elevation bands
        ctx.globalAlpha = 0.15;
        for (let gy = 0; gy < gh - 1; gy++) {
            for (let gx = 0; gx < gw - 1; gx++) {
                const h = map[gy * gw + gx];
                ctx.fillStyle = this._getContourColor(h, 0.15);
                ctx.fillRect(gx * cs, gy * cs, cs, cs);
            }
        }
        ctx.globalAlpha = 1;

        // Draw contour lines using marching squares (simplified)
        ctx.lineWidth = 1;
        const levels = [];
        for (let l = -1; l < 1.5; l += interval) {
            levels.push(l);
        }

        for (const level of levels) {
            const isMajor = Math.abs(level % (interval * 4)) < interval * 0.5;
            const alpha = isMajor ? 0.25 : 0.1;
            ctx.strokeStyle = this._getContourColor(level, alpha);
            ctx.lineWidth = isMajor ? 1.5 : 0.8;
            ctx.beginPath();

            for (let gy = 0; gy < gh - 1; gy++) {
                for (let gx = 0; gx < gw - 1; gx++) {
                    const v00 = map[gy * gw + gx] - level;
                    const v10 = map[gy * gw + gx + 1] - level;
                    const v01 = map[(gy + 1) * gw + gx] - level;
                    const v11 = map[(gy + 1) * gw + gx + 1] - level;

                    // Simple marching squares: find edges where sign changes
                    const x0 = gx * cs;
                    const y0 = gy * cs;

                    // Check each edge
                    const edges = [];
                    if (v00 * v10 < 0) edges.push({ x: x0 + cs * (-v00 / (v10 - v00)), y: y0 });
                    if (v10 * v11 < 0) edges.push({ x: x0 + cs, y: y0 + cs * (-v10 / (v11 - v10)) });
                    if (v01 * v11 < 0) edges.push({ x: x0 + cs * (-v01 / (v11 - v01)), y: y0 + cs });
                    if (v00 * v01 < 0) edges.push({ x: x0, y: y0 + cs * (-v00 / (v01 - v00)) });

                    if (edges.length >= 2) {
                        ctx.moveTo(edges[0].x, edges[0].y);
                        ctx.lineTo(edges[1].x, edges[1].y);
                    }
                }
            }
            ctx.stroke();
        }

        // Draw flow particles
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.flowParticles) {
            if (p.trail.length < 2) continue;
            const gx = Math.floor(p.x / cs);
            const gy = Math.floor(p.y / cs);
            if (gx < 0 || gx >= gw || gy < 0 || gy >= gh) continue;
            const h = map[gy * gw + gx];

            ctx.strokeStyle = this._getContourColor(h, p.life * 0.3);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
                ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        ctx.restore();
    }
}
