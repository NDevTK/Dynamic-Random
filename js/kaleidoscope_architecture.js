/**
 * @file kaleidoscope_architecture.js
 * @description Symmetric rotating kaleidoscope patterns. Draws shapes in sectors
 * and mirrors them. Mouse position deforms the pattern. Seeds change symmetry count,
 * shapes, colors, rotation speed, and pattern complexity.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';
import { roseCurve, lissajousCurve, superformula, seededPalette } from './math_patterns.js';

export class KaleidoscopeArchitecture extends Architecture {
    constructor() {
        super();
        this.symmetry = 6;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.elements = [];
        this.trailCanvas = null;
        this.trailCtx = null;
        this.patternType = 0;
        this.colorScheme = [];
        this.zoomPulse = 0;
        this.innerRotation = 0;
        this.morphProgress = 0;
        this.morphTarget = 0;
        this.morphActive = false;
        this.radialBands = [];
        this.trailFade = 0.05;
        this.drawStyle = 0;
        this.pulseRings = [];
        this.breatheSpeed = 0;
        this.breatheAmount = 0;
        this.hasWebPattern = false;
        this.webDensity = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven symmetry (dramatically changes the look)
        this.symmetry = [3, 4, 5, 6, 8, 10, 12][Math.floor(rng() * 7)];
        this.rotationSpeed = (rng() - 0.5) * 0.005;
        this.innerRotation = 0;

        // Pattern type (expanded range for more seed variety)
        this.patternType = Math.floor(rng() * 8);
        // 0 = geometric shapes, 1 = orbital dots, 2 = spirograph curves
        // 3 = crystalline shards, 4 = organic tendrils, 5 = mathematical
        // 6 = fractal snowflake, 7 = interference rings

        // Drawing style: how shapes are rendered
        this.drawStyle = Math.floor(rng() * 4); // 0=fill+stroke, 1=outline only, 2=glow, 3=dotted

        // Trail persistence: how fast the trail fades (more variety)
        this.trailFade = 0.02 + rng() * 0.08;

        // Breathing: entire pattern expands/contracts
        this.breatheSpeed = 0.002 + rng() * 0.006;
        this.breatheAmount = 0.02 + rng() * 0.08;

        // Web pattern: radial connecting lines between elements
        this.hasWebPattern = rng() > 0.5;
        this.webDensity = 0.3 + rng() * 0.7;

        // Radial bands: concentric colored rings that pulse
        this.radialBands = [];
        if (rng() > 0.4) {
            const bandCount = 2 + Math.floor(rng() * 5);
            for (let i = 0; i < bandCount; i++) {
                this.radialBands.push({
                    radius: 60 + i * (Math.min(system.width, system.height) * 0.35 / bandCount),
                    width: 1 + rng() * 3,
                    hueOffset: rng() * 60,
                    pulsePhase: rng() * Math.PI * 2,
                    pulseSpeed: 0.005 + rng() * 0.015,
                    dashLength: rng() > 0.5 ? 5 + rng() * 20 : 0,
                });
            }
        }

        // Pulse rings from clicks
        this.pulseRings = [];
        this.morphProgress = 0;
        this.morphActive = false;

        // Color scheme
        const baseHue = system.hue;
        const schemeType = Math.floor(rng() * 4);
        switch (schemeType) {
            case 0: // Analogous
                this.colorScheme = [baseHue, (baseHue + 30) % 360, (baseHue + 60) % 360];
                break;
            case 1: // Complementary
                this.colorScheme = [baseHue, (baseHue + 180) % 360, (baseHue + 90) % 360];
                break;
            case 2: // Triadic
                this.colorScheme = [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
                break;
            case 3: // Monochrome shifting
                this.colorScheme = [baseHue, baseHue, baseHue];
                break;
        }

        // Generate elements that will be mirrored
        this.elements = [];
        if (this.patternType === 5) {
            // Mathematical: rose curve points mapped to a single sector
            const sectorRadius = Math.min(system.width, system.height) * 0.4;
            const rose = roseCurve(200, rng);
            rose.points.forEach(point => {
                this.elements.push({
                    x: point.x * sectorRadius,
                    y: point.y * sectorRadius,
                    size: 2 + Math.abs(point.r) * 6,
                    type: 'dot',
                    colorIdx: Math.floor(rng() * this.colorScheme.length),
                    pulsePhase: rng() * Math.PI * 2,
                    pulseSpeed: 0.01 + rng() * 0.02
                });
            });
        } else {
            const elementCount = 8 + Math.floor(rng() * 12);
            for (let i = 0; i < elementCount; i++) {
                this.elements.push({
                    distFromCenter: 50 + rng() * (Math.min(system.width, system.height) * 0.4),
                    angle: rng() * (Math.PI * 2 / this.symmetry), // Only in one sector
                    size: 5 + rng() * 30,
                    speed: 0.001 + rng() * 0.005,
                    radialSpeed: (rng() - 0.5) * 0.3,
                    phase: rng() * Math.PI * 2,
                    colorIdx: Math.floor(rng() * this.colorScheme.length),
                    shapeType: Math.floor(rng() * 4), // 0=circle, 1=square, 2=triangle, 3=line
                    pulsePhase: rng() * Math.PI * 2,
                    pulseSpeed: 0.01 + rng() * 0.03,
                    trailLength: Math.floor(rng() * 5),
                    orbitAmplitude: rng() * 40,
                    orbitFreq: 0.005 + rng() * 0.02
                });
            }
        }

        // Trail canvas for persistence effect
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = system.width;
        this.trailCanvas.height = system.height;
        this.trailCtx = this.trailCanvas.getContext('2d', { alpha: true });
    }

    update(system) {
        this.rotation += this.rotationSpeed * system.speedMultiplier;
        this.innerRotation += 0.002 * system.speedMultiplier;
        this.zoomPulse = Math.sin(system.tick * this.breatheSpeed) * this.breatheAmount;

        // Mouse distance from center affects rotation speed
        const cx = system.width / 2;
        const cy = system.height / 2;
        const mdx = mouse.x - cx;
        const mdy = mouse.y - cy;
        const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);
        const mouseInfluence = Math.min(1, mouseDist / 400);
        this.rotation += mouseInfluence * 0.001 * system.speedMultiplier;

        // Update element positions
        this.elements.forEach(e => {
            e.angle += e.speed * system.speedMultiplier;
            e.distFromCenter += Math.sin(system.tick * e.orbitFreq + e.phase) * e.radialSpeed;

            // Bound distance
            const maxDist = Math.min(system.width, system.height) * 0.45;
            if (e.distFromCenter < 30) e.distFromCenter = 30;
            if (e.distFromCenter > maxDist) e.distFromCenter = maxDist;
        });

        // Update pulse rings from clicks
        for (let i = this.pulseRings.length - 1; i >= 0; i--) {
            this.pulseRings[i].radius += 2;
            this.pulseRings[i].alpha *= 0.97;
            if (this.pulseRings[i].alpha < 0.01) {
                this.pulseRings.splice(i, 1);
            }
        }

        // Morphing: gradually shift pattern type on click
        if (this.morphActive) {
            this.morphProgress += 0.02;
            if (this.morphProgress >= 1) {
                this.morphActive = false;
                this.morphProgress = 0;
            }
        }

        // Detect clicks via shockwaves
        if (system.shockwaves) {
            for (const sw of system.shockwaves) {
                if (sw.radius < 15 && this.pulseRings.length < 8) {
                    this.pulseRings.push({
                        radius: 10,
                        alpha: 0.5,
                        hue: this.colorScheme[Math.floor(Math.random() * this.colorScheme.length)],
                    });
                }
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const centerX = system.width / 2;
        const centerY = system.height / 2;
        const tick = system.tick;

        // Mouse offset for deformation
        const mOffsetX = (mouse.x - centerX) * 0.05;
        const mOffsetY = (mouse.y - centerY) * 0.05;

        // Fade trail canvas (seed-driven fade speed)
        this.trailCtx.fillStyle = `rgba(0, 0, 0, ${this.trailFade})`;
        this.trailCtx.fillRect(0, 0, system.width, system.height);

        // Draw to trail canvas
        const tctx = this.trailCtx;
        tctx.save();
        tctx.translate(centerX + mOffsetX, centerY + mOffsetY);
        tctx.rotate(this.rotation);
        tctx.scale(1 + this.zoomPulse, 1 + this.zoomPulse);

        // Draw each sector with mirroring
        for (let sector = 0; sector < this.symmetry; sector++) {
            const sectorAngle = (sector / this.symmetry) * Math.PI * 2;
            tctx.save();
            tctx.rotate(sectorAngle);

            // Draw mirror
            for (let mirror = 0; mirror < 2; mirror++) {
                tctx.save();
                if (mirror === 1) {
                    tctx.scale(1, -1);
                }

                if (this.patternType === 5) {
                    // Mathematical rose curve: draw dots and connecting lines
                    const hue = this.colorScheme[0];
                    const lightness = 50 + Math.sin(tick * 0.01) * 15;
                    tctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, 0.18)`;
                    tctx.lineWidth = 1;
                    tctx.beginPath();
                    this.elements.forEach((e, i) => {
                        if (i === 0) tctx.moveTo(e.x, e.y);
                        else tctx.lineTo(e.x, e.y);
                    });
                    tctx.stroke();

                    this.elements.forEach(e => {
                        const pulse = 1 + Math.sin(tick * e.pulseSpeed + e.pulsePhase) * 0.3;
                        const size = e.size * pulse;
                        const hue = this.colorScheme[e.colorIdx];
                        const lightness = 50 + Math.sin(tick * 0.01 + e.pulsePhase) * 15;
                        tctx.fillStyle = `hsla(${hue}, 80%, ${lightness}%, 0.25)`;
                        tctx.beginPath();
                        tctx.arc(e.x, e.y, size, 0, Math.PI * 2);
                        tctx.fill();
                    });
                } else {
                    this.elements.forEach(e => {
                        const pulse = 1 + Math.sin(tick * e.pulseSpeed + e.pulsePhase) * 0.3;
                        const x = Math.cos(e.angle + this.innerRotation) * e.distFromCenter;
                        const y = Math.sin(e.angle + this.innerRotation) * e.distFromCenter;
                        const size = e.size * pulse;
                        const hue = this.colorScheme[e.colorIdx];
                        const lightness = 40 + Math.sin(tick * 0.01 + e.phase) * 15;

                        tctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, 0.15)`;
                        tctx.strokeStyle = `hsla(${hue}, 80%, ${lightness + 20}%, 0.2)`;
                        tctx.lineWidth = 1;

                        switch (e.shapeType) {
                            case 0: // Circle
                                tctx.beginPath();
                                tctx.arc(x, y, size, 0, Math.PI * 2);
                                tctx.fill();
                                break;
                            case 1: // Square
                                tctx.save();
                                tctx.translate(x, y);
                                tctx.rotate(tick * 0.005 + e.phase);
                                tctx.fillRect(-size / 2, -size / 2, size, size);
                                tctx.restore();
                                break;
                            case 2: // Triangle
                                tctx.beginPath();
                                for (let v = 0; v < 3; v++) {
                                    const va = (v / 3) * Math.PI * 2 + tick * 0.005;
                                    const vx = x + Math.cos(va) * size;
                                    const vy = y + Math.sin(va) * size;
                                    if (v === 0) tctx.moveTo(vx, vy);
                                    else tctx.lineTo(vx, vy);
                                }
                                tctx.closePath();
                                tctx.fill();
                                tctx.stroke();
                                break;
                            case 3: // Line from center
                                tctx.beginPath();
                                tctx.moveTo(0, 0);
                                tctx.lineTo(x, y);
                                tctx.stroke();
                                break;
                        }
                    });
                }

                tctx.restore();
            }

            tctx.restore();
        }

        // Draw pattern-specific overlays
        if (this.patternType === 2) {
            // Spirograph curves
            tctx.strokeStyle = `hsla(${this.colorScheme[0]}, 80%, 60%, 0.05)`;
            tctx.lineWidth = 1;
            tctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.02) {
                const r1 = 100 + Math.sin(a * this.symmetry + tick * 0.01) * 50;
                const r2 = 50 + Math.cos(a * (this.symmetry + 1) + tick * 0.008) * 30;
                const x = Math.cos(a) * r1 + Math.cos(a * 3 + tick * 0.005) * r2;
                const y = Math.sin(a) * r1 + Math.sin(a * 3 + tick * 0.005) * r2;
                if (a === 0) tctx.moveTo(x, y);
                else tctx.lineTo(x, y);
            }
            tctx.closePath();
            tctx.stroke();
        } else if (this.patternType === 6) {
            // Fractal snowflake: recursive hexagonal lines
            tctx.strokeStyle = `hsla(${this.colorScheme[0]}, 70%, 70%, 0.06)`;
            tctx.lineWidth = 0.8;
            const armLen = 80 + Math.sin(tick * 0.005) * 20;
            for (let arm = 0; arm < this.symmetry; arm++) {
                const baseA = (arm / this.symmetry) * Math.PI * 2;
                tctx.beginPath();
                tctx.moveTo(0, 0);
                const x1 = Math.cos(baseA) * armLen;
                const y1 = Math.sin(baseA) * armLen;
                tctx.lineTo(x1, y1);
                // Sub-branches
                for (let sub = 0; sub < 3; sub++) {
                    const t = 0.3 + sub * 0.25;
                    const bx = Math.cos(baseA) * armLen * t;
                    const by = Math.sin(baseA) * armLen * t;
                    const subLen = armLen * (0.4 - sub * 0.1);
                    for (let side = -1; side <= 1; side += 2) {
                        const subA = baseA + side * Math.PI / 3;
                        tctx.moveTo(bx, by);
                        tctx.lineTo(bx + Math.cos(subA) * subLen, by + Math.sin(subA) * subLen);
                    }
                }
                tctx.stroke();
            }
        } else if (this.patternType === 7) {
            // Interference rings: concentric circles that pulse
            tctx.strokeStyle = `hsla(${this.colorScheme[1] || this.colorScheme[0]}, 60%, 60%, 0.04)`;
            tctx.lineWidth = 1;
            for (let r = 20; r < Math.min(system.width, system.height) * 0.4; r += 15) {
                const wobble = Math.sin(r * 0.05 + tick * 0.008) * 5;
                tctx.beginPath();
                tctx.arc(0, 0, r + wobble, 0, Math.PI * 2);
                tctx.stroke();
            }
        }

        // Web pattern: connect elements with radial lines
        if (this.hasWebPattern && this.patternType < 5) {
            tctx.strokeStyle = `hsla(${this.colorScheme[0]}, 40%, 50%, ${0.03 * this.webDensity})`;
            tctx.lineWidth = 0.5;
            tctx.beginPath();
            for (let i = 0; i < this.elements.length; i++) {
                const e = this.elements[i];
                const ex = Math.cos(e.angle + this.innerRotation) * e.distFromCenter;
                const ey = Math.sin(e.angle + this.innerRotation) * e.distFromCenter;
                tctx.moveTo(0, 0);
                tctx.lineTo(ex, ey);
                // Connect to next element
                if (i < this.elements.length - 1) {
                    const e2 = this.elements[i + 1];
                    const ex2 = Math.cos(e2.angle + this.innerRotation) * e2.distFromCenter;
                    const ey2 = Math.sin(e2.angle + this.innerRotation) * e2.distFromCenter;
                    tctx.moveTo(ex, ey);
                    tctx.lineTo(ex2, ey2);
                }
            }
            tctx.stroke();
        }

        tctx.restore();

        // Composite trail canvas onto main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(this.trailCanvas, 0, 0);
        ctx.restore();

        // Center glow
        const glowRadius = 80 + Math.sin(tick * 0.02) * 20;
        const grad = ctx.createRadialGradient(
            centerX + mOffsetX, centerY + mOffsetY, 0,
            centerX + mOffsetX, centerY + mOffsetY, glowRadius
        );
        grad.addColorStop(0, `hsla(${this.colorScheme[0]}, 80%, 70%, 0.15)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX + mOffsetX, centerY + mOffsetY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring decorations
        const ringRadius = Math.min(system.width, system.height) * 0.42;
        ctx.save();
        ctx.translate(centerX + mOffsetX, centerY + mOffsetY);
        ctx.rotate(this.rotation * -0.5);
        ctx.strokeStyle = `hsla(${this.colorScheme[1]}, 60%, 50%, 0.08)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Tick marks at symmetry points
        for (let i = 0; i < this.symmetry; i++) {
            const angle = (i / this.symmetry) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * (ringRadius - 10), Math.sin(angle) * (ringRadius - 10));
            ctx.lineTo(Math.cos(angle) * (ringRadius + 10), Math.sin(angle) * (ringRadius + 10));
            ctx.stroke();
        }
        ctx.restore();

        // Radial bands: seed-driven concentric rings that pulse
        if (this.radialBands.length > 0) {
            ctx.save();
            ctx.translate(centerX + mOffsetX, centerY + mOffsetY);
            ctx.rotate(this.rotation * 0.3);
            for (const band of this.radialBands) {
                const pulse = Math.sin(tick * band.pulseSpeed + band.pulsePhase) * 0.3 + 0.7;
                const r = band.radius * pulse;
                const hue = (this.colorScheme[0] + band.hueOffset) % 360;
                ctx.strokeStyle = `hsla(${hue}, 60%, 55%, 0.1)`;
                ctx.lineWidth = band.width;
                if (band.dashLength > 0) {
                    ctx.setLineDash([band.dashLength, band.dashLength * 0.8]);
                }
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }

        // Pulse rings from clicks
        if (this.pulseRings.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const pr of this.pulseRings) {
                ctx.strokeStyle = `hsla(${pr.hue}, 80%, 70%, ${pr.alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(centerX + mOffsetX, centerY + mOffsetY, pr.radius, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
}
