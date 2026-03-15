/**
 * @file synthwave_architecture.js
 * @description Retrowave/outrun aesthetic with perspective grid, neon sun, horizon glow,
 * and animated mountain/city silhouettes. Seed controls color scheme, grid speed,
 * sun style, silhouette type, and star density. Mouse tilts the perspective.
 *
 * Enhanced features: shooting stars, animated city windows, mouse neon trail on grid,
 * pulsing horizon line, grid reflections, gravity well warp, speed boost motion blur,
 * and shockwave grid ripples.
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

        // Shooting stars
        this.shootingStars = [];
        this.shootingStarFrequency = 0;
        this.shootingStarTimer = 0;

        // Animated city windows
        this.windowFlickerTimer = 0;

        // Mouse neon trail
        this.mouseTrail = [];
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Pulsing horizon
        this.horizonPulsePhase = 0;
        this.horizonPulseSpeed = 0;

        // Shockwave ripples on grid
        this.gridRipples = [];
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

        // Shooting star config (seed-controlled frequency)
        this.shootingStarFrequency = 80 + Math.floor(rng() * 200);
        this.shootingStarTimer = Math.floor(rng() * this.shootingStarFrequency);
        this.shootingStars = [];

        // Pulsing horizon config
        this.horizonPulsePhase = rng() * Math.PI * 2;
        this.horizonPulseSpeed = 0.015 + rng() * 0.025;

        // Window animation: give each building window its own flicker phase
        if (this.hasCity) {
            for (const b of this.buildings) {
                if (!b.windowPhases) {
                    b.windowPhases = [];
                    for (let row = 0; row < b.windowRows; row++) {
                        const rowPhases = [];
                        for (let col = 0; col < b.windowCols; col++) {
                            rowPhases.push({
                                on: rng() > 0.35,
                                nextToggle: 60 + Math.floor(rng() * 300),
                                timer: 0
                            });
                        }
                        b.windowPhases.push(rowPhases);
                    }
                }
            }
        }

        // Mouse trail
        this.mouseTrail = [];
        this.lastMouseX = w / 2;
        this.lastMouseY = h / 2;
    }

    _getColorSchemes() {
        return [
            { // Classic purple/pink
                skyTop: '#0a001a', skyBottom: '#1a0033',
                gridColor: 'rgba(255, 0, 200, ALPHA)',
                sunColors: ['#ff006e', '#ff4da6', '#ff99cc'],
                horizonGlow: '#ff006e',
                accent: '#ff006e',
                groundTint: [40, 0, 60],
                accentRGB: [255, 0, 110]
            },
            { // Cyan/teal
                skyTop: '#000a1a', skyBottom: '#001a33',
                gridColor: 'rgba(0, 255, 255, ALPHA)',
                sunColors: ['#00ffff', '#00cccc', '#008888'],
                horizonGlow: '#00ffff',
                accent: '#00ffff',
                groundTint: [0, 30, 50],
                accentRGB: [0, 255, 255]
            },
            { // Hot sunset
                skyTop: '#0a0005', skyBottom: '#330011',
                gridColor: 'rgba(255, 100, 0, ALPHA)',
                sunColors: ['#ff6600', '#ff3300', '#ff9900'],
                horizonGlow: '#ff4400',
                accent: '#ff6600',
                groundTint: [50, 15, 0],
                accentRGB: [255, 100, 0]
            },
            { // Vapor purple/blue
                skyTop: '#05001a', skyBottom: '#200040',
                gridColor: 'rgba(150, 50, 255, ALPHA)',
                sunColors: ['#aa33ff', '#7700cc', '#cc66ff'],
                horizonGlow: '#9933ff',
                accent: '#aa33ff',
                groundTint: [30, 10, 60],
                accentRGB: [150, 50, 255]
            },
            { // Green matrix
                skyTop: '#000a00', skyBottom: '#002200',
                gridColor: 'rgba(0, 255, 100, ALPHA)',
                sunColors: ['#00ff66', '#00cc44', '#00ff99'],
                horizonGlow: '#00ff44',
                accent: '#00ff66',
                groundTint: [0, 40, 10],
                accentRGB: [0, 255, 100]
            },
            { // Gold/amber
                skyTop: '#0a0500', skyBottom: '#1a1000',
                gridColor: 'rgba(255, 200, 50, ALPHA)',
                sunColors: ['#ffcc00', '#ff9900', '#ffee66'],
                horizonGlow: '#ffaa00',
                accent: '#ffcc00',
                groundTint: [40, 30, 0],
                accentRGB: [255, 200, 50]
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
                        lit: rng() > 0.3,
                        windowPhases: null
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
        this.horizonPulsePhase += this.horizonPulseSpeed;

        // --- Shooting stars ---
        this.shootingStarTimer++;
        if (this.shootingStarTimer >= this.shootingStarFrequency) {
            this.shootingStarTimer = 0;
            const w = system.width;
            const startX = system.rng() * w;
            const startY = system.rng() * this.horizonY * 0.5;
            const angle = Math.PI * 0.1 + system.rng() * Math.PI * 0.3;
            const speed = 8 + system.rng() * 12;
            this.shootingStars.push({
                x: startX,
                y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.015 + system.rng() * 0.02,
                length: 40 + system.rng() * 60
            });
        }

        // Update active shooting stars
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];
            ss.x += ss.vx * system.speedMultiplier;
            ss.y += ss.vy * system.speedMultiplier;
            ss.life -= ss.decay * system.speedMultiplier;
            if (ss.life <= 0 || ss.x > system.width + 100 || ss.y > this.horizonY) {
                this.shootingStars.splice(i, 1);
            }
        }

        // --- Animated city windows ---
        if (this.hasCity) {
            for (const b of this.buildings) {
                if (!b.windowPhases) continue;
                for (let row = 0; row < b.windowPhases.length; row++) {
                    for (let col = 0; col < b.windowPhases[row].length; col++) {
                        const wp = b.windowPhases[row][col];
                        wp.timer++;
                        if (wp.timer >= wp.nextToggle) {
                            wp.on = !wp.on;
                            wp.timer = 0;
                            wp.nextToggle = 60 + Math.floor(system.rng() * 300);
                        }
                    }
                }
            }
        }

        // --- Mouse neon trail ---
        const dx = mouse.x - this.lastMouseX;
        const dy = mouse.y - this.lastMouseY;
        const mouseMoved = dx * dx + dy * dy > 4;
        if (mouseMoved && mouse.y > this.horizonY) {
            this.mouseTrail.push({
                x: mouse.x,
                y: mouse.y,
                life: 1.0
            });
            if (this.mouseTrail.length > 60) {
                this.mouseTrail.shift();
            }
        }
        this.lastMouseX = mouse.x;
        this.lastMouseY = mouse.y;

        // Fade trail points
        for (let i = this.mouseTrail.length - 1; i >= 0; i--) {
            this.mouseTrail[i].life -= 0.02;
            if (this.mouseTrail[i].life <= 0) {
                this.mouseTrail.splice(i, 1);
            }
        }

        // --- Shockwave ripples on grid ---
        if (system.shockwaves) {
            for (const sw of system.shockwaves) {
                // Only add a ripple entry once per shockwave when it's new (small radius)
                if (sw.radius < sw.speed * 2) {
                    this.gridRipples.push({
                        x: sw.x,
                        y: sw.y,
                        radius: 0,
                        maxRadius: sw.maxRadius || 400,
                        speed: sw.speed || 10,
                        strength: sw.strength || 1,
                        life: 1.0
                    });
                }
            }
        }

        // Update grid ripples
        for (let i = this.gridRipples.length - 1; i >= 0; i--) {
            const r = this.gridRipples[i];
            r.radius += r.speed * system.speedMultiplier;
            r.life -= 0.01 * system.speedMultiplier;
            if (r.life <= 0 || r.radius > r.maxRadius) {
                this.gridRipples.splice(i, 1);
            }
        }
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

        // === SHOOTING STARS ===
        this._drawShootingStars(ctx, scheme);

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

        // === PULSING HORIZON GLOW LINE ===
        this._drawPulsingHorizon(ctx, w, scheme);

        // === GROUND ===
        const gt = scheme.groundTint;
        ctx.fillStyle = `rgb(${gt[0]}, ${gt[1]}, ${gt[2]})`;
        ctx.fillRect(0, this.horizonY, w, h - this.horizonY);

        // === GRID REFLECTIONS (sun + silhouette) ===
        this._drawGridReflections(ctx, w, h, sunX, sunY, scheme, tick);

        // === PERSPECTIVE GRID ===
        this._drawGrid(ctx, w, h, scheme, tiltX, tick, system);

        // === MOUSE NEON TRAIL ON GRID ===
        this._drawMouseTrail(ctx, scheme);

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

    _drawShootingStars(ctx, scheme) {
        if (this.shootingStars.length === 0) return;
        const rgb = scheme.accentRGB;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        for (const ss of this.shootingStars) {
            const tailX = ss.x - (ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * ss.life;
            const tailY = ss.y - (ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * ss.life;

            // Trail gradient
            const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
            grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
            grad.addColorStop(0.6, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${ss.life * 0.4})`);
            grad.addColorStop(1, `rgba(255, 255, 255, ${ss.life * 0.9})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(ss.x, ss.y);
            ctx.stroke();

            // Bright head glow
            const headGlow = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 6);
            headGlow.addColorStop(0, `rgba(255, 255, 255, ${ss.life * 0.8})`);
            headGlow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
            ctx.fillStyle = headGlow;
            ctx.beginPath();
            ctx.arc(ss.x, ss.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawPulsingHorizon(ctx, w, scheme) {
        const rgb = scheme.accentRGB;
        // Multi-frequency pulsing for organic feel
        const pulse1 = Math.sin(this.horizonPulsePhase) * 0.3 + 0.5;
        const pulse2 = Math.sin(this.horizonPulsePhase * 1.7 + 1.3) * 0.2 + 0.3;
        const intensity = pulse1 + pulse2;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Broad glow
        const horizGlow = ctx.createLinearGradient(0, this.horizonY - 40, 0, this.horizonY + 40);
        horizGlow.addColorStop(0, 'transparent');
        horizGlow.addColorStop(0.4, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.15 * intensity})`);
        horizGlow.addColorStop(0.5, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.35 * intensity})`);
        horizGlow.addColorStop(0.6, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.15 * intensity})`);
        horizGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = horizGlow;
        ctx.fillRect(0, this.horizonY - 40, w, 80);

        // Sharp bright core line
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.5 * intensity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.horizonY);
        ctx.lineTo(w, this.horizonY);
        ctx.stroke();

        ctx.restore();
    }

    _drawGridReflections(ctx, w, h, sunX, sunY, scheme, tick) {
        const horizonY = this.horizonY;
        const groundH = h - horizonY;
        if (groundH <= 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Sun reflection: a vertical gradient stripe below the horizon, mirrored from sun position
        const reflSunX = sunX;
        const reflWidth = this.sunRadius * 1.5;
        const reflGrad = ctx.createLinearGradient(0, horizonY, 0, h);
        const rgb = scheme.accentRGB;
        reflGrad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.12)`);
        reflGrad.addColorStop(0.3, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`);
        reflGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = reflGrad;
        ctx.beginPath();
        ctx.moveTo(reflSunX - reflWidth, horizonY);
        ctx.lineTo(reflSunX + reflWidth, horizonY);
        ctx.lineTo(reflSunX + reflWidth * 2, h);
        ctx.lineTo(reflSunX - reflWidth * 2, h);
        ctx.closePath();
        ctx.fill();

        // Silhouette shadow reflection: a faint dark band near the horizon
        // This gives the impression of the silhouette reflecting on the grid
        const silReflGrad = ctx.createLinearGradient(0, horizonY, 0, horizonY + groundH * 0.15);
        silReflGrad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
        silReflGrad.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = silReflGrad;
        ctx.fillRect(0, horizonY, w, groundH * 0.15);

        ctx.restore();
    }

    _drawGrid(ctx, w, h, scheme, tiltX, tick, system) {
        const horizonY = this.horizonY;
        const groundH = h - horizonY;
        const vanishX = w / 2 + tiltX * 3;
        const gridColor = scheme.gridColor;
        const perspective = this.gridPerspective;

        // Gravity well warp parameters
        const isGravity = system.isGravityWell;
        const gravX = mouse.x;
        const gravY = mouse.y;
        const gravRadius = 200;

        // Speed boost: at high speedMultiplier, lines get thicker and streaky
        const speedFactor = Math.min(1, Math.max(0, (system.speedMultiplier - 3) / 10));
        const baseLineWidth = 1 + speedFactor * 2;

        ctx.save();

        // Vertical lines (converge to vanishing point)
        const lineCount = 20;
        for (let i = -lineCount; i <= lineCount; i++) {
            const bottomX = vanishX + i * (w / lineCount) * 1.5;
            const alpha = Math.max(0.05, 0.3 - Math.abs(i) * 0.015);
            ctx.strokeStyle = gridColor.replace('ALPHA', String(alpha));
            ctx.lineWidth = baseLineWidth;
            ctx.beginPath();

            // Draw line with optional gravity warp
            const steps = isGravity ? 20 : 1;
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                let lx = vanishX + (bottomX - vanishX) * t;
                let ly = horizonY + (h - horizonY) * t;

                // Gravity well warp: pull grid points toward mouse
                if (isGravity && ly > horizonY) {
                    const gdx = lx - gravX;
                    const gdy = ly - gravY;
                    const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
                    if (gDist < gravRadius && gDist > 1) {
                        const warpStrength = (1 - gDist / gravRadius) * 40;
                        lx -= (gdx / gDist) * warpStrength;
                        ly -= (gdy / gDist) * warpStrength;
                    }
                }

                // Shockwave ripple displacement
                for (const rip of this.gridRipples) {
                    const rdx = lx - rip.x;
                    const rdy = ly - rip.y;
                    const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
                    if (Math.abs(rDist - rip.radius) < 40 && rDist > 1) {
                        const rippleAmt = Math.cos((rDist - rip.radius) / 40 * Math.PI) * rip.strength * rip.life * 8;
                        ly += rippleAmt;
                    }
                }

                if (s === 0) ctx.moveTo(lx, ly);
                else ctx.lineTo(lx, ly);
            }
            ctx.stroke();

            // Speed boost motion blur: draw a faded duplicate offset vertically
            if (speedFactor > 0.1) {
                ctx.globalAlpha = speedFactor * 0.3;
                ctx.strokeStyle = gridColor.replace('ALPHA', String(alpha * 0.4));
                ctx.lineWidth = baseLineWidth + speedFactor * 3;
                ctx.beginPath();
                ctx.moveTo(vanishX, horizonY);
                ctx.lineTo(bottomX, h);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        // Horizontal lines (spaced by perspective)
        const maxLines = 30;
        const gridMod = this.gridOffset % 50;
        for (let i = 0; i < maxLines; i++) {
            const t = (i * 50 + gridMod) / (groundH * 2);
            let y = horizonY + Math.pow(t, perspective) * groundH * 2;
            if (y > h || y < horizonY) continue;

            const progress = (y - horizonY) / groundH;
            const alpha = 0.05 + progress * 0.25;
            ctx.strokeStyle = gridColor.replace('ALPHA', String(alpha));
            ctx.lineWidth = baseLineWidth + progress;

            if (isGravity || this.gridRipples.length > 0) {
                // Draw with warp/ripple as segmented line
                ctx.beginPath();
                const segCount = 40;
                for (let s = 0; s <= segCount; s++) {
                    let lx = (s / segCount) * w;
                    let ly = y;

                    // Gravity warp
                    if (isGravity) {
                        const gdx = lx - gravX;
                        const gdy = ly - gravY;
                        const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
                        if (gDist < gravRadius && gDist > 1) {
                            const warpStrength = (1 - gDist / gravRadius) * 40;
                            lx -= (gdx / gDist) * warpStrength;
                            ly -= (gdy / gDist) * warpStrength;
                        }
                    }

                    // Shockwave ripple
                    for (const rip of this.gridRipples) {
                        const rdx = lx - rip.x;
                        const rdy = ly - rip.y;
                        const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
                        if (Math.abs(rDist - rip.radius) < 40 && rDist > 1) {
                            const rippleAmt = Math.cos((rDist - rip.radius) / 40 * Math.PI) * rip.strength * rip.life * 8;
                            ly += rippleAmt;
                        }
                    }

                    if (s === 0) ctx.moveTo(lx, ly);
                    else ctx.lineTo(lx, ly);
                }
                ctx.stroke();
            } else {
                // Fast path: simple horizontal line
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // Speed boost streak on horizontal lines
            if (speedFactor > 0.1) {
                ctx.globalAlpha = speedFactor * 0.2;
                ctx.strokeStyle = gridColor.replace('ALPHA', String(alpha * 0.3));
                ctx.lineWidth = baseLineWidth + progress + speedFactor * 4;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();
    }

    _drawMouseTrail(ctx, scheme) {
        if (this.mouseTrail.length < 2) return;
        const rgb = scheme.accentRGB;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < this.mouseTrail.length; i++) {
            const p0 = this.mouseTrail[i - 1];
            const p1 = this.mouseTrail[i];
            const alpha = p1.life * 0.5;

            // Neon glow line
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha * 0.3})`;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();

            // Bright core
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        }

        // Glow spot at the most recent point
        if (this.mouseTrail.length > 0) {
            const last = this.mouseTrail[this.mouseTrail.length - 1];
            const glowGrad = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 15);
            glowGrad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${last.life * 0.4})`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(last.x, last.y, 15, 0, Math.PI * 2);
            ctx.fill();
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

                    // Windows - animated flicker
                    if (b.lit && b.windowPhases) {
                        const winW = Math.max(2, (b.w - 4) / b.windowCols - 2);
                        const winH = 4;
                        for (let row = 0; row < b.windowRows && row < b.windowPhases.length; row++) {
                            for (let col = 0; col < b.windowCols && col < b.windowPhases[row].length; col++) {
                                const wp = b.windowPhases[row][col];
                                if (wp.on) {
                                    const wx = b.x + 3 + col * (winW + 2);
                                    const wy = hY - b.h + 6 + row * 12;
                                    // Slight brightness variation
                                    const flicker = 0.3 + Math.sin(tick * 0.1 + row * 3 + col * 7) * 0.1;
                                    const r = scheme.accentRGB[0];
                                    const g = scheme.accentRGB[1];
                                    const bv = scheme.accentRGB[2];
                                    ctx.fillStyle = `rgba(${r}, ${g}, ${bv}, ${flicker})`;
                                    ctx.fillRect(wx, wy, winW, winH);
                                }
                            }
                        }
                    } else if (b.lit) {
                        // Fallback for buildings without windowPhases
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
