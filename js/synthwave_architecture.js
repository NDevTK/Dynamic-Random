/**
 * @file synthwave_architecture.js
 * @description Retrowave/outrun aesthetic with perspective grid, neon sun, horizon glow,
 * and animated mountain/city silhouettes. Seed controls color scheme, grid speed,
 * sun style, silhouette type, and star density. Mouse tilts the perspective.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class SynthwaveArchitecture extends Architecture {
    constructor() {
        super();
        this.gridOffset = 0;
        this.sunY = 0;
        this.sunRadius = 0;
        this.colorScheme = 0;
        this.silhouetteType = 0;
        this.silhouettePoints = [];
        this.stars = [];
        this.gridSpeed = 0;
        this.sunBands = [];
        this.neonAccent = '';
        this.horizonY = 0;
        this.gridPerspective = 0;
        this.hasCity = false;
        this.buildings = [];
        this.scanlineAlpha = 0;
        this.glowPulse = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        // Horizon line placement
        this.horizonY = h * (0.45 + rng() * 0.15);
        this.gridSpeed = 1 + rng() * 3;
        this.gridPerspective = 0.6 + rng() * 0.4;
        this.scanlineAlpha = rng() > 0.5 ? 0.03 + rng() * 0.04 : 0;

        // Color scheme (6 dramatically different themes)
        this.colorScheme = Math.floor(rng() * 6);
        const schemes = this._getColorSchemes();
        const scheme = schemes[this.colorScheme];

        this.neonAccent = scheme.accent;

        // Sun configuration
        this.sunRadius = 60 + rng() * 80;
        this.sunY = this.horizonY - this.sunRadius * (0.3 + rng() * 0.7);
        this.sunBands = [];
        const bandCount = 4 + Math.floor(rng() * 6);
        for (let i = 0; i < bandCount; i++) {
            this.sunBands.push({
                y: this.sunRadius * (0.2 + (i / bandCount) * 0.8),
                height: 2 + rng() * 6,
                speed: 0.5 + rng() * 1.5
            });
        }

        // Silhouette type
        this.silhouetteType = Math.floor(rng() * 4);
        // 0 = mountains, 1 = city skyline, 2 = palm trees, 3 = crystal spires
        this.hasCity = this.silhouetteType === 1;
        this._generateSilhouette(system, rng);

        // Stars in the upper sky
        this.stars = [];
        const starCount = 100 + Math.floor(rng() * 200);
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: rng() * w,
                y: rng() * this.horizonY * 0.9,
                size: rng() * 1.5 + 0.3,
                alpha: rng() * 0.6 + 0.2,
                twinkle: rng() * Math.PI * 2,
                twinkleSpeed: 0.02 + rng() * 0.05
            });
        }
    }

    _getColorSchemes() {
        return [
            { // Classic purple/pink
                skyTop: '#0a001a', skyBottom: '#1a0033',
                gridColor: 'rgba(255, 0, 200, ALPHA)',
                sunColors: ['#ff006e', '#ff4da6', '#ff99cc'],
                horizonGlow: '#ff006e',
                accent: '#ff006e',
                groundTint: [40, 0, 60]
            },
            { // Cyan/teal
                skyTop: '#000a1a', skyBottom: '#001a33',
                gridColor: 'rgba(0, 255, 255, ALPHA)',
                sunColors: ['#00ffff', '#00cccc', '#008888'],
                horizonGlow: '#00ffff',
                accent: '#00ffff',
                groundTint: [0, 30, 50]
            },
            { // Hot sunset
                skyTop: '#0a0005', skyBottom: '#330011',
                gridColor: 'rgba(255, 100, 0, ALPHA)',
                sunColors: ['#ff6600', '#ff3300', '#ff9900'],
                horizonGlow: '#ff4400',
                accent: '#ff6600',
                groundTint: [50, 15, 0]
            },
            { // Vapor purple/blue
                skyTop: '#05001a', skyBottom: '#200040',
                gridColor: 'rgba(150, 50, 255, ALPHA)',
                sunColors: ['#aa33ff', '#7700cc', '#cc66ff'],
                horizonGlow: '#9933ff',
                accent: '#aa33ff',
                groundTint: [30, 10, 60]
            },
            { // Green matrix
                skyTop: '#000a00', skyBottom: '#002200',
                gridColor: 'rgba(0, 255, 100, ALPHA)',
                sunColors: ['#00ff66', '#00cc44', '#00ff99'],
                horizonGlow: '#00ff44',
                accent: '#00ff66',
                groundTint: [0, 40, 10]
            },
            { // Gold/amber
                skyTop: '#0a0500', skyBottom: '#1a1000',
                gridColor: 'rgba(255, 200, 50, ALPHA)',
                sunColors: ['#ffcc00', '#ff9900', '#ffee66'],
                horizonGlow: '#ffaa00',
                accent: '#ffcc00',
                groundTint: [40, 30, 0]
            }
        ];
    }

    _generateSilhouette(system, rng) {
        const w = system.width;

        switch (this.silhouetteType) {
            case 0: // Mountains
                this.silhouettePoints = [];
                let mx = 0;
                while (mx < w + 50) {
                    const peakHeight = 30 + rng() * 120;
                    const peakWidth = 60 + rng() * 150;
                    this.silhouettePoints.push({ x: mx, h: peakHeight });
                    mx += peakWidth;
                }
                break;

            case 1: // City skyline
                this.buildings = [];
                let bx = 0;
                while (bx < w) {
                    const bw = 15 + rng() * 50;
                    const bh = 20 + rng() * 150;
                    const hasAntenna = rng() > 0.7;
                    this.buildings.push({
                        x: bx, w: bw, h: bh,
                        antenna: hasAntenna ? bh + 10 + rng() * 30 : 0,
                        windowRows: Math.floor(bh / 12),
                        windowCols: Math.max(1, Math.floor(bw / 10)),
                        lit: rng() > 0.3
                    });
                    bx += bw + rng() * 5;
                }
                break;

            case 2: // Palm trees
                this.silhouettePoints = [];
                for (let i = 0; i < 8 + Math.floor(rng() * 6); i++) {
                    this.silhouettePoints.push({
                        x: rng() * w,
                        trunkHeight: 60 + rng() * 100,
                        lean: (rng() - 0.5) * 0.4,
                        frondCount: 5 + Math.floor(rng() * 4),
                        frondLength: 30 + rng() * 40
                    });
                }
                break;

            case 3: // Crystal spires
                this.silhouettePoints = [];
                for (let i = 0; i < 12 + Math.floor(rng() * 10); i++) {
                    this.silhouettePoints.push({
                        x: rng() * w,
                        height: 40 + rng() * 160,
                        width: 5 + rng() * 20,
                        angle: (rng() - 0.5) * 0.3
                    });
                }
                break;
        }
    }

    update(system) {
        this.gridOffset += this.gridSpeed * system.speedMultiplier * 0.5;
        this.glowPulse += 0.03;
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width;
        const h = system.height;
        const tick = system.tick;
        const scheme = this._getColorSchemes()[this.colorScheme];

        // Mouse tilt effect
        const mx = mouse.x / w - 0.5;
        const my = mouse.y / h - 0.5;
        const tiltX = mx * 20;
        const tiltY = my * 10;

        // === SKY ===
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
        skyGrad.addColorStop(0, scheme.skyTop);
        skyGrad.addColorStop(1, scheme.skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, this.horizonY + 1);

        // Stars
        ctx.save();
        this.stars.forEach(s => {
            const twinkle = Math.sin(tick * s.twinkleSpeed + s.twinkle) * 0.3 + 0.7;
            ctx.globalAlpha = s.alpha * twinkle;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x + tiltX * 0.5, s.y + tiltY * 0.3, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        // === SUN ===
        const sunX = w / 2 + tiltX * 2;
        const sunY = this.sunY + tiltY;
        const pulse = Math.sin(this.glowPulse) * 0.1 + 1;

        // Sun glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, this.sunRadius * 3 * pulse);
        sunGlow.addColorStop(0, scheme.horizonGlow + '40');
        sunGlow.addColorStop(0.5, scheme.horizonGlow + '15');
        sunGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, this.sunRadius * 3 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Sun body
        const sunBodyGrad = ctx.createLinearGradient(sunX, sunY - this.sunRadius, sunX, sunY + this.sunRadius);
        for (let i = 0; i < scheme.sunColors.length; i++) {
            sunBodyGrad.addColorStop(i / (scheme.sunColors.length - 1), scheme.sunColors[i]);
        }
        ctx.fillStyle = sunBodyGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, this.sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // Sun horizontal bands (classic retro effect)
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        for (const band of this.sunBands) {
            const bandY = sunY + band.y + Math.sin(tick * 0.01 * band.speed) * 3;
            const bandH = band.height * (1 + Math.sin(tick * 0.005) * 0.2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(sunX - this.sunRadius - 5, bandY, this.sunRadius * 2 + 10, bandH);
        }
        ctx.restore();

        // Horizon glow line
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const horizGlow = ctx.createLinearGradient(0, this.horizonY - 30, 0, this.horizonY + 30);
        horizGlow.addColorStop(0, 'transparent');
        horizGlow.addColorStop(0.5, scheme.horizonGlow + '60');
        horizGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = horizGlow;
        ctx.fillRect(0, this.horizonY - 30, w, 60);
        ctx.restore();

        // === GROUND ===
        const gt = scheme.groundTint;
        ctx.fillStyle = `rgb(${gt[0]}, ${gt[1]}, ${gt[2]})`;
        ctx.fillRect(0, this.horizonY, w, h - this.horizonY);

        // === PERSPECTIVE GRID ===
        this._drawGrid(ctx, w, h, scheme, tiltX, tick);

        // === SILHOUETTE ===
        this._drawSilhouette(ctx, system, scheme, tick);

        // === SCANLINES ===
        if (this.scanlineAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.scanlineAlpha})`;
            for (let y = 0; y < h; y += 3) {
                ctx.fillRect(0, y, w, 1);
            }
        }
    }

    _drawGrid(ctx, w, h, scheme, tiltX, tick) {
        const horizonY = this.horizonY;
        const groundH = h - horizonY;
        const vanishX = w / 2 + tiltX * 3;
        const gridColor = scheme.gridColor;
        const perspective = this.gridPerspective;

        ctx.save();

        // Vertical lines (converge to vanishing point)
        const lineCount = 20;
        for (let i = -lineCount; i <= lineCount; i++) {
            const bottomX = vanishX + i * (w / lineCount) * 1.5;
            const alpha = Math.max(0.05, 0.3 - Math.abs(i) * 0.015);
            ctx.strokeStyle = gridColor.replace('ALPHA', String(alpha));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(vanishX, horizonY);
            ctx.lineTo(bottomX, h);
            ctx.stroke();
        }

        // Horizontal lines (spaced by perspective)
        const maxLines = 30;
        const gridMod = this.gridOffset % 50;
        for (let i = 0; i < maxLines; i++) {
            const t = (i * 50 + gridMod) / (groundH * 2);
            const y = horizonY + Math.pow(t, perspective) * groundH * 2;
            if (y > h || y < horizonY) continue;

            const progress = (y - horizonY) / groundH;
            const alpha = 0.05 + progress * 0.25;
            ctx.strokeStyle = gridColor.replace('ALPHA', String(alpha));
            ctx.lineWidth = 1 + progress;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawSilhouette(ctx, system, scheme, tick) {
        const w = system.width;
        const hY = this.horizonY;

        ctx.save();
        ctx.fillStyle = '#000';

        switch (this.silhouetteType) {
            case 0: // Mountains
            {
                ctx.beginPath();
                ctx.moveTo(0, hY);
                for (const peak of this.silhouettePoints) {
                    ctx.lineTo(peak.x, hY - peak.h);
                }
                ctx.lineTo(w, hY);
                ctx.closePath();
                ctx.fill();

                // Mountain edge glow
                ctx.strokeStyle = scheme.accent + '60';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, hY);
                for (const peak of this.silhouettePoints) {
                    ctx.lineTo(peak.x, hY - peak.h);
                }
                ctx.lineTo(w, hY);
                ctx.stroke();
                break;
            }

            case 1: // City
            {
                for (const b of this.buildings) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(b.x, hY - b.h, b.w, b.h);

                    // Antenna
                    if (b.antenna > 0) {
                        ctx.fillRect(b.x + b.w / 2 - 1, hY - b.antenna, 2, b.antenna - b.h);
                        // Blinking light
                        if (Math.sin(tick * 0.05 + b.x) > 0) {
                            ctx.fillStyle = '#ff0000';
                            ctx.beginPath();
                            ctx.arc(b.x + b.w / 2, hY - b.antenna, 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }

                    // Windows
                    if (b.lit) {
                        const winW = Math.max(2, (b.w - 4) / b.windowCols - 2);
                        const winH = 4;
                        for (let row = 0; row < b.windowRows; row++) {
                            for (let col = 0; col < b.windowCols; col++) {
                                if (Math.sin(b.x * 13 + row * 7 + col * 3) > -0.3) {
                                    const wx = b.x + 3 + col * (winW + 2);
                                    const wy = hY - b.h + 6 + row * 12;
                                    ctx.fillStyle = scheme.accent + '40';
                                    ctx.fillRect(wx, wy, winW, winH);
                                }
                            }
                        }
                    }
                }

                // Skyline edge glow
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (const b of this.buildings) {
                    ctx.strokeStyle = scheme.accent + '30';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(b.x, hY - b.h, b.w, b.h);
                }
                ctx.restore();
                break;
            }

            case 2: // Palm trees
            {
                for (const tree of this.silhouettePoints) {
                    ctx.save();
                    ctx.translate(tree.x, hY);

                    // Trunk
                    ctx.fillStyle = '#000';
                    ctx.beginPath();
                    ctx.moveTo(-3, 0);
                    ctx.quadraticCurveTo(
                        -3 + tree.lean * tree.trunkHeight, -tree.trunkHeight * 0.5,
                        tree.lean * tree.trunkHeight * 0.5, -tree.trunkHeight
                    );
                    ctx.quadraticCurveTo(
                        3 + tree.lean * tree.trunkHeight, -tree.trunkHeight * 0.5,
                        3, 0
                    );
                    ctx.fill();

                    // Fronds
                    const topX = tree.lean * tree.trunkHeight * 0.5;
                    const topY = -tree.trunkHeight;
                    for (let f = 0; f < tree.frondCount; f++) {
                        const angle = (f / tree.frondCount) * Math.PI * 2 + Math.sin(tick * 0.01 + tree.x) * 0.1;
                        const droop = 0.5 + Math.abs(Math.cos(angle)) * 0.5;
                        ctx.beginPath();
                        ctx.moveTo(topX, topY);
                        ctx.quadraticCurveTo(
                            topX + Math.cos(angle) * tree.frondLength * 0.6,
                            topY + Math.sin(angle) * tree.frondLength * 0.3 - 10,
                            topX + Math.cos(angle) * tree.frondLength,
                            topY + droop * tree.frondLength * 0.4
                        );
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = '#000';
                        ctx.stroke();
                    }
                    ctx.restore();
                }
                break;
            }

            case 3: // Crystal spires
            {
                for (const spire of this.silhouettePoints) {
                    ctx.save();
                    ctx.translate(spire.x, hY);
                    ctx.rotate(spire.angle);

                    ctx.fillStyle = '#000';
                    ctx.beginPath();
                    ctx.moveTo(-spire.width / 2, 0);
                    ctx.lineTo(0, -spire.height);
                    ctx.lineTo(spire.width / 2, 0);
                    ctx.closePath();
                    ctx.fill();

                    // Crystal glow edge
                    ctx.strokeStyle = scheme.accent + '50';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-spire.width / 2, 0);
                    ctx.lineTo(0, -spire.height);
                    ctx.lineTo(spire.width / 2, 0);
                    ctx.stroke();

                    // Tip glow
                    const tipGlow = ctx.createRadialGradient(0, -spire.height, 0, 0, -spire.height, 15);
                    tipGlow.addColorStop(0, scheme.accent + '40');
                    tipGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = tipGlow;
                    ctx.beginPath();
                    ctx.arc(0, -spire.height, 15, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }
                break;
            }
        }

        ctx.restore();
    }
}
